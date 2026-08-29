import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import './AdminLoginPage.css';

const AdminLoginPage = () => {
  const { user, login, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user is already authenticated as an admin, redirect straight to /admin
  if (user && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      // login will update user and isAdmin in context; navigation happens via render or hook
      navigate('/admin');
    } catch (err) {
      console.error('Admin login error:', err);
      setErrorMessage(err.message || 'Invalid administrator email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-card">
        <div className="admin-badge-header">
          <ShieldCheck size={14} color="#16a34a" /> Administrator Portal
        </div>

        <h1>Admin Sign In</h1>
        <p>Sign in with your authorized admin credentials to manage orders.</p>

        {errorMessage && (
          <div className="admin-error-box">
            {errorMessage}
          </div>
        )}

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <div className="admin-input-group">
            <label htmlFor="admin-email">Email Address</label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@kabgeerji.com"
              autoComplete="username"
            />
          </div>

          <div className="admin-input-group">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn-admin-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Authenticating...
              </>
            ) : (
              <>
                <Lock size={16} /> Sign In to Dashboard
              </>
            )}
          </button>
        </form>

        <div className="admin-login-footer">
          <Link to="/">
            <ArrowLeft size={14} /> Return to Store
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
