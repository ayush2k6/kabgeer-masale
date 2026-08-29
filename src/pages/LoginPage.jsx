import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, Package } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { user, login, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, smart-route immediately
  useEffect(() => {
    if (user) {
      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else {
        const from = location.state?.from?.pathname || '/account';
        navigate(from, { replace: true });
      }
    }
  }, [user, isAdmin, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const loggedInUser = await login(email.trim(), password);
      
      // Database-backed role routing
      if (loggedInUser?.role === 'admin') {
        navigate('/admin');
      } else {
        const from = location.state?.from?.pathname || '/account';
        navigate(from);
      }
    } catch (err) {
      let errorMessage = 'Failed to login. Please check your credentials.';
      const msg = err?.message || '';
      if (err?.code === 'auth/user-not-found' || msg.includes('Invalid login credentials') || msg.includes('Invalid credentials')) {
        errorMessage = 'Invalid email or password.';
      } else if (err?.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (err?.code === 'auth/too-many-requests' || msg.includes('Email rate limit exceeded')) {
        errorMessage = 'Too many failed attempts. Try again later.';
      } else {
        errorMessage = `Failed to login: ${err?.message || 'Unknown error'}`;
      }
      console.error(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', backgroundColor: 'var(--color-bg)' }}>
      {/* Left Side: Image/Branding */}
      <div style={{
        flex: 1,
        backgroundImage: `linear-gradient(rgba(15, 40, 24, 0.7), rgba(15, 40, 24, 0.8)), url('/spice-bg.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '4rem',
        flexDirection: 'column',
        justifyContent: 'center',
        color: 'white'
      }} className="desktop-only-flex">
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '3.2rem', marginBottom: '1.5rem', lineHeight: '1.15', color: 'white', fontWeight: '700' }}>
          Welcome back to <span style={{ color: 'var(--color-accent-light)' }}>Kabgeer</span>.
        </h1>
        <p style={{ fontSize: '1.15rem', opacity: 0.9, maxWidth: '80%', lineHeight: '1.6', fontFamily: 'var(--font-body)' }}>
          Experience the authentic taste of tradition. Sign in to track your orders, manage your profile, and explore our premium selection of aromatic spices.
        </p>
      </div>

      {/* Right Side: Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        backgroundColor: 'var(--color-white)'
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--color-primary)', fontWeight: '700' }}>Sign In</h2>
          <p style={{ color: 'var(--color-text-light)', marginBottom: '2.5rem', fontFamily: 'var(--font-body)' }}>Please enter your details to continue.</p>

          {error && (
            <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid #fca5a5' }}>
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-primary)' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  placeholder="name@example.com"
                  style={{ 
                    width: '100%', padding: '0.85rem 1rem 0.85rem 2.8rem', 
                    border: '1px solid var(--color-border)', borderRadius: '8px',
                    fontFamily: 'var(--font-body)', fontSize: '0.95rem',
                    transition: 'all 0.3s ease', outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-primary)' }}>Password</label>
                <a href="#" onClick={(e) => { e.preventDefault(); alert('Reset link sent to your email.'); }} style={{ fontSize: '0.85rem', color: 'var(--color-accent)', fontWeight: '600', textDecoration: 'none' }}>Forgot password?</a>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  placeholder="••••••••"
                  style={{ 
                    width: '100%', padding: '0.85rem 1rem 0.85rem 2.8rem', 
                    border: '1px solid var(--color-border)', borderRadius: '8px',
                    fontFamily: 'var(--font-body)', fontSize: '0.95rem',
                    transition: 'all 0.3s ease', outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.95rem', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>

          {/* Secondary Action: Browse Products */}
          <div style={{ marginTop: '1rem' }}>
            <Link 
              to="/products" 
              style={{ 
                width: '100%', 
                padding: '0.85rem', 
                borderRadius: '8px', 
                fontSize: '0.92rem', 
                fontWeight: '600', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '0.5rem', 
                textDecoration: 'none',
                color: 'var(--color-primary)',
                backgroundColor: 'rgba(26, 47, 34, 0.04)',
                border: '1px solid rgba(26, 47, 34, 0.12)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(26, 47, 34, 0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(26, 47, 34, 0.04)'}
            >
              <Package size={17} /> Browse Products
            </Link>
          </div>
          
          <p style={{ textAlign: 'center', marginTop: '2.25rem', color: 'var(--color-text-light)', fontSize: '0.95rem', fontFamily: 'var(--font-body)' }}>
            Don't have an account? <Link to="/signup" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'underline', textUnderlineOffset: '4px' }}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
