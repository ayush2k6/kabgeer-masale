import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, getCorsHeaders } from '../_shared/cors.ts';
import { verifyInternalOrAdminCaller } from '../_shared/internalAuth.ts';

interface EmailPayload {
  orderId: string;
  forceResend?: boolean;
  emailType?: 'confirmation' | 'status_update' | 'review_request' | 'custom_message';
  newStatus?: 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  awbNumber?: string;
  courierName?: string;
  cancellationReason?: string;
  customSubject?: string;
  customMessage?: string;
  reviewLink?: string;
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

// Security Helper: Strictly escape all untrusted user-controlled strings for HTML contexts
function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSafeOrder(order: any) {
  const shipping = order?.shipping_address || {};
  return {
    id: order?.id,
    displayOrderId: escapeHtml(order?.display_order_id || ''),
    customerName: escapeHtml(order?.customer_name || 'Valued Customer'),
    customerEmail: escapeHtml(order?.customer_email || ''),
    customerPhone: escapeHtml(order?.customer_phone || ''),
    customerType: escapeHtml(order?.customer_type || 'Customer'),
    totalAmount: order?.total_amount,
    subtotal: order?.subtotal,
    discount: order?.discount,
    createdAt: order?.created_at,
    shippingAddress: escapeHtml(shipping.address || ''),
    shippingApartment: escapeHtml(shipping.apartment || ''),
    shippingCity: escapeHtml(shipping.city || ''),
    shippingState: escapeHtml(shipping.state || 'Uttar Pradesh'),
    shippingPinCode: escapeHtml(shipping.pinCode || ''),
    trackonAwb: escapeHtml(order?.trackon_awb || ''),
    shiprocketAwb: escapeHtml(order?.shiprocket_awb || ''),
    courierPartner: escapeHtml(order?.courier_partner || '')
  };
}

// Helper to identify BYB (Build Your Box / Build Your Bundle) orders
function isBybOrder(order: any, items?: any[]): boolean {
  if (!order) return false;
  const displayId = String(order.display_order_id || '');
  const isPrefix = displayId.startsWith('BYB') || displayId.includes('BYB');
  const isBundleFlag = Boolean(order.is_bundle);
  const totalCount = (items || []).reduce((acc: number, it: any) => acc + (Number(it.quantity) || 1), 0);
  return Boolean(isPrefix || isBundleFlag || totalCount >= 4);
}

// Helper: Common Items Table Generator
function renderItemsRows(items: any[], isByb: boolean = false): string {
  const renderedItems = (items || []).map((item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle;">
        <strong style="color: #1a2f22; font-size: 14px;">${escapeHtml(item.product_name || 'Authentic Masala')}</strong>
        ${item.weight_pack ? `<div style="font-size: 12px; color: #64748b;">Pack: ${escapeHtml(item.weight_pack)}</div>` : ''}
        ${isByb ? `<span style="display: inline-block; background-color: #fef3c7; color: #92400e; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">👑 Curated Box Item</span>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #334155; font-size: 14px;">
        ${escapeHtml(item.quantity)}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #334155; font-size: 14px;">
        ₹${Number(item.unit_price || 0).toFixed(2)}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: #1a2f22; font-size: 14px;">
        ₹${Number(item.total_price || (item.unit_price * item.quantity) || 0).toFixed(2)}
      </td>
    </tr>
  `).join('');

  if (!isByb) return renderedItems;

  // For BYB orders, explicitly include the 2 Free Mini Masala Sample Boxes in the items manifest
  const complimentaryGiftRow = `
    <tr style="background-color: #f0fdf4;">
      <td style="padding: 12px; border-bottom: 1px solid #bbf7d0; vertical-align: middle;">
        <strong style="color: #166534; font-size: 14px;">🎁 2x Mini Masala Boxes (Sample Pack)</strong>
        <div style="font-size: 12px; color: #15803d; margin-top: 2px;">Complimentary Build Your Box Gift • Assorted Flavours</div>
        <span style="display: inline-block; background-color: #dcfce7; color: #166534; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-top: 4px; text-transform: uppercase;">
          ★ 100% Free Gift
        </span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #bbf7d0; text-align: center; color: #166534; font-weight: 700; font-size: 14px;">
        2
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #bbf7d0; text-align: right; color: #166534; font-size: 14px; font-weight: 600;">
        FREE
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #bbf7d0; text-align: right; font-weight: 800; color: #166534; font-size: 14px;">
        FREE (₹0.00)
      </td>
    </tr>
  `;

  return renderedItems + complimentaryGiftRow;
}

// Helper: Common Financial Breakdown Generator
function renderFinancialTable(order: any, isByb: boolean = false): string {
  const discountLabel = isByb
    ? (order.coupon_code ? `Special Discount (Build Your Box • ${escapeHtml(order.coupon_code)})` : 'Special Discount (Build Your Box 10% OFF)')
    : (order.coupon_code ? `Discount (Coupon: ${escapeHtml(order.coupon_code)})` : 'Discount');

  return `
    <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-bottom: 24px; font-size: 14px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Subtotal</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1a2f22;">₹${Number(order.subtotal || 0).toFixed(2)}</td>
        </tr>
        ${Number(order.discount || 0) > 0 ? `
        <tr>
          <td style="padding: 4px 0; color: #16a34a;">${discountLabel}</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #16a34a;">-₹${Number(order.discount).toFixed(2)}</td>
        </tr>` : ''}
        ${isByb ? `
        <tr>
          <td style="padding: 4px 0; color: #047857; font-weight: 600;">🎁 2x Mini Masala Boxes (Assorted Sample Pack)</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #047857;">FREE (Included)</td>
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
  const safe = getSafeOrder(order);
  const byb = isBybOrder(order, items);
  const itemsRows = renderItemsRows(items, byb);
  const financialTable = renderFinancialTable(order, byb);
  const shipping = order.shipping_address || {};
  const orderTimeStr = formatToIST(order.created_at);
  const totalItemUnits = (items || []).reduce((acc: number, it: any) => acc + (Number(it.quantity) || 1), 0);

  // Celebratory Build Your Box (BYB) Banner
  const bybBannerHtml = byb ? `
    <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 40%, #ecfdf5 100%); border: 1.5px solid #d4af37; border-radius: 10px; padding: 18px 20px; margin: 20px 0; text-align: left; box-shadow: 0 4px 14px rgba(212, 175, 55, 0.12);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
        <span style="display: inline-block; background-color: #1a2f22; color: #d4af37; font-size: 12px; font-weight: 800; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px; text-transform: uppercase;">
          👑 Royal Build Your Box (BYB) Order
        </span>
        <span style="display: inline-block; background-color: #047857; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px;">
          ✓ 10% Savings + 2 Free Mini Boxes
        </span>
      </div>
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #1a2f22; font-weight: 600; line-height: 1.5;">
        Congratulations! You successfully unlocked our <strong>Royal Build Your Box (BYB)</strong> perks!
      </p>
      <div style="background: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 12px 14px; border: 1px solid rgba(212, 175, 55, 0.3); font-size: 13px; color: #334155; line-height: 1.6;">
        <div style="font-weight: 700; color: #1a2f22; margin-bottom: 6px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">
          📦 Here is exactly what you got in your royal shipment:
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 3px 0; vertical-align: top; width: 22px;">🍛</td>
            <td style="padding: 3px 0;"><strong>${totalItemUnits} Custom Curated Masalas:</strong> Handcrafted from our 65-year-old Lucknowi family heritage.</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; vertical-align: top;">🎁</td>
            <td style="padding: 3px 0; color: #047857;"><strong>2x Chef's Mini Masala Sample Boxes:</strong> FREE assorted gift boxes included with your parcel!</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; vertical-align: top;">💰</td>
            <td style="padding: 3px 0; color: #16a34a;"><strong>Instant 10% Flat Bundle Discount:</strong> Automatically deducted from your order subtotal.</td>
          </tr>
          <tr>
            <td style="padding: 3px 0; vertical-align: top;">🚚</td>
            <td style="padding: 3px 0; color: #0284c7;"><strong>Express Insured Courier:</strong> Packed in our signature protective parcel with real-time tracking.</td>
          </tr>
        </table>
      </div>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Order Confirmation #${safe.displayOrderId}</title>
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
            <h2 style="color: #1a2f22; margin: 12px 0 4px 0; font-size: 20px;">Thank you for your order, ${safe.customerName}!</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0;">${byb ? 'Your custom Build Your Box is being carefully packed with your handpicked masalas and complimentary gifts.' : 'Your aromatic spices are freshly prepared and being packed for dispatch.'}</p>
          </div>

          ${bybBannerHtml}
          
          <div style="background: #faf6f0; border: 1px solid rgba(26, 47, 34, 0.08); border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Order ID:</strong></td>
                <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #1a2f22; font-family: monospace;">${safe.displayOrderId}</td>
              </tr>
              ${byb ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Package Type:</strong></td>
                <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #b45309;">👑 Build Your Box (BYB Package)</td>
              </tr>` : ''}
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
            ${byb ? 'What You Got (Your Box Contents & Complimentary Gifts)' : 'Ordered Items'}
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
            <strong>${safe.customerName}</strong><br/>
            ${safe.shippingAddress}${safe.shippingApartment ? ', ' + safe.shippingApartment : ''}<br/>
            ${safe.shippingCity}, ${safe.shippingState} - ${safe.shippingPinCode}<br/>
            <strong>Mobile:</strong> ${safe.customerPhone}
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
  const safe = getSafeOrder(order);
  const byb = isBybOrder(order, items);
  const itemsRows = renderItemsRows(items, byb);
  const trackingNumber = escapeHtml(awb || safe.trackonAwb || safe.shiprocketAwb || 'Generated');
  const courierPartnerName = escapeHtml(courier || safe.courierPartner || 'Trackon Courier');
  const trackingLink = `https://trackon.in/`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Order Shipped #${safe.displayOrderId}</title>
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
            <h2 style="color: #1a2f22; margin: 12px 0 4px 0; font-size: 20px;">Great news, ${safe.customerName}!</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0;">${byb ? 'Your custom Build Your Box package with all handpicked masalas and complimentary gifts has been handed over to the courier partner.' : 'Your spice package has been packed with care and handed over to the courier partner.'}</p>
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
            ${byb ? 'What You Got (Package Contents & Complimentary Gifts)' : 'Package Contents'}
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
            <strong>${safe.customerName}</strong><br/>
            ${safe.shippingAddress}${safe.shippingApartment ? ', ' + safe.shippingApartment : ''}<br/>
            ${safe.shippingCity}, ${safe.shippingState} - ${safe.shippingPinCode}<br/>
            <strong>Mobile:</strong> ${safe.customerPhone || ''}
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
  const safe = getSafeOrder(order);
  const byb = isBybOrder(order, items);
  const itemsRows = renderItemsRows(items, byb);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Order Delivered #${safe.displayOrderId}</title>
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
            <p style="color: #64748b; font-size: 14px; margin: 0;">${byb ? `Your custom Build Your Box #${safe.displayOrderId} has been safely delivered to your doorstep.` : `Order #${safe.displayOrderId} has been successfully delivered to your doorstep.`}</p>
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
            ${byb ? 'What You Received (Box Contents & Complimentary Gifts)' : 'Delivered Items'}
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
  const safe = getSafeOrder(order);
  const safeReason = escapeHtml(reason || '');
  const itemsRows = renderItemsRows(items, false);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Order Cancelled #${safe.displayOrderId}</title>
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
            <h2 style="color: #1a2f22; margin: 12px 0 4px 0; font-size: 20px;">Notice Regarding Order #${safe.displayOrderId}</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0;">Your order has been cancelled ${safeReason ? `due to: <em>${safeReason}</em>` : 'as requested'}.</p>
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
  const safe = getSafeOrder(order);
  const byb = isBybOrder(order, items);
  const itemsRows = (items || []).map((item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
        <strong>${escapeHtml(item.product_name)}</strong> (${escapeHtml(item.product_id)})
        ${item.weight_pack ? `<div style="font-size: 11px; color: #64748b;">${escapeHtml(item.weight_pack)}</div>` : ''}
        ${byb ? `<span style="display: inline-block; background-color: #fef3c7; color: #92400e; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-top: 3px;">👑 BYB Curated Item</span>` : ''}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700; font-size: 14px; color: #1a2f22;">
        ${escapeHtml(item.quantity)}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px;">
        ₹${Number(item.total_price || item.unit_price * item.quantity || 0).toFixed(2)}
      </td>
    </tr>
  `).join('');

  const bybPackingAlertHtml = byb ? `
    <div style="background-color: #fffbeb; border: 2px dashed #d4af37; padding: 14px 16px; border-radius: 6px; margin-bottom: 20px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
        <strong style="color: #92400e; font-size: 14px;">👑 BUILD YOUR BOX (BYB) ORDER DETECTED</strong>
        <span style="background-color: #b45309; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">MANDATORY FREE GIFT</span>
      </div>
      <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.5;">
        This customer ordered through Build Your Box (4+ masalas). <strong>ACTION REQUIRED:</strong> You MUST pack <strong>2x Free Mini Masala Sample Boxes</strong> into this shipment before dispatch!
      </p>
    </div>
  ` : '';

  const adminComplimentaryGiftRow = byb ? `
    <tr style="background-color: #f0fdf4;">
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #166534;">
        <strong>🎁 2x Mini Masala Sample Boxes</strong> (Assorted Sample Pack)
        <div style="font-size: 11px; color: #15803d; font-weight: 600;">MANDATORY BYB FREE GIFT — PACK INTO SHIPMENT</div>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 800; font-size: 14px; color: #166534;">
        2
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px; color: #166534; font-weight: 700;">
        FREE (₹0.00)
      </td>
    </tr>
  ` : '';

  const shipping = order.shipping_address || {};
  const orderTimeStr = formatToIST(order.created_at);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>New Order Alert #${safe.displayOrderId}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a2f22; background-color: #f1f5f9; margin: 0; padding: 20px 10px;">
      <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 24px; border: 1px solid #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        
        <div style="background-color: ${byb ? '#b45309' : '#16a34a'}; color: white; padding: 14px 18px; border-radius: 6px; font-weight: 700; font-size: 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
          <span>📦 ${byb ? '👑 NEW BYB ORDER' : 'NEW PAID ORDER'}: #${safe.displayOrderId}</span>
          <span style="font-size: 14px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px;">₹${Number(order.total_amount).toFixed(2)}</span>
        </div>

        ${bybPackingAlertHtml}

        <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Customer & Order Info</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; background: #f8fafc; border-radius: 6px; padding: 12px; border: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 6px 12px; color: #64748b;"><strong>Order ID:</strong></td>
            <td style="padding: 6px 12px; font-weight: 700; font-family: monospace;">${safe.displayOrderId}</td>
          </tr>
          ${byb ? `
          <tr>
            <td style="padding: 6px 12px; color: #64748b;"><strong>Order Type:</strong></td>
            <td style="padding: 6px 12px; font-weight: 700; color: #b45309;">👑 Build Your Box (BYB Promo)</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 12px; color: #64748b;"><strong>Received At:</strong></td>
            <td style="padding: 6px 12px;">${orderTimeStr}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; color: #64748b;"><strong>Customer:</strong></td>
            <td style="padding: 6px 12px; font-weight: 600;">${safe.customerName} (${safe.customerType})</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; color: #64748b;"><strong>Email:</strong></td>
            <td style="padding: 6px 12px;">${safe.customerEmail}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; color: #64748b;"><strong>Phone:</strong></td>
            <td style="padding: 6px 12px; font-weight: 700; color: #0284c7;">${safe.customerPhone}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px; color: #64748b;"><strong>Payment Status:</strong></td>
            <td style="padding: 6px 12px; color: #16a34a; font-weight: 700;">Paid (Razorpay)</td>
          </tr>
        </table>

        <h3 style="margin: 20px 0 8px 0; font-size: 14px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Packing List (What To Pack)</h3>
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
            ${adminComplimentaryGiftRow}
          </tbody>
        </table>

        <h3 style="margin: 20px 0 8px 0; font-size: 14px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Courier Dispatch Address</h3>
        <div style="background: #f8fafc; padding: 14px; border-radius: 6px; font-size: 13px; line-height: 1.6; border: 1px solid #e2e8f0;">
          <strong>${safe.customerName}</strong><br/>
          ${shipping.address || ''}${shipping.apartment ? ', ' + shipping.apartment : ''}<br/>
          ${shipping.city || ''}, ${shipping.state || 'Uttar Pradesh'} - <strong>${shipping.pinCode || ''}</strong><br/>
          <strong>Phone:</strong> ${safe.customerPhone || ''}
        </div>
      </div>
    </body>
    </html>
  `;
}

// 6. Customer Email HTML: Post-Delivery Review Request
function renderReviewRequestEmailHtml(order: any, items: any[], customReviewUrl?: string): string {
  const safe = getSafeOrder(order);
  const itemsRows = (items || []).map((item) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #1a2f22; font-size: 13px;">
        <strong>${item.product_name || 'Authentic Masala'}</strong> ${item.weight_pack ? `<span style="color: #64748b; font-size: 12px;">(${item.weight_pack})</span>` : ''}
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #334155; font-size: 13px;">
        × ${item.quantity}
      </td>
    </tr>
  `).join('');

  const defaultWhatsappMsg = encodeURIComponent(`Hi Kabgeer Masale! Here is my review & cooking feedback for Order #${order.display_order_id || order.id}: `);
  const defaultWhatsappUrl = `https://wa.me/918090086636?text=${defaultWhatsappMsg}`;
  
  const targetReviewUrl = customReviewUrl || Deno.env.get('GOOGLE_REVIEW_URL') || defaultWhatsappUrl;
  const isWhatsApp = targetReviewUrl.includes('wa.me');
  const buttonLabel = isWhatsApp ? '💬 Share Your Review on WhatsApp →' : '⭐ Leave a 1-Minute Review on Google →';
  const subtextLabel = isWhatsApp ? '(Opens direct chat with our culinary team • Feel free to share photos!)' : '(Takes less than 30 seconds • Directly on Google Maps)';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>How was your culinary experience with Kabgeer Masale?</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a2f22; background-color: #faf6f0; margin: 0; padding: 24px 12px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid rgba(26, 47, 34, 0.1); box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
        
        <!-- Header -->
        <div style="background-color: #1a2f22; padding: 28px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; letter-spacing: 2px; font-weight: 700; color: #d4af37;">KABGEER MASALE</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #e2e8f0; letter-spacing: 0.5px;">Authentic Lucknowi Spices & Traditional Blends</p>
        </div>
        
        <div style="padding: 28px 24px;">
          <!-- Greeting Card -->
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; background-color: #fef3c7; color: #92400e; font-weight: 700; font-size: 12px; padding: 4px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">
              👑 1-Week Culinary Check-In
            </span>
            <h2 style="color: #1a2f22; margin: 12px 0 6px 0; font-size: 20px;">How did your Awadhi cooking turn out, ${safe.customerName}?</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0; line-height: 1.5;">
              It has been a week since your royal spice package arrived. We hope the authentic aroma of Lucknow has brought rich flavors to your home!
            </p>
          </div>

          <!-- Star Rating Component -->
          <div style="background: #faf6f0; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; border: 1px solid rgba(26, 47, 34, 0.08);">
            <div style="font-size: 13px; font-weight: 700; color: #1a2f22; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
              Tap to Rate Your Experience
            </div>
            <div style="margin-bottom: 16px;">
              <a href="${targetReviewUrl}" target="_blank" style="text-decoration: none; font-size: 28px; color: #d4af37; letter-spacing: 6px;">
                ★ ★ ★ ★ ★
              </a>
            </div>
            <div>
              <a href="${targetReviewUrl}" target="_blank" style="display: inline-block; background-color: #1a2f22; color: #d4af37; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 6px; text-decoration: none; border: 1px solid #d4af37; box-shadow: 0 2px 8px rgba(26, 47, 34, 0.15);">
                ${buttonLabel}
              </a>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
              ${subtextLabel}
            </div>
          </div>

          <!-- Purchased Items -->
          <h3 style="color: #1a2f22; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 10px 0; border-bottom: 2px solid #1a2f22; padding-bottom: 6px;">
            Masalas in Your Order #${safe.displayOrderId}
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <!-- Loyalty Reward Voucher Card -->
          <div style="background: #fdfbf7; border: 2px dashed #d4af37; border-radius: 10px; padding: 18px; margin: 24px 0; text-align: center;">
            <div style="font-size: 12px; color: #92400e; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px;">
              🎁 A Token of Royal Gratitude
            </div>
            <div style="font-size: 15px; font-weight: 700; color: #1a2f22; margin-bottom: 6px;">
              Enjoy 10% OFF on Your Next Spice Refill
            </div>
            <p style="font-size: 13px; color: #64748b; margin: 0 0 12px 0;">
              Use this special private coupon at checkout on <a href="https://kabgeermasala.com" style="color: #1a2f22; font-weight: 600;">kabgeermasala.com</a>:
            </p>
            <div style="font-size: 18px; font-weight: 800; font-family: monospace; color: #1a2f22; letter-spacing: 2px; background: #ffffff; padding: 8px 18px; border-radius: 6px; display: inline-block; border: 1px solid #d4af37;">
              KABGEER10
            </div>
          </div>

          <!-- Footer -->
          <div style="margin-top: 32px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
            <p style="margin: 0 0 6px 0;">Need recipes or have a question? Reply directly to this email or write to <a href="mailto:enquiry@kabgeermasala.com" style="color: #1a2f22; font-weight: 600; text-decoration: underline;">enquiry@kabgeermasala.com</a></p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Kabgeer Masale. 100% Pure Lucknavi Heritage.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 7. Customer Email HTML: Custom Admin Message
function renderCustomMessageEmailHtml(order: any, customSubject: string, customMessage: string): string {
  const safe = getSafeOrder(order);
  const formattedBody = (customMessage || '')
    .replace(/\n\n/g, '</p><p style="margin: 0 0 12px 0; line-height: 1.6; color: #334155; font-size: 14px;">')
    .replace(/\n/g, '<br/>');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>${customSubject || `Message Regarding Order #${order.display_order_id}`}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a2f22; background-color: #faf6f0; margin: 0; padding: 24px 12px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid rgba(26, 47, 34, 0.1); box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
        
        <!-- Header -->
        <div style="background-color: #1a2f22; padding: 28px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; letter-spacing: 2px; font-weight: 700; color: #d4af37;">KABGEER MASALE</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #e2e8f0; letter-spacing: 0.5px;">Authentic Lucknowi Spices & Traditional Blends</p>
        </div>
        
        <div style="padding: 28px 24px;">
          <!-- Order Reference Badge -->
          <div style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
            <span style="font-size: 13px; color: #64748b;">
              Order: <strong style="color: #1a2f22; font-family: monospace;">#${safe.displayOrderId}</strong>
            </span>
            <span style="font-size: 12px; color: #94a3b8;">
              Customer: <strong>${safe.customerName}</strong>
            </span>
          </div>

          <!-- Message Body Container -->
          <div style="background: #ffffff; padding: 12px 0 20px 0;">
            <p style="margin: 0 0 12px 0; line-height: 1.6; color: #334155; font-size: 14px;">
              ${formattedBody}
            </p>
          </div>

          <!-- Direct Store Link -->
          <div style="text-align: center; margin: 20px 0 12px 0;">
            <a href="https://kabgeermasala.com" target="_blank" style="display: inline-block; background-color: #1a2f22; color: #d4af37; font-weight: 700; font-size: 13px; padding: 10px 24px; border-radius: 6px; text-decoration: none; border: 1px solid #d4af37;">
              Visit Kabgeer Masale Store →
            </a>
          </div>

          <!-- Footer -->
          <div style="margin-top: 32px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
            <p style="margin: 0 0 6px 0;">Have questions? Reply directly to this email or reach us at <a href="mailto:enquiry@kabgeermasala.com" style="color: #1a2f22; font-weight: 600; text-decoration: underline;">enquiry@kabgeermasala.com</a></p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Kabgeer Masale. 100% Pure Lucknavi Heritage.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// MAIN HANDLER
serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);
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

    // Verify internal service role or administrative caller credentials
    const authResult = await verifyInternalOrAdminCaller(req, supabase);
    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({ error: authResult.errorMessage || 'Unauthorized' }),
        { status: authResult.statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: EmailPayload = await req.json();
    const { orderId, forceResend, emailType, newStatus, awbNumber, courierName, cancellationReason, customSubject, customMessage, reviewLink } = body;

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
    const formattedFrom = isTestingDomain
      ? 'Kabgeer Masale <onboarding@resend.dev>'
      : (rawSenderEmail.includes('<') ? rawSenderEmail : `Kabgeer Masale <${rawSenderEmail}>`);

    // =========================================================================
    // CASE A: Status Update Notification (Shipped, Delivered, Cancelled)
    // =========================================================================
    if (emailType === 'status_update' || (newStatus && ['Shipped', 'Delivered', 'Cancelled'].includes(newStatus))) {
      const statusToProcess = newStatus || order.order_status;
      const isByb = isBybOrder(order, items);
      let subject = `Order Update #${order.display_order_id} — Kabgeer Masale`;
      let emailHtml = '';

      if (statusToProcess === 'Shipped') {
        subject = isByb
          ? `🚚 Shipped! Your Royal Build Your Box #${order.display_order_id} is On The Way`
          : `🚚 Shipped! Your Kabgeer Order #${order.display_order_id} is On The Way`;
        emailHtml = renderShippedEmailHtml(order, items || [], awbNumber, courierName);
      } else if (statusToProcess === 'Delivered') {
        subject = isByb
          ? `🎉 Delivered! Your Royal Build Your Box #${order.display_order_id} Has Arrived`
          : `🎉 Delivered! Your Kabgeer Masale Order #${order.display_order_id} Has Arrived`;
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
    // CASE C: Post-Delivery Review Request Email (emailType === 'review_request')
    // =========================================================================
    if (emailType === 'review_request') {
      const cleanCustomerName = escapeHtml(order.customer_name || 'Food Lover');
      const subject = customSubject ? escapeHtml(customSubject) : `⭐ How did your Awadhi cooking turn out, ${cleanCustomerName}?`;
      const reviewHtml = renderReviewRequestEmailHtml(order, items || [], reviewLink);

      if (reviewHtml && !isSimulationMode) {
        try {
          console.log(`Sending Review Request Email to '${targetCustomerRecipient}'...`);
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
              html: reviewHtml
            })
          });

          const respText = await resendResp.text();
          console.log(`Resend Review Email HTTP ${resendResp.status}:`, respText);
          try { customerResendResult = JSON.parse(respText); } catch (_) { customerResendResult = respText; }

          if (resendResp.ok) {
            customerSent = true;
            await supabase
              .from('orders')
              .update({ review_email_sent_at: new Date().toISOString() })
              .eq('id', order.id);
          } else {
            console.error('Resend Review Email Delivery Error:', respText);
          }
        } catch (e: any) {
          console.error('Resend Review Email Exception:', e);
          customerResendResult = { exception: e?.message };
        }
      } else if (reviewHtml) {
        customerSent = true;
        await supabase
          .from('orders')
          .update({ review_email_sent_at: new Date().toISOString() })
          .eq('id', order.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          emailType: 'review_request',
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
    // CASE D: Custom Admin Message Email (emailType === 'custom_message')
    // =========================================================================
    if (emailType === 'custom_message') {
      const subject = customSubject || `Regarding your Kabgeer Masale Order #${order.display_order_id}`;
      const messageBody = customMessage || 'Thank you for shopping with Kabgeer Masale. We are reaching out regarding your order.';
      const customHtml = renderCustomMessageEmailHtml(order, subject, messageBody);

      if (customHtml && !isSimulationMode) {
        try {
          console.log(`Sending Custom Admin Email to '${targetCustomerRecipient}'...`);
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
              html: customHtml
            })
          });

          const respText = await resendResp.text();
          console.log(`Resend Custom Message HTTP ${resendResp.status}:`, respText);
          try { customerResendResult = JSON.parse(respText); } catch (_) { customerResendResult = respText; }

          if (resendResp.ok) {
            customerSent = true;
            await supabase
              .from('orders')
              .update({ custom_email_sent_at: new Date().toISOString() })
              .eq('id', order.id);
          } else {
            console.error('Resend Custom Message Delivery Error:', respText);
          }
        } catch (e: any) {
          console.error('Resend Custom Message Exception:', e);
          customerResendResult = { exception: e?.message };
        }
      } else if (customHtml) {
        customerSent = true;
        await supabase
          .from('orders')
          .update({ custom_email_sent_at: new Date().toISOString() })
          .eq('id', order.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          emailType: 'custom_message',
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
      const isByb = isBybOrder(order, items);
      const customerHtml = renderCustomerEmailHtml(order, items || []);
      const customerSubject = isByb
        ? `👑 Order Confirmed: Your Royal Build Your Box #${order.display_order_id} (10% OFF + 2 Free Mini Boxes)`
        : `Order Confirmed! #${order.display_order_id} — Kabgeer Masale`;

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
              subject: customerSubject,
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
      const isByb = isBybOrder(order, items);
      const adminHtml = renderAdminEmailHtml(order, items || []);
      const targetAdminRecipient = isTestingDomain ? 'mailtoayusht@gmail.com' : rawAdminEmail;
      const formattedAdminFrom = isTestingDomain
        ? 'Kabgeer System <onboarding@resend.dev>'
        : (rawSenderEmail.includes('<') ? rawSenderEmail : `Kabgeer Alert <${rawSenderEmail}>`);
      const adminSubject = isByb
        ? `🚨 NEW BYB ORDER: #${order.display_order_id} (Pack 2 Free Mini Boxes!) - ₹${Number(order.total_amount).toFixed(2)}`
        : `🚨 NEW PAID ORDER: #${order.display_order_id} (₹${Number(order.total_amount).toFixed(2)})`;

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
              subject: adminSubject,
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
