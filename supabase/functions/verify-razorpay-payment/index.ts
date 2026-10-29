import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, getCorsHeaders } from '../_shared/cors.ts';

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
  const dynamicCorsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: dynamicCorsHeaders });
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
        { status: 400, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 404, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Idempotency check: If order is already paid, return clean success response
    if (dbOrder.payment_status === 'Paid') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Order payment is already verified and marked as Paid.',
          orderId: dbOrder.id,
          displayOrderId: dbOrder.display_order_id,
          alreadyProcessed: true
        }),
        { status: 200, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verify Razorpay Order ID alignment
    if (dbOrder.razorpay_order_id && dbOrder.razorpay_order_id !== razorpay_order_id) {
      return new Response(
        JSON.stringify({ error: 'Mismatched Razorpay Order ID.' }),
        { status: 400, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2.1 Duplicate Payment Processing Protection
    // Ensure this payment ID was not already credited to another order
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, order_id')
      .eq('razorpay_payment_id', razorpay_payment_id)
      .maybeSingle();

    if (existingPayment && existingPayment.order_id !== dbOrder.id) {
      console.error(`SECURITY ALERT: Attempted reuse of payment ID ${razorpay_payment_id} for different order ${dbOrder.id}`);
      return new Response(
        JSON.stringify({ error: 'Duplicate payment processing detected. This payment ID has already been applied to another order.' }),
        { status: 400, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 400, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Atomic Payment Claim & State Transition
    // Invokes database-enforced single-claim RPC (claim_and_process_order_payment).
    // Fails closed if the RPC is unavailable or encounters an error — no silent weak fallback.
    const { data: claimResult, error: rpcErr } = await supabase.rpc('claim_and_process_order_payment', {
      p_order_id: dbOrder.id,
      p_razorpay_payment_id: razorpay_payment_id,
      p_razorpay_order_id: razorpay_order_id,
      p_amount: dbOrder.total_amount,
      p_source: 'verify-razorpay-payment'
    });

    if (rpcErr || !claimResult) {
      console.error('CRITICAL: Atomic payment processing RPC claim_and_process_order_payment failed:', rpcErr?.message);
      return new Response(
        JSON.stringify({
          error: 'Atomic payment processing failed. Transaction aborted to protect financial consistency.',
          code: 'ATOMIC_TRANSACTION_FAILED',
          details: rpcErr?.message || 'Database RPC unavailable'
        }),
        { status: 500, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!claimResult.success) {
      return new Response(
        JSON.stringify({
          error: claimResult.error || 'Payment transition rejected',
          code: claimResult.code || 'PAYMENT_REJECTED'
        }),
        { status: 400, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (claimResult.already_processed) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Order payment is already verified and marked as Paid.',
          orderId: claimResult.order_id,
          displayOrderId: claimResult.display_order_id,
          alreadyProcessed: true
        }),
        { status: 200, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stockAllocationFailed = !claimResult.stock_allocated;
    const failedItems = claimResult.failed_items || [];

    // 5. Trigger Downstream Automations (ONLY if transition was claimed by this invocation)
    const taskList = [
      supabase.functions.invoke('send-order-email', { body: { orderId: dbOrder.id } }),
      supabase.functions.invoke('sync-google-sheets', { body: { orderId: dbOrder.id } })
    ];

    // Courier shipment booking is strictly bypassed if stock allocation failed
    if (!stockAllocationFailed) {
      taskList.push(supabase.functions.invoke('create-shipment', { body: { orderId: dbOrder.id } }));
    }

    const backgroundTasks = Promise.allSettled(taskList);

    if (typeof (globalThis as any).EdgeRuntime !== 'undefined' && (globalThis as any).EdgeRuntime?.waitUntil) {
      (globalThis as any).EdgeRuntime.waitUntil(backgroundTasks);
    } else {
      await Promise.race([
        backgroundTasks,
        new Promise((resolve) => setTimeout(resolve, 1500))
      ]);
    }

    return new Response(
      JSON.stringify({
        success: true,
        stockAllocated: !stockAllocationFailed,
        message: stockAllocationFailed
          ? 'Payment captured successfully, but one or more items experienced inventory stockout. Order flagged for fulfillment attention.'
          : 'Payment verified, order confirmed, and fulfillment integrations triggered successfully.',
        orderId: dbOrder.id,
        displayOrderId: dbOrder.display_order_id,
        warning: stockAllocationFailed ? `Stockout on: ${failedItems.join(', ')}` : undefined
      }),
      { status: 200, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unhandled verify-razorpay-payment error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err?.message }),
      { status: 500, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
