import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowLeft, 
  Loader2, 
  Eye, 
  EyeOff, 
  AlertCircle 
} from 'lucide-react';
import logo from '../assets/logo.png';
import './AdminLoginPage.css';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 30;

const AdminLoginPage = () => {
  const { user, login, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Security: Brute-force lockout state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Countdown timer for brute-force mitigation
  useEffect(() => {
    let timer = null;
    if (lockoutTimer > 0) {
      timer = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [lockoutTimer]);

  // If user is already authenticated as an admin, redirect straight to /admin
  if (user && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const isLockedOut = lockoutTimer > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLockedOut) return;

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      // Reset failed attempts on success
      setFailedAttempts(0);
      navigate('/admin');
    } catch (err) {
      console.error('Admin login authentication error:', err);
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);

      if (nextFailures >= MAX_FAILED_ATTEMPTS) {
        setLockoutTimer(LOCKOUT_DURATION_SECONDS);
        setErrorMessage(
          `Security lockout: Too many consecutive failed attempts. Please wait ${LOCKOUT_DURATION_SECONDS} seconds before retrying.`
        );
      } else {
        const remaining = MAX_FAILED_ATTEMPTS - nextFailures;
        setErrorMessage(
          err.message || `Invalid administrator credentials. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-card">
        {/* Brand Identity */}
        <div className="admin-brand-header">
          <Link to="/" className="admin-brand-logo-link" title="Return to Kabgeer Masale">
            <img src={logo} alt="Kabgeer Masale" className="admin-brand-logo" />
          </Link>
          <div className="admin-badge-header">
            <ShieldCheck size={13} className="admin-shield-icon" />
            <span>SECURE ADMINISTRATOR PORTAL</span>
          </div>
        </div>

        <h1 className="admin-login-title">Admin Sign In</h1>
        <p className="admin-login-subtitle">
          Authorized access for store operations, inventory & order fulfillment.
        </p>

        {errorMessage && (
          <div className="admin-error-box" role="alert">
            <AlertCircle size={16} className="admin-error-icon" />
            <div className="admin-error-text">
              {isLockedOut ? (
                <span>
                  Too many failed attempts. Try again in <strong>{lockoutTimer}s</strong>.
                </span>
              ) : (
                errorMessage
              )}
            </div>
          </div>
        )}

        <form className="admin-login-form" onSubmit={handleSubmit} noValidate={false}>
          {/* Email Input */}
          <div className="admin-input-group">
            <label htmlFor="admin-email">Administrator Email</label>
            <div className="admin-input-field-wrap">
              <span className="admin-input-icon">
                <Mail size={16} />
              </span>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter authorized email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                disabled={isSubmitting || isLockedOut}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="admin-input-group">
            <div className="admin-label-row">
              <label htmlFor="admin-password">Password</label>
            </div>
            <div className="admin-input-field-wrap">
              <span className="admin-input-icon">
                <Lock size={16} />
              </span>
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                disabled={isSubmitting || isLockedOut}
              />
              <button
                type="button"
                className="admin-password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-admin-submit"
            disabled={isSubmitting || isLockedOut || !email.trim() || !password}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="admin-spinner" />
                <span>Verifying Credentials...</span>
              </>
            ) : isLockedOut ? (
              <>
                <Lock size={16} />
                <span>Locked ({lockoutTimer}s)</span>
              </>
            ) : (
              <>
                <Lock size={16} />
                <span>Sign In to Dashboard</span>
              </>
            )}
          </button>
        </form>

        {/* Security Trust Footnote */}
        <div className="admin-security-footnote">
          <ShieldCheck size={13} className="text-emerald" />
          <span>Restricted Operational Area • 256-Bit TLS Encryption</span>
        </div>

        {/* Navigation Return */}
        <div className="admin-login-footer">
          <Link to="/" className="admin-return-link">
            <ArrowLeft size={14} />
            <span>Return to Public Store</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
