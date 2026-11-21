import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  CheckCircle2, 
  Package, 
  MapPin, 
  ArrowRight, 
  ShoppingBag, 
  ShieldCheck, 
  Gift, 
  Copy, 
  Check, 
  Printer, 
  ReceiptText, 
  Truck, 
  Sparkles,
  MessageCircle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import './OrderSuccessPage.css';

const OrderSuccessPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const orderParam = searchParams.get('id') || searchParams.get('orderId') || '';
  
  const [copied, setCopied] = useState(false);

  const [order, setOrder] = useState(() => {
    // 1. Direct navigation state from checkout
    if (location.state && (
      location.state.displayOrderId === orderParam ||
      location.state.display_order_id === orderParam ||
      location.state.orderId === orderParam ||
      location.state.id === orderParam ||
      !orderParam
    )) {
      return location.state;
    }
    // 2. Specific session cache by orderParam
    if (orderParam) {
      try {
        const cached = sessionStorage.getItem(`kbg_order_${orderParam}`);
        if (cached) return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
    // 3. Fallback to latest stored order in session
    try {
      const last = sessionStorage.getItem('kbg_last_order');
      if (last) {
        const parsed = JSON.parse(last);
        if (!orderParam || parsed.displayOrderId === orderParam || parsed.display_order_id === orderParam) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }

    // 4. Instant Visual Inspection / Preview Mode
    if (orderParam === 'preview' || orderParam === 'demo' || searchParams.get('preview') === 'true') {
      return {
        display_order_id: 'KBG-849201',
        displayOrderId: 'KBG-849201',
        created_at: new Date().toISOString(),
        customer_name: 'Ayush Sharma',
        customerName: 'Ayush Sharma',
        customer_email: 'ayush@kabgeerji.com',
        customer_phone: '+91 80900 86636',
        customerPhone: '+91 80900 86636',
        total_amount: 540,
        subtotal: 490,
        discount: 0,
        shipping: 50,
        shipping_fee: 50,
        is_bundle: false,
        shipping_address: {
          name: 'Ayush Sharma',
          address: 'Plot 42, Gomti Nagar Heritage Enclave',
          apartment: 'Near Taj Hotel',
          city: 'Lucknow',
          state: 'Uttar Pradesh',
          pinCode: '226010',
          phone: '+91 80900 86636',
          email: 'ayush@kabgeerji.com'
        },
        order_items: [
          {
            product_name: 'Shahi Garam Masala',
            weight_pack: '100g',
            quantity: 2,
            unit_price: 160,
            total_price: 320
          },
          {
            product_name: 'Awadhi Biryani Masala',
            weight_pack: '100g',
            quantity: 1,
            unit_price: 170,
            total_price: 170
          }
        ]
      };
    }

    return null;
  });

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchOrderDetails = async () => {
      if (!orderParam) {
        return;
      }

      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderParam);
        let query = supabase.from('orders').select('*, order_items(*)');
        
        if (isUuid) {
          query = query.eq('id', orderParam);
        } else {
          query = query.eq('display_order_id', orderParam);
        }

        const { data, error } = await query.maybeSingle();
        if (!error && data) {
          setOrder(prev => ({ ...(prev || {}), ...data }));
        }
      } catch (err) {
        console.error('Error fetching order details:', err);
      }
    };

    fetchOrderDetails();
  }, [orderParam]);

  const handleCopyOrderId = (id) => {
    if (!id) return;
    try {
      navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatISTDateTime = (isoString) => {
    if (!isoString) return { date: 'Today', time: '' };
    try {
      const d = new Date(isoString);
      const dateStr = d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
      const timeStr = d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      });
      return { date: dateStr, time: timeStr };
    } catch {
      return { date: 'Today', time: '' };
    }
  };

  const { date, time } = formatISTDateTime(order?.created_at);

  // Line items and quantities
  const orderItems = order?.order_items || [];
  const totalItemCount = orderItems.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);

  // Authoritative item subtotal computation
  const itemsSubtotal = orderItems.reduce((acc, it) => {
    const qty = Number(it.quantity) || 1;
    const lineTotal = Number(
      it.total_price ??
      it.line_total ??
      (it.unit_price ? Number(it.unit_price) * qty : 0)
    );
    return acc + lineTotal;
  }, 0);

  // BYB classification
  const displayOrderId = order?.display_order_id || order?.displayOrderId || orderParam || 'KBG-PENDING';
  const isByb = Boolean(
    displayOrderId.startsWith('BYB') ||
    displayOrderId.includes('BYB') ||
    order?.is_bundle ||
    totalItemCount >= 4
  );

  // Mathematical pricing recovery
  const subtotal = Number(order?.subtotal ?? order?.subtotal_amount ?? itemsSubtotal);
  const discount = Number(
    order?.discount ?? 
    order?.discount_amount ?? 
    (isByb && subtotal > 0 ? Math.round(subtotal * 0.10 * 100) / 100 : 0)
  );
  const shippingFee = Number(
    order?.shipping ?? 
    order?.shipping_fee ?? 
    order?.shipping_amount ?? 
    (subtotal > 0 ? 50 : 0)
  );

  // Total paid amount: never show 0 if items were ordered
  const rawTotal = Number(order?.total_amount ?? order?.totalAmount ?? order?.total ?? 0);
  const totalPaid = rawTotal > 0 ? rawTotal : Math.max(0, subtotal - discount + shippingFee);

  // Customer metadata resolution & personal name extraction
  const rawCustomerName = (
    order?.customer_name ||
    order?.customerName ||
    order?.shipping_address?.name ||
    order?.shipping_address?.customer_name ||
    ''
  ).trim();

  // Extract personal/first name if available (e.g. "Ayush" from "Ayush Sharma")
  const customerFirstName = (rawCustomerName && rawCustomerName.toLowerCase() !== 'valued patron')
    ? rawCustomerName.split(/\s+/)[0]
    : '';

  const customerName = rawCustomerName || 'Valued Patron';

  const customerPhone = 
    order?.customer_phone ||
    order?.customerPhone ||
    order?.shipping_address?.phone ||
    '';

  const customerEmail = 
    order?.customer_email ||
    order?.customerEmail ||
    order?.shipping_address?.email ||
    '';

  // Shipping address breakdown
  const addr = order?.shipping_address || {};
  const addressLine1 = addr.address || addr.addressLine1 || '';
  const addressLine2 = addr.apartment || addr.apartmentSuite || addr.landmark || '';
  const city = addr.city || '';
  const state = addr.state || '';
  const pinCode = addr.pinCode || addr.pincode || addr.postalCode || '';

  return (
    <div className="order-success-page-wrapper">
      <div className="order-success-container">
        
        {/* Main Confirmation Card */}
        <div className="order-success-card">
          
          {/* Animated Success Badge */}
          <div className="order-success-badge-wrap">
            <div className="order-success-badge">
              <CheckCircle2 size={38} strokeWidth={2.4} />
            </div>
          </div>

          <div className="order-success-status-pill">
            <Sparkles size={13} className="text-gold" />
            <span>
              {customerFirstName 
                ? `ORDER CONFIRMED FOR ${customerFirstName.toUpperCase()}` 
                : 'ORDER CONFIRMED & SECURED'}
            </span>
          </div>

          {/* MAIN HEADING ONLY: Uses Serif Font with Customer Name */}
          <h1 className="order-success-title">
            Thank you for your order{customerFirstName ? `, ${customerFirstName}` : ''}!
          </h1>

          {/* SUBTITLE: Sans-Serif */}
          <p className="order-success-subtitle">
            {isByb
              ? `Hi ${customerFirstName || customerName}, your custom Build Your Box is being hand-packed with authentic Lucknavi spice blends and complimentary gifts.`
              : `Hi ${customerFirstName || customerName}, your authentic Lucknavi spices are being carefully prepared with fresh aroma at our heritage spice house.`}
          </p>

          {/* Quick Metric Bar */}
          <div className="order-quick-metric-bar">
            {/* Metric 1: Order ID */}
            <div className="order-metric-cell">
              <span className="metric-label">
                ORDER ID {customerFirstName ? `• ${customerFirstName.toUpperCase()}` : ''}
              </span>
              <div className="metric-val-with-copy">
                <span className="metric-code">{displayOrderId}</span>
                <button 
                  type="button" 
                  onClick={() => handleCopyOrderId(displayOrderId)} 
                  className="btn-metric-copy"
                  title="Copy Order ID"
                >
                  {copied ? <Check size={12} className="text-emerald" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Metric 2: Placed On */}
            <div className="order-metric-cell">
              <span className="metric-label">PLACED ON</span>
              <span className="metric-value">
                {date} {time ? `• ${time}` : ''}
              </span>
            </div>

            {/* Metric 3: Payment Status */}
            <div className="order-metric-cell">
              <span className="metric-label">PAYMENT STATUS</span>
              <span className="metric-paid-badge">
                <Check size={12} strokeWidth={3} /> Paid via Razorpay
              </span>
            </div>

            {/* Metric 4: TOTAL PAID (Prominently Highlighted) */}
            <div className="order-metric-cell highlight-total">
              <span className="metric-label">TOTAL PAID</span>
              <span className="metric-total-amount">
                ₹{totalPaid.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Visual Order Fulfillment Stepper */}
          <div className="order-progress-stepper">
            <div className="stepper-step completed">
              <div className="step-icon-wrap">
                <Check size={14} strokeWidth={2.8} />
              </div>
              <div className="step-text-wrap">
                <span className="step-title">Order Confirmed</span>
                <span className="step-desc">Payment Verified</span>
              </div>
            </div>
            <div className="stepper-divider active" />
            <div className="stepper-step in-progress">
              <div className="step-icon-wrap">
                <Package size={14} />
              </div>
              <div className="step-text-wrap">
                <span className="step-title">Hand-Packing</span>
                <span className="step-desc">Lucknow Facility</span>
              </div>
            </div>
            <div className="stepper-divider" />
            <div className="stepper-step upcoming">
              <div className="step-icon-wrap">
                <Truck size={14} />
              </div>
              <div className="step-text-wrap">
                <span className="step-title">Express Dispatch</span>
                <span className="step-desc">Trackon Courier</span>
              </div>
            </div>
          </div>

          {/* Celebratory BYB Confirmation Banner */}
          {isByb && (
            <div className="order-byb-celebration-banner">
              <div className="byb-banner-badge-row">
                <span className="byb-royal-badge">
                  <Sparkles size={12} /> ROYAL BUILD YOUR BOX (BYB)
                </span>
                <span className="byb-perk-pill">
                  ✓ 10% SAVINGS APPLIED
                </span>
                <span className="byb-perk-pill gift-pill">
                  🎁 2 FREE MINI BOXES
                </span>
              </div>
              <p className="byb-banner-description">
                Your order is confirmed as a <strong>Curated Build Your Box (BYB)</strong> package! Your shipment includes an automatic <strong>10% savings</strong> and <strong>2 Complimentary Chef's Mini Masala Sample Boxes</strong> hand-packed into your delivery.
              </p>
            </div>
          )}

          {/* Itemized Contents Preview */}
          {orderItems.length > 0 && (
            <div className="order-items-manifest-card">
              <div className="manifest-card-header">
                <Package size={16} className="text-gold" />
                <h3 className="manifest-title">
                  What’s in your package ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})
                </h3>
              </div>

              <div className="manifest-items-list">
                {orderItems.map((item, idx) => {
                  const itemTotal = Number(
                    item.total_price ?? 
                    item.line_total ?? 
                    (item.unit_price ? Number(item.unit_price) * Number(item.quantity || 1) : 0)
                  );
                  return (
                    <div key={idx} className="manifest-item-row">
                      <div className="manifest-item-left">
                        <div className="manifest-item-icon-box">
                          <Package size={15} />
                        </div>
                        <div className="manifest-item-info">
                          <div className="manifest-item-name-line">
                            <span className="manifest-item-name">{item.product_name || 'Authentic Spice Blend'}</span>
                            {item.weight_pack && (
                              <span className="manifest-item-weight">({item.weight_pack})</span>
                            )}
                            <span className="manifest-item-qty-pill">Qty: {item.quantity}</span>
                            {isByb && (
                              <span className="manifest-byb-tag">Curated Box Item</span>
                            )}
                          </div>
                          {item.unit_price && (
                            <span className="manifest-unit-rate">₹{Number(item.unit_price).toFixed(2)} each</span>
                          )}
                        </div>
                      </div>
                      <span className="manifest-item-price">
                        ₹{itemTotal.toFixed(2)}
                      </span>
                    </div>
                  );
                })}

                {/* Complimentary 2x Mini Boxes Gift Row */}
                {isByb && (
                  <div className="manifest-item-row complimentary-gift-row">
                    <div className="manifest-item-left">
                      <div className="manifest-item-icon-box gift-icon-box">
                        <Gift size={16} />
                      </div>
                      <div className="manifest-item-info">
                        <div className="manifest-item-name-line">
                          <span className="manifest-item-name gift-name">2x Mini Masala Boxes (Sample Pack)</span>
                          <span className="manifest-gift-badge">FREE COMPLIMENTARY GIFT</span>
                        </div>
                        <span className="manifest-gift-hint">Hand-picked Chef's trial blends included with every BYB package</span>
                      </div>
                    </div>
                    <span className="manifest-gift-free-price">
                      FREE (₹0.00)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Complete Financial Breakdown Card */}
          <div className="order-financial-summary-card">
            <div className="financial-summary-header">
              <ReceiptText size={16} className="text-forest" />
              <h3 className="financial-summary-title">Payment & Billing Summary</h3>
              <span className="financial-paid-tag">✓ Fully Paid</span>
            </div>

            <div className="financial-summary-body">
              <div className="financial-row">
                <span className="fin-label">Items Subtotal</span>
                <span className="fin-val">₹{subtotal.toFixed(2)}</span>
              </div>

              {discount > 0 && (
                <div className="financial-row discount-row">
                  <span className="fin-label">
                    {isByb ? 'Build Your Box 10% Bundle Discount' : 'Promotional Discount'}
                  </span>
                  <span className="fin-val text-emerald">-₹{discount.toFixed(2)}</span>
                </div>
              )}

              <div className="financial-row">
                <span className="fin-label">Trackon Express Delivery</span>
                <span className="fin-val">
                  {shippingFee === 0 ? <strong className="text-emerald">FREE</strong> : `₹${shippingFee.toFixed(2)}`}
                </span>
              </div>

              <div className="financial-divider" />

              <div className="financial-row grand-total-row">
                <div className="fin-total-labels">
                  <span className="fin-total-title">Total Amount Paid</span>
                  <span className="fin-tax-note">Inclusive of 5% GST and all statutory levies</span>
                </div>
                <div className="fin-total-values">
                  <span className="fin-grand-price">₹{totalPaid.toFixed(2)}</span>
                  <span className="fin-status-pill">✓ PAID IN FULL</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping & Delivery Destination Card */}
          {(addressLine1 || city || state) && (
            <div className="order-delivery-card">
              <div className="delivery-card-header">
                <div className="delivery-title-left">
                  <MapPin size={16} className="text-gold" />
                  <h3 className="delivery-card-title">Delivery Destination</h3>
                </div>
                <span className="delivery-courier-pill">
                  <Truck size={12} /> Trackon Express Courier
                </span>
              </div>

              <div className="delivery-details-body">
                <div className="delivery-recipient-row">
                  <strong className="recipient-name">{customerName}</strong>
                  {customerPhone && <span className="recipient-phone">• {customerPhone}</span>}
                  {customerEmail && <span className="recipient-email">• {customerEmail}</span>}
                </div>

                <p className="delivery-address-lines">
                  {addressLine1}
                  {addressLine2 ? `, ${addressLine2}` : ''}
                  <br />
                  {city}{state ? `, ${state}` : ''} {pinCode ? `— ${pinCode}` : ''}
                </p>

                <div className="delivery-dispatch-estimate">
                  <span className="dispatch-dot" />
                  <span><strong>Fulfillment Timeline:</strong> Dispatches within 24–48 hours from Lucknow heritage facility. Tracking updates will be delivered via SMS/Email.</span>
                </div>
              </div>
            </div>
          )}

          {/* Action CTAs */}
          <div className="order-actions-container">
            <a 
              href={`https://wa.me/918090086636?text=${encodeURIComponent(`Hi Kabgeer team, I just placed order #${displayOrderId}${customerFirstName ? ` under the name ${customerFirstName}` : ''}. Please share my tracking and delivery updates here!`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-order-whatsapp"
            >
              <MessageCircle size={18} /> Get Live Updates on WhatsApp
            </a>

            <Link 
              to="/products" 
              className="btn-order-primary"
            >
              <ShoppingBag size={17} /> Continue Exploring Masalas
            </Link>

            <button 
              type="button" 
              onClick={handlePrint}
              className="btn-order-secondary"
            >
              <Printer size={16} /> Print / Save Order Receipt
            </button>

            <Link 
              to="/" 
              className="btn-order-tertiary"
            >
              Return to Home Page <ArrowRight size={14} />
            </Link>
          </div>

          {/* Trust & Assistance Guarantee */}
          <div className="order-trust-footer">
            <div className="trust-seal-row">
              <ShieldCheck size={16} className="text-emerald" />
              <span>100% Authentic Awadhi Heritage Blends • Pure & Natural • Direct from Lucknow</span>
            </div>
            <p className="support-contact-note">
              Need assistance with your order? Reach our customer care team at{' '}
              <a href="mailto:enquiry@kabgeermasala.com">enquiry@kabgeermasala.com</a> or WhatsApp{' '}
              <a href="tel:+918090086636">+91 80900 86636</a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OrderSuccessPage;