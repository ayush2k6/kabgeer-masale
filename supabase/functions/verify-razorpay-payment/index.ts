import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

// Web Crypto API HMAC-SHA256 verification helper
async function verifyHmacSha256(secret: string, body: string, expectedSignature: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(body);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const computedHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return computedHex.toLowerCase() === expectedSignature.toLowerCase();
  } catch (err) {
    console.error('HMAC computation error:', err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required payment verification parameters (razorpay_order_id, razorpay_payment_id).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Query target order from public.orders for Idempotency & Status verification
    const { data: dbOrder, error: orderErr } = await supabase
      .from('orders')
      .select('id, display_order_id, total_amount, order_status, payment_status, customer_id')
      .or(`id.eq.${orderId || '00000000-0000-0000-0000-000000000000'},razorpay_order_id.eq.${razorpay_order_id}`)
      .maybeSingle();

    if (orderErr || !dbOrder) {
      return new Response(
        JSON.stringify({ error: 'Order not found for payment verification.', details: orderErr?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Idempotency Guard: Prevent double-processing already paid orders
    if (dbOrder.payment_status === 'Paid') {
      // Trigger email and Google Sheets dispatch as fail-safe even if idempotent call
      try {
        await supabase.functions.invoke('send-order-email', { body: { orderId: dbOrder.id } });
      } catch (emailErr: any) {
        console.warn('Non-blocking send-order-email trigger notice:', emailErr?.message);
      }
      try {
        await supabase.functions.invoke('sync-google-sheets', { body: { orderId: dbOrder.id } });
      } catch (sheetErr: any) {
        console.warn('Non-blocking sync-google-sheets trigger notice:', sheetErr?.message);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Order is already marked as Paid (Idempotent call).',
          orderId: dbOrder.id,
          displayOrderId: dbOrder.display_order_id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verify Razorpay HMAC Signature (or test simulation mode if key is unconfigured)
    const signPayload = `${razorpay_order_id}|${razorpay_payment_id}`;
    let isSignatureValid = false;

    if (razorpayKeySecret && !razorpayKeySecret.includes('PLACEHOLDER')) {
      isSignatureValid = await verifyHmacSha256(razorpayKeySecret, signPayload, razorpay_signature || '');
    } else {
      isSignatureValid = razorpay_signature ? razorpay_signature.length > 5 : true;
    }

    if (!isSignatureValid) {
      console.error(`SECURITY ALERT: Signature verification failed for order ${dbOrder.id}`);
      await supabase
        .from('orders')
        .update({ payment_status: 'Failed' })
        .eq('id', dbOrder.id);

      return new Response(
        JSON.stringify({ error: 'Payment signature verification failed. Unauthorized request.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Update Order Status to Confirmed & Paid (Atomic check payment_status == 'Pending')
    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        order_status: 'Confirmed',
        payment_status: 'Paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', dbOrder.id)
      .eq('payment_status', 'Pending');

    if (updateErr) {
      console.error('Error updating order payment status:', updateErr.message);
      return new Response(
        JSON.stringify({ error: 'Failed to update order status in database.', details: updateErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Insert Record into public.payments Table (100% aligned with public.payments schema columns)
    const paymentRecord = {
      order_id: dbOrder.id,
      razorpay_order_id: razorpay_order_id,
      razorpay_payment_id: razorpay_payment_id,
      razorpay_signature: razorpay_signature || 'simulated',
      amount: dbOrder.total_amount,
      currency: 'INR',
      status: 'captured'
    };

    const { error: payErr } = await supabase.from('payments').insert(paymentRecord);
    if (payErr) {
      console.warn('Payments record insert notice (may be duplicate webhook):', payErr.message);
    }

    // 6. Deduct Inventory for items in this order
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', dbOrder.id);

    if (orderItems && orderItems.length > 0) {
      for (const item of orderItems) {
        if (!item.product_id) continue;
        const { data: inv } = await supabase
          .from('inventory')
          .select('stock_quantity')
          .eq('product_id', item.product_id)
          .maybeSingle();

        if (inv) {
          const newQty = Math.max(0, inv.stock_quantity - item.quantity);
          await supabase
            .from('inventory')
            .update({ stock_quantity: newQty, updated_at: new Date().toISOString() })
            .eq('product_id', item.product_id);
        }
      }
    }

    // 7. Trigger Transactional Email Dispatch (Non-blocking fail-safe call)
    try {
      await supabase.functions.invoke('send-order-email', {
        body: { orderId: dbOrder.id }
      });
    } catch (emailErr: any) {
      console.warn('Non-blocking send-order-email trigger notice:', emailErr?.message);
    }

    // 8. Trigger Google Sheets Real-Time Order Sync (Non-blocking fail-safe call)
    try {
      await supabase.functions.invoke('sync-google-sheets', {
        body: { orderId: dbOrder.id }
      });
    } catch (sheetErr: any) {
      console.warn('Non-blocking sync-google-sheets trigger notice:', sheetErr?.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified, order confirmed, and integrations triggered successfully.',
        orderId: dbOrder.id,
        displayOrderId: dbOrder.display_order_id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unhandled verify-razorpay-payment error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
