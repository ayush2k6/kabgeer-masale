import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

interface SheetsPayload {
  orderId: string;
  forceSync?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const sheetsWebhookUrl = Deno.env.get('GOOGLE_SHEETS_WEBHOOK_URL') || '';
    const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SheetsPayload = await req.json();
    const { orderId, forceSync } = body;

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Missing required orderId parameter.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch Order Record from public.orders
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    let orderQuery = supabase.from('orders').select('*');
    if (isUuid) {
      orderQuery = orderQuery.eq('id', orderId);
    } else {
      orderQuery = orderQuery.eq('display_order_id', orderId);
    }

    const { data: order, error: orderErr } = await orderQuery.maybeSingle();

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found for Google Sheets sync.', details: orderErr?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch Order Items from public.order_items
    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    // 3. Fetch Payment Record from public.payments
    const { data: payment } = await supabase
      .from('payments')
      .select('razorpay_payment_id')
      .eq('order_id', order.id)
      .maybeSingle();

    let isSimulationMode = false;
    let sheetSynced = false;
    let webhookResult: any = null;

    if (!sheetsWebhookUrl || sheetsWebhookUrl.includes('PLACEHOLDER')) {
      isSimulationMode = true;
      console.log(`[Google Sheets Sync Simulation Mode]: Webhook URL unconfigured. Order #${order.display_order_id}`);
    }

    // 4. Idempotency Check: Skip if sheets_synced_at is already set
    if (!order.sheets_synced_at || forceSync) {
      const payloadToSend = {
        spreadsheetId: spreadsheetId || undefined,
        displayOrderId: order.display_order_id,
        orderTimestamp: order.created_at,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        customerType: order.customer_type,
        items: (items || []).map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        })),
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.tax,
        shippingFee: order.shipping_fee,
        totalAmount: order.total_amount,
        paymentStatus: order.payment_status,
        razorpayPaymentId: payment?.razorpay_payment_id || order.razorpay_order_id || 'Paid',
        shippingAddress: order.shipping_address
      };

      if (!isSimulationMode) {
        try {
          console.log(`Dispatching Google Sheets Sync for order #${order.display_order_id}...`);
          const sheetResp = await fetch(sheetsWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadToSend)
          });

          const respText = await sheetResp.text();
          console.log(`Google Sheets Webhook HTTP ${sheetResp.status}:`, respText);
          try { webhookResult = JSON.parse(respText); } catch (_) { webhookResult = respText; }

          if (sheetResp.ok && webhookResult?.status !== 'error') {
            sheetSynced = true;
            await supabase
              .from('orders')
              .update({ sheets_synced_at: new Date().toISOString() })
              .eq('id', order.id);
          } else {
            console.error('Google Sheets Webhook Error:', respText);
          }
        } catch (e: any) {
          console.error('Google Sheets Webhook Exception:', e);
          webhookResult = { exception: e?.message };
        }
      } else {
        sheetSynced = true;
        await supabase
          .from('orders')
          .update({ sheets_synced_at: new Date().toISOString() })
          .eq('id', order.id);
      }
    } else {
      console.log(`Order #${order.display_order_id} already synced to Google Sheets at ${order.sheets_synced_at}`);
      sheetSynced = true;
    }

    return new Response(
      JSON.stringify({
        success: true,
        displayOrderId: order.display_order_id,
        sheetSynced: sheetSynced,
        isSimulationMode: isSimulationMode,
        webhookResult: webhookResult
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unhandled sync-google-sheets error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
