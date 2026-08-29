import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, ArrowRight } from 'lucide-react';

const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await register(name, email, password);
      navigate('/profile');
    } catch (err) {
      let errorMessage = 'Failed to create account.';
      const msg = err?.message || '';
      if (err?.code === 'auth/email-already-in-use' || msg.includes('already registered') || msg.includes('User already exists')) {
        errorMessage = 'This email is already registered.';
      } else if (err?.code === 'auth/invalid-email' || msg.includes('invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (err?.code === 'auth/weak-password' || msg.includes('at least 6 characters') || msg.includes('Password should be')) {
        errorMessage = 'Password should be at least 6 characters.';
      } else {
        errorMessage = `Failed to create account: ${err?.message || 'Unknown error'}`;
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
          Join the <span style={{ color: 'var(--color-accent-light)' }}>Kabgeer</span> Family.
        </h1>
        <p style={{ fontSize: '1.15rem', opacity: 0.9, maxWidth: '80%', lineHeight: '1.6', fontFamily: 'var(--font-body)' }}>
          Create an account to build your custom spice bundles, manage orders, and discover the true essence of Indian culinary traditions.
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
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--color-primary)', fontWeight: '700' }}>Create Account</h2>
          <p style={{ color: 'var(--color-text-light)', marginBottom: '2.25rem', fontFamily: 'var(--font-body)' }}>Start your flavorful journey with us.</p>
          
          {error && (
            <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid #fca5a5' }}>
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-primary)' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  placeholder="John Doe"
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

            <div style={{ marginBottom: '1.25rem' }}>
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
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-primary)' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  placeholder="At least 6 characters"
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
              {isLoading ? 'Creating Account...' : 'Create Account'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>
          
          <p style={{ textAlign: 'center', marginTop: '2.25rem', color: 'var(--color-text-light)', fontSize: '0.95rem', fontFamily: 'var(--font-body)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'underline', textUnderlineOffset: '4px' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
