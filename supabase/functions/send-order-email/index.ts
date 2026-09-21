import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

interface EmailPayload {
  orderId: string;
  forceResend?: boolean;
  emailType?: 'confirmation' | 'status_update';
  newStatus?: 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  awbNumber?: string;
  courierName?: string;
  cancellationReason?: string;
}

// Helper to format ISO timestamp to IST
function formatToIST(isoDate?: string): string {
  if (!isoDate) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  try {
    const d = new Date(isoDate);
    return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })} at ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })} IST`;
  } catch (_) {
    return 'Recent';
  }
}

// Helper: Common Items Table Generator
function renderItemsRows(items: any[]): string {
  return (items || []).map((item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle;">
        <strong style="color: #1a2f22; font-size: 14px;">${item.product_name || 'Authentic Masala'}</strong>
        ${item.weight_pack ? `<div style="font-size: 12px; color: #64748b;">Pack: ${item.weight_pack}</div>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #334155; font-size: 14px;">
        ${item.quantity}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #334155; font-size: 14px;">
        ₹${Number(item.unit_price || 0).toFixed(2)}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: #1a2f22; font-size: 14px;">
        ₹${Number(item.total_price || (item.unit_price * item.quantity) || 0).toFixed(2)}
      </td>
    </tr>
  `).join('');
}

// Helper: Common Financial Breakdown Generator
function renderFinancialTable(order: any): string {
  return `
    <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-bottom: 24px; font-size: 14px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Subtotal</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1a2f22;">₹${Number(order.subtotal || 0).toFixed(2)}</td>
        </tr>
        ${Number(order.discount || 0) > 0 ? `
        <tr>
          <td style="padding: 4px 0; color: #16a34a;">Discount</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #16a34a;">-₹${Number(order.discount).toFixed(2)}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Standard Express Shipping</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #16a34a;">FREE</td>
        </tr>
        <tr style="border-top: 2px solid #1a2f22;">
          <td style="padding: 10px 0 4px 0; font-size: 16px; font-weight: 700; color: #1a2f22;">Total Amount</td>
          <td style="padding: 10px 0 4px 0; text-align: right; font-size: 18px; font-weight: 700; color: #1a2f22;">₹${Number(order.total_amount || 0).toFixed(2)}</td>
        </tr>
      </table>
    </div>
  `;
}

