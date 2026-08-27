import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

async function verifyHmacSha256(secret: string, bodyText: string, signature: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(bodyText));
    const computedHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return computedHex.toLowerCase() === signature.toLowerCase();
  } catch (err) {
    console.error('Webhook HMAC verification error:', err);
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
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    const razorpaySignature = req.headers.get('X-Razorpay-Signature') || '';

    // 1. Verify Webhook HMAC Signature if secret is configured
    if (webhookSecret && !webhookSecret.includes('PLACEHOLDER')) {
      const isValid = await verifyHmacSha256(webhookSecret, rawBody, razorpaySignature);
      if (!isValid) {
        console.error('SECURITY WARNING: Invalid Razorpay webhook signature.');
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log(`Received Razorpay Webhook Event: ${event}`);

    if (event === 'order.paid' || event === 'payment.captured' || event === 'payment.authorized') {
      const paymentEntity = payload.payload?.payment?.entity || {};
      const rzpOrderId = paymentEntity.order_id || payload.payload?.order?.entity?.id;
      const rzpPaymentId = paymentEntity.id;
      const amountInRupees = (paymentEntity.amount || 0) / 100;

      if (rzpOrderId) {
        // Query order from database
        const { data: dbOrder } = await supabase
          .from('orders')
          .select('id, display_order_id, payment_status')
          .eq('razorpay_order_id', rzpOrderId)
          .maybeSingle();

        if (dbOrder) {
          if (dbOrder.payment_status !== 'Paid') {
            // Update Order Status
            await supabase
              .from('orders')
              .update({
                order_status: 'Confirmed',
                payment_status: 'Paid',
                updated_at: new Date().toISOString()
              })
              .eq('id', dbOrder.id)
              .eq('payment_status', 'Pending');

            // Insert Payment Record
            if (rzpPaymentId) {
              await supabase.from('payments').insert({
                order_id: dbOrder.id,
                razorpay_payment_id: rzpPaymentId,
                razorpay_order_id: rzpOrderId,
                razorpay_signature: razorpaySignature || 'webhook',
                amount: amountInRupees,
                currency: 'INR',
                status: 'captured'
              });
            }

            // Deduct Inventory
            const { data: items } = await supabase
              .from('order_items')
              .select('product_id, quantity')
              .eq('order_id', dbOrder.id);

            if (items) {
              for (const item of items) {
                if (!item.product_id) continue;
                const { data: inv } = await supabase
                  .from('inventory')
                  .select('stock_quantity')
                  .eq('product_id', item.product_id)
                  .maybeSingle();

                if (inv && inv.stock_quantity >= item.quantity) {
                  await supabase
                    .from('inventory')
                    .update({ stock_quantity: inv.stock_quantity - item.quantity })
                    .eq('product_id', item.product_id);
                }
              }
            }
          }

          // Trigger Transactional Email Dispatch (Non-blocking fail-safe call)
          try {
            await supabase.functions.invoke('send-order-email', {
              body: { orderId: dbOrder.id }
            });
          } catch (emailErr: any) {
            console.warn('Non-blocking webhook send-order-email trigger notice:', emailErr?.message);
          }

          // Trigger Google Sheets Real-Time Order Sync (Non-blocking fail-safe call)
          try {
            await supabase.functions.invoke('sync-google-sheets', {
              body: { orderId: dbOrder.id }
            });
          } catch (sheetErr: any) {
            console.warn('Non-blocking webhook sync-google-sheets trigger notice:', sheetErr?.message);
          }

          // Trigger Trackon Shipment Booking (Non-blocking fail-safe call)
          try {
            await supabase.functions.invoke('create-shipment', {
              body: { orderId: dbOrder.id }
            });
          } catch (shipErr: any) {
            console.warn('Non-blocking webhook create-shipment trigger notice:', shipErr?.message);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ status: 'success', event }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return new Response(
      JSON.stringify({ error: 'Webhook processing error', details: err?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
