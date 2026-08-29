import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Package, MapPin, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import './OrderSuccessPage.css';

const OrderSuccessPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const orderParam = searchParams.get('id') || searchParams.get('orderId') || '';
  
  const [order, setOrder] = useState(null);

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
          setOrder(data);
        }
      } catch (err) {
        console.error('Error fetching order details:', err);
      }
    };

    fetchOrderDetails();
  }, [orderParam]);

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
      return { date: 'Recently', time: '' };
    }
  };

  const { date, time } = formatISTDateTime(order?.created_at);

  return (
    <div className="order-success-page-wrapper">
      <div className="order-success-container">
        
        {/* Main Confirmation Card */}
        <div className="order-success-card">
          
          {/* Animated Success Badge */}
          <div className="order-success-badge">
            <CheckCircle2 size={36} strokeWidth={2.4} />
          </div>

          <span className="order-success-tag">
            Order Confirmed
          </span>

          <h1 className="order-success-title">
            Thank you for your order!
          </h1>

          <p className="order-success-subtitle">
            Your authentic Lucknavi spices are being prepared with care and fresh aroma.
          </p>

          {/* Quick Info Grid */}
          <div className="order-quick-info-grid">
            <div className="order-quick-info-cell">
              <span className="order-quick-info-label">Order ID</span>
              <strong className="order-quick-info-val" style={{ fontFamily: 'monospace' }}>
                {order?.display_order_id || orderParam || 'KBG-PENDING'}
              </strong>
            </div>

            <div className="order-quick-info-cell">
              <span className="order-quick-info-label">Placed On</span>
              <strong className="order-quick-info-val">
                {date} {time ? `• ${time}` : ''}
              </strong>
            </div>

            <div className="order-quick-info-cell">
              <span className="order-quick-info-label">Total Paid</span>
              <strong className="order-quick-info-val total">
                ₹{Number(order?.total_amount || 0).toFixed(2)}
              </strong>
            </div>

            <div className="order-quick-info-cell">
              <span className="order-quick-info-label">Fulfillment Status</span>
              <span className="order-status-badge-confirmed">
                {order?.order_status || 'Confirmed'}
              </span>
            </div>
          </div>

          {/* Itemized Products Preview */}
          {order?.order_items && order.order_items.length > 0 && (
            <div className="order-items-preview-box">
              <h4 className="order-items-preview-title">
                Ordered Spices ({order.order_items.length})
              </h4>
              <div className="order-items-preview-list">
                {order.order_items.map((item, idx) => (
                  <div key={idx} className="order-item-preview-row">
                    <div className="order-item-preview-left">
                      <Package size={15} color="#d4af37" style={{ flexShrink: 0 }} />
                      <span className="order-item-preview-name">
                        <strong>{item.product_name || 'Authentic Masala'}</strong> {item.weight_pack ? `(${item.weight_pack})` : ''} × {item.quantity}
                      </span>
                    </div>
                    <span className="order-item-preview-price">
                      ₹{Number(item.line_total || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shipping Address Preview */}
          {order?.shipping_address && (
            <div className="order-shipping-preview-box">
              <div className="order-shipping-preview-header">
                <MapPin size={15} color="#d4af37" /> Delivery Destination:
              </div>
              <p className="order-shipping-preview-text">
                <strong>{order.customer_name}</strong> • {order.customer_phone}<br />
                {order.shipping_address.address}
                {order.shipping_address.apartment ? `, ${order.shipping_address.apartment}` : ''}, {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pinCode}
              </p>
            </div>
          )}

          {/* Action CTAs */}
          <div className="order-success-actions">
            <Link 
              to="/products" 
              className="btn-order-continue"
            >
              <ShoppingBag size={17} /> Continue Shopping
            </Link>

            <Link 
              to="/account" 
              className="btn-order-account"
            >
              View Order History in Account <ArrowRight size={15} />
            </Link>
          </div>

          <div className="order-guarantee-note">
            <ShieldCheck size={14} color="#16a34a" /> Authentic Kabgeer Guarantee • 100% Pure Lucknavi Spices
          </div>

        </div>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