// 1. Customer Email HTML: Order Confirmation
function renderCustomerEmailHtml(order: any, items: any[]): string {
  const itemsRows = renderItemsRows(items);
  const financialTable = renderFinancialTable(order);
  const shipping = order.shipping_address || {};
  const orderTimeStr = formatToIST(order.created_at);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Order Confirmation #${order.display_order_id}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a2f22; background-color: #faf6f0; margin: 0; padding: 24px 12px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid rgba(26, 47, 34, 0.1); box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
        
        <div style="background-color: #1a2f22; padding: 28px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; letter-spacing: 2px; font-weight: 700; color: #d4af37;">KABGEER MASALE</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #e2e8f0; letter-spacing: 0.5px;">Authentic Lucknowi Spices & Traditional Blends</p>
        </div>
        
        <div style="padding: 28px 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; background-color: #dcfce7; color: #16a34a; font-weight: 700; font-size: 13px; padding: 4px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">
              ✓ Order Confirmed & Paid
            </span>
            <h2 style="color: #1a2f22; margin: 12px 0 4px 0; font-size: 20px;">Thank you for your order, ${order.customer_name}!</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0;">Your aromatic spices are freshly prepared and being packed for dispatch.</p>
          </div>
          
          <div style="background: #faf6f0; border: 1px solid rgba(26, 47, 34, 0.08); border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Order ID:</strong></td>
                <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #1a2f22; font-family: monospace;">${order.display_order_id}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Placed On:</strong></td>
                <td style="padding: 4px 0; text-align: right; color: #1a2f22;">${orderTimeStr}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Payment Method:</strong></td>
                <td style="padding: 4px 0; text-align: right; color: #16a34a; font-weight: 600;">Instant Online (Razorpay)</td>
              </tr>
            </table>
          </div>

          <h3 style="color: #1a2f22; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 12px 0; border-bottom: 2px solid #1a2f22; padding-bottom: 6px;">
            Ordered Items
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f8fafc; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">
                <th style="padding: 8px 12px;">Masala</th>
                <th style="padding: 8px 12px; text-align: center;">Qty</th>
                <th style="padding: 8px 12px; text-align: right;">Unit Price</th>
                <th style="padding: 8px 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          ${financialTable}

          <h3 style="color: #1a2f22; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 12px 0; border-bottom: 2px solid #1a2f22; padding-bottom: 6px;">
            Delivery Address
          </h3>
          <div style="background: #f8fafc; border-radius: 8px; padding: 14px; font-size: 13px; line-height: 1.6; color: #334155; border: 1px solid #e2e8f0;">
            <strong>${order.customer_name}</strong><br/>
            ${shipping.address || ''}${shipping.apartment ? ', ' + shipping.apartment : ''}<br/>
            ${shipping.city || ''}, ${shipping.state || 'Uttar Pradesh'} - ${shipping.pinCode || ''}<br/>
            <strong>Mobile:</strong> ${order.customer_phone || ''}
          </div>

          <div style="margin-top: 32px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
            <p style="margin: 0 0 6px 0;">Need assistance? Reply directly to this email or reach us at <a href="mailto:kabgeermasale@gmail.com" style="color: #1a2f22; font-weight: 600; text-decoration: underline;">kabgeermasale@gmail.com</a></p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Kabgeer Masale. 100% Pure Lucknavi Heritage.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 2. Customer Email HTML: Order Shipped / In Transit
function renderShippedEmailHtml(order: any, items: any[], awb?: string, courier?: string): string {
  const itemsRows = renderItemsRows(items);
  const shipping = order.shipping_address || {};
  const trackingNumber = awb || order.trackon_awb || order.shiprocket_awb || 'Generated';
  const courierPartnerName = courier || order.courier_partner || 'Trackon Courier';
  const trackingLink = `https://trackon.in/`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Order Shipped #${order.display_order_id}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a2f22; background-color: #faf6f0; margin: 0; padding: 24px 12px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid rgba(26, 47, 34, 0.1); box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
        
        <div style="background-color: #1a2f22; padding: 28px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; letter-spacing: 2px; font-weight: 700; color: #d4af37;">KABGEER MASALE</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #e2e8f0; letter-spacing: 0.5px;">Authentic Lucknowi Spices & Traditional Blends</p>
        </div>
        
        <div style="padding: 28px 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; background-color: #e0f2fe; color: #0284c7; font-weight: 700; font-size: 13px; padding: 4px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">
              🚚 Order Shipped & In Transit
            </span>
            <h2 style="color: #1a2f22; margin: 12px 0 4px 0; font-size: 20px;">Great news, ${order.customer_name}!</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0;">Your spice package has been packed with care and handed over to the courier partner.</p>
          </div>
          
          <!-- Shipping / Tracking Card -->
          <div style="background: #faf6f0; border: 2px dashed #d4af37; border-radius: 10px; padding: 20px; margin: 24px 0; text-align: center;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px;">
              Courier Partner
            </div>
            <div style="font-size: 16px; font-weight: 700; color: #1a2f22; margin-bottom: 12px;">
              ${courierPartnerName}
            </div>

            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px;">
              AWB / Consignment Number
            </div>
            <div style="font-size: 18px; font-weight: 800; font-family: monospace; color: #1a2f22; letter-spacing: 1px; background: #ffffff; padding: 8px 16px; border-radius: 6px; display: inline-block; border: 1px solid #e2e8f0; margin-bottom: 16px;">
              ${trackingNumber}
            </div>

            <div>
              <a href="${trackingLink}" target="_blank" style="display: inline-block; background-color: #d4af37; color: #1a2f22; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 6px; text-decoration: none; box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);">
                Track Consignment Status →
              </a>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">(Tracking status may take 12–24 hours to update on courier portal)</div>
          </div>

          <h3 style="color: #1a2f22; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 12px 0; border-bottom: 2px solid #1a2f22; padding-bottom: 6px;">
            Package Contents
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f8fafc; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">
                <th style="padding: 8px 12px;">Masala</th>
                <th style="padding: 8px 12px; text-align: center;">Qty</th>
                <th style="padding: 8px 12px; text-align: right;">Unit Price</th>
                <th style="padding: 8px 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <h3 style="color: #1a2f22; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 12px 0; border-bottom: 2px solid #1a2f22; padding-bottom: 6px;">
            Delivering To
          </h3>
          <div style="background: #f8fafc; border-radius: 8px; padding: 14px; font-size: 13px; line-height: 1.6; color: #334155; border: 1px solid #e2e8f0;">
            <strong>${order.customer_name}</strong><br/>
            ${shipping.address || ''}${shipping.apartment ? ', ' + shipping.apartment : ''}<br/>
            ${shipping.city || ''}, ${shipping.state || 'Uttar Pradesh'} - ${shipping.pinCode || ''}<br/>
            <strong>Mobile:</strong> ${order.customer_phone || ''}
          </div>

          <div style="margin-top: 32px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
            <p style="margin: 0 0 6px 0;">Need any assistance with your delivery? Contact us at <a href="mailto:kabgeermasale@gmail.com" style="color: #1a2f22; font-weight: 600; text-decoration: underline;">kabgeermasale@gmail.com</a></p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Kabgeer Masale. 100% Pure Lucknavi Heritage.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 3. Customer Email HTML: Order Delivered
function renderDeliveredEmailHtml(order: any, items: any[]): string {
  const itemsRows = renderItemsRows(items);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Order Delivered #${order.display_order_id}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a2f22; background-color: #faf6f0; margin: 0; padding: 24px 12px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid rgba(26, 47, 34, 0.1); box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
        
        <div style="background-color: #1a2f22; padding: 28px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; letter-spacing: 2px; font-weight: 700; color: #d4af37;">KABGEER MASALE</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #e2e8f0; letter-spacing: 0.5px;">Authentic Lucknowi Spices & Traditional Blends</p>
        </div>
        
        <div style="padding: 28px 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; background-color: #dcfce7; color: #16a34a; font-weight: 700; font-size: 13px; padding: 4px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">
              🎉 Delivered Successfully
            </span>
            <h2 style="color: #1a2f22; margin: 12px 0 4px 0; font-size: 20px;">Your Royal Spices Have Arrived!</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0;">Order #${order.display_order_id} has been successfully delivered to your doorstep.</p>
          </div>
          
          <div style="background: #faf6f0; border-radius: 10px; padding: 20px; margin: 24px 0; text-align: center; border: 1px solid rgba(26, 47, 34, 0.08);">
            <div style="font-size: 18px; font-weight: 700; color: #1a2f22; margin-bottom: 8px;">
              Ready to Cook Authentic Awadhi Delicacies?
            </div>
            <p style="font-size: 13px; color: #64748b; margin: 0 0 16px 0; line-height: 1.5;">
              Discover traditional family recipes crafted specifically for your Kabgeer spice blends — from royal Galauti Kebabs and aromatic Dum Biryani to rich Nihari and Korma.
            </p>
            <div>
              <a href="https://kabgeermasala.com/recipes" target="_blank" style="display: inline-block; background-color: #1a2f22; color: #d4af37; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 6px; text-decoration: none;">
                Explore Master Recipes →
              </a>
            </div>
          </div>

          <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #166534; margin-bottom: 24px;">
            <strong>🌿 Freshness Tip:</strong> Store your masalas in an airtight glass or steel jar in a cool, dry place away from direct sunlight to preserve the rich essential oils and aroma.
          </div>

          <h3 style="color: #1a2f22; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 12px 0; border-bottom: 2px solid #1a2f22; padding-bottom: 6px;">
            Delivered Items
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f8fafc; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">
                <th style="padding: 8px 12px;">Masala</th>
                <th style="padding: 8px 12px; text-align: center;">Qty</th>
                <th style="padding: 8px 12px; text-align: right;">Unit Price</th>
                <th style="padding: 8px 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="margin-top: 32px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
            <p style="margin: 0 0 6px 0;">Loved our spices? We'd love to hear your feedback! Write to us at <a href="mailto:kabgeermasale@gmail.com" style="color: #1a2f22; font-weight: 600; text-decoration: underline;">kabgeermasale@gmail.com</a></p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Kabgeer Masale. 100% Pure Lucknavi Heritage.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 4. Customer Email HTML: Order Cancelled
function renderCancelledEmailHtml(order: any, items: any[], reason?: string): string {
  const itemsRows = renderItemsRows(items);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Order Cancelled #${order.display_order_id}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a2f22; background-color: #faf6f0; margin: 0; padding: 24px 12px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid rgba(26, 47, 34, 0.1); box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
        
        <div style="background-color: #1a2f22; padding: 28px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; letter-spacing: 2px; font-weight: 700; color: #d4af37;">KABGEER MASALE</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #e2e8f0; letter-spacing: 0.5px;">Authentic Lucknowi Spices & Traditional Blends</p>
        </div>
        
        <div style="padding: 28px 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; background-color: #fee2e2; color: #dc2626; font-weight: 700; font-size: 13px; padding: 4px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">
              Order Cancelled
            </span>
            <h2 style="color: #1a2f22; margin: 12px 0 4px 0; font-size: 20px;">Notice Regarding Order #${order.display_order_id}</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0;">Your order has been cancelled ${reason ? `due to: <em>${reason}</em>` : 'as requested'}.</p>
          </div>
          
          <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; color: #991b1b; line-height: 1.5;">
            <strong>Refund Notice:</strong> If payment was already processed via Razorpay (UPI, Card, NetBanking), a full refund of <strong>₹${Number(order.total_amount || 0).toFixed(2)}</strong> has been initiated and will reflect in your source account within 3–5 business days.
          </div>

          <h3 style="color: #1a2f22; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 12px 0; border-bottom: 2px solid #1a2f22; padding-bottom: 6px;">
            Cancelled Order Items
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f8fafc; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">
                <th style="padding: 8px 12px;">Masala</th>
                <th style="padding: 8px 12px; text-align: center;">Qty</th>
                <th style="padding: 8px 12px; text-align: right;">Unit Price</th>
                <th style="padding: 8px 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="margin-top: 32px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
            <p style="margin: 0 0 6px 0;">If you have any questions or believe this was done in error, reach us at <a href="mailto:kabgeermasale@gmail.com" style="color: #1a2f22; font-weight: 600; text-decoration: underline;">kabgeermasale@gmail.com</a></p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Kabgeer Masale. 100% Pure Lucknavi Heritage.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 5. Admin Alert Email HTML Renderer
function renderAdminEmailHtml(order: any, items: any[]): string {
  const itemsRows = (items || []).map((item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
        <strong>${item.product_name}</strong> (${item.product_id})
        ${item.weight_pack ? `<div style="font-size: 11px; color: #64748b;">${item.weight_pack}</div>` : ''}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700; font-size: 14px; color: #1a2f22;">
        ${item.quantity}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px;">
        ₹${Number(item.total_price || item.unit_price * item.quantity || 0).toFixed(2)}
      </td>
    </tr>
  `).join('');

  const shipping = order.shipping_address || {};
  const orderTimeStr = formatToIST(order.created_at);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>New Order Alert #${order.display_order_id}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a2f22; background-color: #f1f5f9; margin: 0; padding: 20px 10px;">
      <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 24px; border: 1px solid #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        
        <div style="background-color: #16a34a; color: white; padding: 14px 18px; border-radius: 6px; font-weight: 700; font-size: 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
          <span>📦 NEW PAID ORDER: #${order.display_order_id}</span>
          <span style="font-size: 14px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px;">₹${Number(order.total_amount).toFixed(2)}</span>
        </div>

        <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Customer & Order Info</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; background: #f8fafc; border-radius: 6px; padding: 12px; border: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 6px 12px; color: #64748b;"><strong>Order ID:</strong></td>
            <td style="padding: 6px 12px; font-weight: 700; font-family: monospace;">${order.display_order_id}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; color: #64748b;"><strong>Received At:</strong></td>
            <td style="padding: 6px 12px;">${orderTimeStr}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; color: #64748b;"><strong>Customer:</strong></td>
            <td style="padding: 6px 12px; font-weight: 600;">${order.customer_name} (${order.customer_type || 'Customer'})</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; color: #64748b;"><strong>Email:</strong></td>
            <td style="padding: 6px 12px;">${order.customer_email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; color: #64748b;"><strong>Phone:</strong></td>
            <td style="padding: 6px 12px; font-weight: 700; color: #0284c7;">${order.customer_phone}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; color: #64748b;"><strong>Payment Status:</strong></td>
            <td style="padding: 6px 12px; color: #16a34a; font-weight: 700;">Paid (Razorpay)</td>
          </tr>
        </table>

        <h3 style="margin: 20px 0 8px 0; font-size: 14px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Packing List</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 6px;">
          <thead>
            <tr style="background: #f1f5f9; text-align: left; font-size: 12px; color: #475569;">
              <th style="padding: 8px 10px;">Item / SKU</th>
              <th style="padding: 8px 10px; text-align: center;">Qty</th>
              <th style="padding: 8px 10px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <h3 style="margin: 20px 0 8px 0; font-size: 14px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Courier Dispatch Address</h3>
        <div style="background: #f8fafc; padding: 14px; border-radius: 6px; font-size: 13px; line-height: 1.6; border: 1px solid #e2e8f0;">
          <strong>${order.customer_name}</strong><br/>
          ${shipping.address || ''}${shipping.apartment ? ', ' + shipping.apartment : ''}<br/>
          ${shipping.city || ''}, ${shipping.state || 'Uttar Pradesh'} - <strong>${shipping.pinCode || ''}</strong><br/>
          <strong>Phone:</strong> ${order.customer_phone || ''}
        </div>
      </div>
    </body>
    </html>
  `;
}

// MAIN HANDLER
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
    const rawSenderEmail = Deno.env.get('SENDER_EMAIL') || 'Kabgeer Masale <orders@kabgeermasala.com>';
    const rawAdminEmail = Deno.env.get('ADMIN_NOTIFICATION_EMAIL') || 'admin@kabgeermasala.com';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: EmailPayload = await req.json();
    const { orderId, forceResend, emailType, newStatus, awbNumber, courierName, cancellationReason } = body;

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
    const targetCustomerRecipient = isTestingDomain ? 'mailtoayusht@gmail.com' : order.customer_email;
    const formattedFrom = isTestingDomain ? 'Kabgeer Masale <onboarding@resend.dev>' : rawSenderEmail;

    // =========================================================================
    // CASE A: Status Update Notification (Shipped, Delivered, Cancelled)
    // =========================================================================
    if (emailType === 'status_update' || (newStatus && ['Shipped', 'Delivered', 'Cancelled'].includes(newStatus))) {
      const statusToProcess = newStatus || order.order_status;
      let subject = `Order Update #${order.display_order_id} — Kabgeer Masale`;
      let emailHtml = '';

      if (statusToProcess === 'Shipped') {
        subject = `🚚 Shipped! Your Kabgeer Order #${order.display_order_id} is On The Way`;
        emailHtml = renderShippedEmailHtml(order, items || [], awbNumber, courierName);
      } else if (statusToProcess === 'Delivered') {
        subject = `🎉 Delivered! Your Kabgeer Masale Order #${order.display_order_id} Has Arrived`;
        emailHtml = renderDeliveredEmailHtml(order, items || []);
      } else if (statusToProcess === 'Cancelled') {
        subject = `Order Cancelled #${order.display_order_id} — Kabgeer Masale`;
        emailHtml = renderCancelledEmailHtml(order, items || [], cancellationReason);
      }

      if (emailHtml && !isSimulationMode) {
        try {
          console.log(`Sending Status '${statusToProcess}' Email to '${targetCustomerRecipient}'...`);
          const resendResp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: formattedFrom,
              to: [targetCustomerRecipient],
              reply_to: 'enquiry@kabgeermasala.com',
              subject: subject,
              html: emailHtml
            })
          });

          const respText = await resendResp.text();
          console.log(`Resend Status Email HTTP ${resendResp.status}:`, respText);
          try { customerResendResult = JSON.parse(respText); } catch (_) { customerResendResult = respText; }
          if (resendResp.ok) customerSent = true;
        } catch (e: any) {
          console.error('Resend Status Email Exception:', e);
          customerResendResult = { exception: e?.message };
        }
      } else if (emailHtml) {
        customerSent = true;
      }

      return new Response(
        JSON.stringify({
          success: true,
          statusType: statusToProcess,
          displayOrderId: order.display_order_id,
          customerEmailSent: customerSent,
          isSimulationMode,
          isTestingDomain,
          customerResendResult
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // CASE B: Standard Order Confirmation (Placed & Paid)
    // =========================================================================
    if (!order.customer_email_sent_at || forceResend) {
      const customerHtml = renderCustomerEmailHtml(order, items || []);

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
              reply_to: 'enquiry@kabgeermasala.com',
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

    // Admin Alert Dispatch
    if (!order.admin_email_sent_at || forceResend) {
      const adminHtml = renderAdminEmailHtml(order, items || []);
      const targetAdminRecipient = isTestingDomain ? 'mailtoayusht@gmail.com' : rawAdminEmail;
      const formattedAdminFrom = isTestingDomain ? 'Kabgeer System <onboarding@resend.dev>' : rawSenderEmail;

      if (!isSimulationMode) {
        try {
          console.log(`Sending Resend Admin Email from '${formattedAdminFrom}' to '${targetAdminRecipient}'...`);
          const resendResp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: formattedAdminFrom,
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
