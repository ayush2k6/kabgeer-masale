import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const OrderSuccessPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const orderId = searchParams.get('id') || `ORD-${Math.floor(Math.random() * 1000000)}`;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container" style={{ padding: '6rem 1.5rem', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'var(--color-white)', padding: '4rem 2rem', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', maxWidth: '600px', width: '100%' }}>
        <CheckCircle size={80} color="#16a34a" style={{ margin: '0 auto 1.5rem auto' }} />
        <h1 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)', marginBottom: '1rem', fontSize: '2.5rem' }}>Order Confirmed!</h1>
        <p style={{ color: 'var(--color-text-light)', fontSize: '1.1rem', marginBottom: '2rem' }}>
          Thank you for your purchase. Your order <strong style={{ color: 'var(--color-primary)' }}>#{orderId}</strong> has been successfully placed.
        </p>
        <p style={{ color: 'var(--color-text-light)', marginBottom: '3rem' }}>
          We will send you a shipping confirmation email as soon as your masalas are freshly ground and shipped.
        </p>
        
        <Link to="/products" className="btn btn-primary btn-large" style={{ padding: '1rem 2rem' }}>
          Continue Shopping
        </Link>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
