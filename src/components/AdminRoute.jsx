import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * AdminRoute Guard
 * Stealth Protection: Unauthorized visitors or unauthenticated sessions attempting
 * to access administrative routes are immediately and silently redirected to the Home page ('/').
 */
const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--color-primary)' }}>
        <p style={{ fontWeight: 600 }}>Verifying credentials...</p>
      </div>
    );
  }

  // Not logged in or not an admin -> Silently redirect to Home ('/')
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;
