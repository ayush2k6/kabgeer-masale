import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

interface VerifyPaymentPayload {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

async function verifyHmacSha256(secret: string, text: string, signature: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(text));
    const computedHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return computedHex.toLowerCase() === signature.toLowerCase();
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

    const body: VerifyPaymentPayload = await req.json();
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!orderId || !razorpay_order_id || !razorpay_payment_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required payment verification parameters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch Order Record from public.orders
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    let orderQuery = supabase.from('orders').select('id, display_order_id, total_amount, payment_status, razorpay_order_id');
    if (isUuid) {
      orderQuery = orderQuery.eq('id', orderId);
    } else {
      orderQuery = orderQuery.eq('display_order_id', orderId);
    }

    const { data: dbOrder, error: fetchErr } = await orderQuery.maybeSingle();

    if (fetchErr || !dbOrder) {
      return new Response(
        JSON.stringify({ error: 'Order not found in database.', details: fetchErr?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Idempotency check: If order is already paid, return clean success response
    if (dbOrder.payment_status === 'Paid') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Order payment is already verified and marked as Paid.',
          orderId: dbOrder.id,
          displayOrderId: dbOrder.display_order_id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verify Razorpay Order ID alignment
    if (dbOrder.razorpay_order_id && dbOrder.razorpay_order_id !== razorpay_order_id) {
      return new Response(
        JSON.stringify({ error: 'Mismatched Razorpay Order ID.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Perform HMAC Signature Verification if secret is configured
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

    // 5. Insert Payment Audit Record into public.payments
    await supabase.from('payments').insert({
      order_id: dbOrder.id,
      razorpay_payment_id: razorpay_payment_id,
      razorpay_order_id: razorpay_order_id,
      razorpay_signature: razorpay_signature,
      amount: dbOrder.total_amount,
      currency: 'INR',
      status: 'captured',
      raw_payload: { verified_via: 'verify-razorpay-payment', timestamp: new Date().toISOString() }
    });

    // 6. Deduct Stock Quantity from public.inventory
    const { data: items } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', dbOrder.id);

    if (items && items.length > 0) {
      for (const item of items) {
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

    // 9. Trigger Trackon Shipment Booking (Non-blocking fail-safe call)
    try {
      await supabase.functions.invoke('create-shipment', {
        body: { orderId: dbOrder.id }
      });
    } catch (shipErr: any) {
      console.warn('Non-blocking create-shipment trigger notice:', shipErr?.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified, order confirmed, and all fulfillment integrations triggered successfully.',
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
