import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--color-primary)' }}>
        <p style={{ fontWeight: 600 }}>Verifying administrator credentials...</p>
      </div>
    );
  }

  // 1. Not logged in -> Redirect to standard login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Logged in, but not an admin -> Access Denied screen
  if (!isAdmin) {
    return (
      <div style={{ 
        minHeight: '70vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '2rem 1rem',
        backgroundColor: 'var(--color-bg, #FAF6F0)' 
      }}>
        <div style={{ 
          maxWidth: '460px', 
          width: '100%', 
          backgroundColor: '#ffffff', 
          borderRadius: '14px', 
          padding: '2.5rem 2rem', 
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          border: '1px solid #fee2e2'
        }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            backgroundColor: '#fef2f2', 
            color: '#dc2626', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 1.25rem auto' 
          }}>
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Access Restricted
          </h2>
          <p style={{ color: 'var(--color-text-light)', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: '1.75rem' }}>
            Your account (<strong>{user.email}</strong>) does not have administrator authorization to access this portal.
          </p>
          <Link 
            to="/" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              backgroundColor: 'var(--color-primary, #1A2F22)', 
              color: '#ffffff', 
              padding: '0.75rem 1.5rem', 
              borderRadius: '8px', 
              fontWeight: 600, 
              fontSize: '0.9rem', 
              textDecoration: 'none' 
            }}
          >
            <ArrowLeft size={16} /> Return to Store
          </Link>
        </div>
      </div>
    );
  }

  // 3. Authenticated Admin -> Render dashboard
  return children;
};

export default AdminRoute;
