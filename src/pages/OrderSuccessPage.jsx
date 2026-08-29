import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Package, MapPin, Clock, ArrowRight, ShoppingBag, ShieldCheck, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const OrderSuccessPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const orderParam = searchParams.get('id') || searchParams.get('orderId') || '';
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchOrderDetails = async () => {
      if (!orderParam) {
        setLoading(false);
        return;
      }

      try {
        // Fetch order and order items from Supabase
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
      } finally {
        setLoading(false);
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
    <div style={{ backgroundColor: 'var(--color-bg, #FAF6F0)', minHeight: '80vh', padding: '3.5rem 1rem 5rem' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
        
        {/* Main Confirmation Card */}
        <div style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: '16px', 
          padding: '2.5rem 2rem', 
          boxShadow: '0 12px 36px rgba(26, 47, 34, 0.08)',
          border: '1px solid rgba(26, 47, 34, 0.08)',
          textAlign: 'center'
        }}>
          
          {/* Animated Success Badge */}
          <div style={{ 
            width: '72px', 
            height: '72px', 
            borderRadius: '50%', 
            backgroundColor: '#f0fdf4', 
            color: '#16a34a', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            border: '2px solid #bbf7d0',
            boxShadow: '0 4px 16px rgba(22, 163, 74, 0.15)'
          }}>
            <CheckCircle2 size={42} strokeWidth={2.2} />
          </div>

          <span style={{ 
            display: 'inline-block', 
            fontSize: '0.78rem', 
            fontWeight: '700', 
            letterSpacing: '1px', 
            textTransform: 'uppercase', 
            color: 'var(--color-accent, #D4AF37)', 
            marginBottom: '0.4rem',
            fontFamily: 'var(--font-body)'
          }}>
            Order Confirmed
          </span>

          <h1 style={{ 
            fontFamily: 'var(--font-heading)', 
            fontSize: '2rem', 
            fontWeight: '700', 
            color: 'var(--color-primary, #1A2F22)', 
            margin: '0 0 0.5rem',
            lineHeight: 1.2
          }}>
            Thank you for your order!
          </h1>

          <p style={{ 
            color: 'var(--color-text-light, #6E6E6E)', 
            fontSize: '0.95rem', 
            margin: '0 0 1.75rem',
            fontFamily: 'var(--font-body)',
            lineHeight: 1.5
          }}>
            Your authentic Lucknavi spices are being prepared with care and fresh aroma.
          </p>

          {/* Quick Info Bar */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
            gap: '0.75rem', 
            backgroundColor: 'var(--color-bg, #FAF6F0)', 
            padding: '1rem', 
            borderRadius: '10px',
            marginBottom: '1.75rem',
            textAlign: 'left'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Order ID</span>
              <strong style={{ fontSize: '0.92rem', color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                {order?.display_order_id || orderParam || 'KBG-PENDING'}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Placed On</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--color-primary)', fontFamily: 'var(--font-body)' }}>
                {date} {time ? `• ${time}` : ''}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Total Paid</span>
              <strong style={{ fontSize: '0.95rem', color: '#16a34a', fontWeight: 700, fontFamily: 'var(--font-body)' }}>
                ₹{Number(order?.total_amount || 0).toFixed(2)}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Fulfillment Status</span>
              <span style={{ 
                display: 'inline-block', 
                fontSize: '0.75rem', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                backgroundColor: '#dcfce7', 
                color: '#16a34a', 
                fontWeight: 700,
                marginTop: '2px'
              }}>
                {order?.order_status || 'Confirmed'}
              </span>
            </div>
          </div>

          {/* Itemized Products Preview if available */}
          {order?.order_items && order.order_items.length > 0 && (
            <div style={{ textAlign: 'left', marginBottom: '1.75rem', borderTop: '1px solid rgba(26, 47, 34, 0.08)', paddingTop: '1.25rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Ordered Spices ({order.order_items.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {order.order_items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', padding: '0.4rem 0', borderBottom: '1px dashed #f0f0f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Package size={16} color="var(--color-accent)" />
                      <span><strong>{item.product_name || 'Authentic Masala'}</strong> {item.weight_pack ? `(${item.weight_pack})` : ''} × {item.quantity}</span>
                    </div>
                    <strong style={{ color: 'var(--color-primary)' }}>₹{Number(item.line_total || 0).toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shipping Address Preview */}
          {order?.shipping_address && (
            <div style={{ textAlign: 'left', marginBottom: '1.75rem', backgroundColor: '#fdfbf7', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                <MapPin size={16} color="var(--color-accent)" /> Delivery Destination:
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#555', lineHeight: 1.4 }}>
                <strong>{order.customer_name}</strong> • {order.customer_phone}<br />
                {order.shipping_address.address}
                {order.shipping_address.apartment ? `, ${order.shipping_address.apartment}` : ''}, {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pinCode}
              </p>
            </div>
          )}

          {/* Action CTAs */}
          <div style={{ display: 'flex', gap: '0.85rem', flexDirection: 'column' }}>
            <Link 
              to="/products" 
              className="btn btn-primary" 
              style={{ 
                width: '100%', 
                padding: '0.95rem', 
                borderRadius: '8px', 
                fontSize: '0.95rem', 
                fontWeight: '600', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.5rem',
                textDecoration: 'none'
              }}
            >
              <ShoppingBag size={18} /> Continue Shopping
            </Link>

            <Link 
              to="/account" 
              style={{ 
                width: '100%', 
                padding: '0.85rem', 
                borderRadius: '8px', 
                fontSize: '0.9rem', 
                fontWeight: '600', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.5rem',
                textDecoration: 'none',
                color: 'var(--color-primary)',
                backgroundColor: 'transparent',
                border: '1px solid rgba(26, 47, 34, 0.15)'
              }}
            >
              View Order History in Account <ArrowRight size={16} />
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '1.5rem', fontSize: '0.78rem', color: '#888' }}>
            <ShieldCheck size={14} color="#16a34a" /> Authentic Kabgeer Guarantee • 100% Pure Lucknavi Spices
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
