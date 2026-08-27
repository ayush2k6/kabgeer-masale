import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

interface EmailPayload {
  orderId: string;
  forceResend?: boolean;
}

// 1. Customer Email HTML Renderer
function renderCustomerEmailHtml(order: any, items: any[]): string {
  const itemsRows = (items || []).map((item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <strong>${item.product_name}</strong>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
        ₹${Number(item.unit_price).toFixed(2)}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">
        ₹${Number(item.total_price || item.unit_price * item.quantity).toFixed(2)}
      </td>
    </tr>
  `).join('');

  const shipping = order.shipping_address || {};

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="font-family: sans-serif; color: #333; background-color: #f7f7f7; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background-color: #0f2818; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">KABGEER MASALE</h1>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #cbd5e1;">Authentic Lucknowi Spices & Blends</p>
        </div>
        
        <div style="padding: 24px;">
          <h2 style="color: #16a34a; margin-top: 0;">Order Confirmed!</h2>
          <p>Dear <strong>${order.customer_name}</strong>,</p>
          <p>Thank you for shopping with Kabgeer Masale! Your payment has been received and your order is currently being processed for dispatch.</p>
          
          <div style="background: #f8fafc; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 6px 0;"><strong>Display Order ID:</strong> ${order.display_order_id}</p>
            <p style="margin: 0 0 6px 0;"><strong>Order Status:</strong> Confirmed</p>
            <p style="margin: 0;"><strong>Payment Status:</strong> Paid (Razorpay)</p>
          </div>

          <h3 style="border-bottom: 2px solid #0f2818; padding-bottom: 6px;">Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f1f5f9; text-align: left;">
                <th style="padding: 8px;">Product</th>
                <th style="padding: 8px; text-align: center;">Qty</th>
                <th style="padding: 8px; text-align: right;">Price</th>
                <th style="padding: 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="text-align: right; margin-bottom: 20px; font-size: 15px;">
            <p style="margin: 4px 0;">Subtotal: <strong>₹${Number(order.subtotal || 0).toFixed(2)}</strong></p>
            <p style="margin: 4px 0;">Discount: <strong>-₹${Number(order.discount || 0).toFixed(2)}</strong></p>
            <p style="margin: 4px 0;">Shipping Fee: <strong>₹${Number(order.shipping_fee || 0).toFixed(2)}</strong></p>
            <p style="margin: 8px 0 0 0; font-size: 18px; color: #0f2818;"><strong>Total Paid: ₹${Number(order.total_amount || 0).toFixed(2)}</strong></p>
          </div>

          <h3 style="border-bottom: 2px solid #0f2818; padding-bottom: 6px;">Shipping Address</h3>
          <p style="margin: 0; line-height: 1.5; color: #475569;">
            ${order.customer_name}<br/>
            ${shipping.address || ''} ${shipping.apartment ? ', ' + shipping.apartment : ''}<br/>
            ${shipping.city || ''}, ${shipping.state || 'Uttar Pradesh'} - ${shipping.pinCode || ''}<br/>
            Phone: ${order.customer_phone || ''}
          </p>

          <div style="margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 13px; color: #94a3b8;">
            <p>If you have any questions, feel free to reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Kabgeer Masale. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 2. Admin Alert Email HTML Renderer
function renderAdminEmailHtml(order: any, items: any[]): string {
  const itemsRows = (items || []).map((item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product_name} (${item.product_id})</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${Number(item.total_price || item.unit_price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const shipping = order.shipping_address || {};

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="font-family: sans-serif; color: #333; background-color: #f7f7f7; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 24px; border: 1px solid #e2e8f0;">
        <div style="background-color: #dc2626; color: white; padding: 12px 16px; border-radius: 6px; font-weight: bold; font-size: 18px; margin-bottom: 20px;">
          🚨 NEW PAID ORDER RECEIVED: #${order.display_order_id}
        </div>

        <h3>Order Details</h3>
        <p><strong>Display Order ID:</strong> ${order.display_order_id}</p>
        <p><strong>Total Amount:</strong> ₹${Number(order.total_amount).toFixed(2)}</p>
        <p><strong>Customer Name:</strong> ${order.customer_name} (${order.customer_type})</p>
        <p><strong>Customer Email:</strong> ${order.customer_email}</p>
        <p><strong>Customer Phone:</strong> ${order.customer_phone}</p>
        <p><strong>Razorpay Order ID:</strong> ${order.razorpay_order_id || 'N/A'}</p>

        <h3 style="margin-top: 20px;">Packing List</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f1f5f9; text-align: left;">
              <th style="padding: 8px;">Product</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <h3>Shipping Address for Courier Dispatch</h3>
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px; font-family: monospace;">
          ${order.customer_name}<br/>
          ${shipping.address || ''} ${shipping.apartment ? ', ' + shipping.apartment : ''}<br/>
          ${shipping.city || ''}, ${shipping.state || 'Uttar Pradesh'} - ${shipping.pinCode || ''}<br/>
          Phone: ${order.customer_phone || ''}
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
    const rawSenderEmail = Deno.env.get('SENDER_EMAIL') || 'onboarding@resend.dev';
    const rawAdminEmail = Deno.env.get('ADMIN_NOTIFICATION_EMAIL') || 'kabgeermasale@gmail.com';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: EmailPayload = await req.json();
    const { orderId, forceResend } = body;

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
        JSON.stringify({ error: 'Order not found for email dispatch.', details: orderErr?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch Order Items from public.order_items
    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    let customerSent = false;
    let adminSent = false;
    let isSimulationMode = false;
    let customerResendResult: any = null;
    let adminResendResult: any = null;

    if (!resendApiKey || resendApiKey.includes('PLACEHOLDER')) {
      isSimulationMode = true;
      console.log(`[Resend Email Simulation Mode]: API Key unconfigured.`);
    }

    const isTestingDomain = rawSenderEmail.includes('onboarding@resend.dev');

    // 3. Customer Email Dispatch (Independent Idempotency Guard)
    if (!order.customer_email_sent_at || forceResend) {
      const customerHtml = renderCustomerEmailHtml(order, items || []);
      const targetCustomerRecipient = isTestingDomain ? 'mailtoayusht@gmail.com' : order.customer_email;
      const formattedFrom = isTestingDomain ? 'Kabgeer Masale <onboarding@resend.dev>' : rawSenderEmail;

      if (!isSimulationMode) {
        try {
          console.log(`Sending Resend Customer Email from '${formattedFrom}' to '${targetCustomerRecipient}'...`);
          const resendResp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: formattedFrom,
              to: [targetCustomerRecipient],
              subject: `Order Confirmed! #${order.display_order_id} — Kabgeer Masale`,
              html: customerHtml
            })
          });

          const respText = await resendResp.text();
          console.log(`Resend Customer Email HTTP ${resendResp.status}:`, respText);
          try { customerResendResult = JSON.parse(respText); } catch (_) { customerResendResult = respText; }

          if (resendResp.ok) {
            customerSent = true;
            await supabase
              .from('orders')
              .update({ customer_email_sent_at: new Date().toISOString() })
              .eq('id', order.id);
          } else {
            console.error('Resend Customer Email Delivery Error:', respText);
          }
        } catch (e: any) {
          console.error('Resend Customer Email Exception:', e);
          customerResendResult = { exception: e?.message };
        }
      } else {
        customerSent = true;
        await supabase
          .from('orders')
          .update({ customer_email_sent_at: new Date().toISOString() })
          .eq('id', order.id);
      }
    } else {
      customerSent = true;
    }

    // 4. Admin Alert Email Dispatch (Independent Idempotency Guard)
    if (!order.admin_email_sent_at || forceResend) {
      const adminHtml = renderAdminEmailHtml(order, items || []);
      const targetAdminRecipient = isTestingDomain ? 'mailtoayusht@gmail.com' : rawAdminEmail;
      const formattedFrom = isTestingDomain ? 'Kabgeer System <onboarding@resend.dev>' : rawSenderEmail;

      if (!isSimulationMode) {
        try {
          console.log(`Sending Resend Admin Email from '${formattedFrom}' to '${targetAdminRecipient}'...`);
          const resendResp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: formattedFrom,
              to: [targetAdminRecipient],
              subject: `🚨 NEW PAID ORDER: #${order.display_order_id} (₹${Number(order.total_amount).toFixed(2)})`,
              html: adminHtml
            })
          });

          const respText = await resendResp.text();
          console.log(`Resend Admin Email HTTP ${resendResp.status}:`, respText);
          try { adminResendResult = JSON.parse(respText); } catch (_) { adminResendResult = respText; }

          if (resendResp.ok) {
            adminSent = true;
            await supabase
              .from('orders')
              .update({ admin_email_sent_at: new Date().toISOString() })
              .eq('id', order.id);
          } else {
            console.error('Resend Admin Email Delivery Error:', respText);
          }
        } catch (e: any) {
          console.error('Resend Admin Email Exception:', e);
          adminResendResult = { exception: e?.message };
        }
      } else {
        adminSent = true;
        await supabase
          .from('orders')
          .update({ admin_email_sent_at: new Date().toISOString() })
          .eq('id', order.id);
      }
    } else {
      adminSent = true;
    }

    return new Response(
      JSON.stringify({
        success: true,
        displayOrderId: order.display_order_id,
        customerEmailSent: customerSent,
        adminEmailSent: adminSent,
        isSimulationMode: isSimulationMode,
        isTestingDomain: isTestingDomain,
        customerResendResult: customerResendResult,
        adminResendResult: adminResendResult
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unhandled send-order-email error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
