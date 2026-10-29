import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, getCorsHeaders } from '../_shared/cors.ts';

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
  const dynamicCorsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: dynamicCorsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    const razorpaySignature = req.headers.get('X-Razorpay-Signature') || '';

    // 1. Verify Webhook HMAC Signature against exact raw request body
    if (webhookSecret && !webhookSecret.includes('PLACEHOLDER')) {
      const isValid = await verifyHmacSha256(webhookSecret, rawBody, razorpaySignature);
      if (!isValid) {
        console.error('SECURITY WARNING: Invalid Razorpay webhook signature.');
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          { status: 401, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (razorpaySignature) {
      if (razorpaySignature.length < 16) {
        return new Response(
          JSON.stringify({ error: 'Malformed webhook signature' }),
          { status: 401, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
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
          .select('id, display_order_id, payment_status, total_amount')
          .eq('razorpay_order_id', rzpOrderId)
          .maybeSingle();

        if (dbOrder) {
          // Idempotency: If order was already marked Paid, exit early without duplicate side effects
          if (dbOrder.payment_status === 'Paid') {
            console.log(`Webhook: Order ${dbOrder.id} is already marked as Paid. Skipping duplicate processing.`);
            return new Response(
              JSON.stringify({ status: 'ignored', message: 'Order already processed and marked as Paid.' }),
              { status: 200, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Single-claim atomic transaction via database RPC
          // Fails closed if the RPC is unavailable — no weaker non-atomic fallback
          const { data: claimResult, error: rpcErr } = await supabase.rpc('claim_and_process_order_payment', {
            p_order_id: dbOrder.id,
            p_razorpay_payment_id: rzpPaymentId || 'webhook_' + Date.now(),
            p_razorpay_order_id: rzpOrderId,
            p_amount: amountInRupees || dbOrder.total_amount,
            p_source: 'razorpay-webhook'
          });

          if (rpcErr || !claimResult) {
            console.error('Webhook CRITICAL: Atomic payment processing RPC failed:', rpcErr?.message);
            return new Response(
              JSON.stringify({
                error: 'Atomic webhook payment processing failed. Database RPC required.',
                code: 'ATOMIC_TRANSACTION_FAILED',
                details: rpcErr?.message || 'Database RPC unavailable'
              }),
              { status: 500, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          if (claimResult.already_processed) {
            console.log(`Webhook: Order ${dbOrder.id} already processed concurrently.`);
            return new Response(
              JSON.stringify({ status: 'ignored', message: 'Order was already processed concurrently.' }),
              { status: 200, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          if (!claimResult.success) {
            console.warn(`Webhook: claim_and_process_order_payment rejected: ${claimResult.error}`);
            return new Response(
              JSON.stringify({ status: 'rejected', error: claimResult.error }),
              { status: 400, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const stockAllocationFailed = !claimResult.stock_allocated;

          // Trigger Downstream Automations ONLY for the single claimed execution
          // 1. Transactional Email Dispatch (Non-blocking fail-safe call)
          try {
            await supabase.functions.invoke('send-order-email', {
              body: { orderId: dbOrder.id }
            });
          } catch (emailErr: any) {
            console.warn('Non-blocking webhook send-order-email trigger notice:', emailErr?.message);
          }

          // 2. Google Sheets Real-Time Order Sync (Non-blocking fail-safe call)
          try {
            await supabase.functions.invoke('sync-google-sheets', {
              body: { orderId: dbOrder.id }
            });
          } catch (sheetErr: any) {
            console.warn('Non-blocking webhook sync-google-sheets trigger notice:', sheetErr?.message);
          }

          // 3. Trackon Shipment Booking (ONLY if stock allocation succeeded)
          if (!stockAllocationFailed) {
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
    }

    return new Response(
      JSON.stringify({ status: 'success', event }),
      { status: 200, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return new Response(
      JSON.stringify({ error: 'Webhook processing error', details: err?.message }),
      { status: 500, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
