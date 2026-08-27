import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Info, CreditCard, Lock, ShieldCheck, AlertCircle, Trash2, ShoppingBag, Tag, Check, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import MockPaymentModal from '../components/MockPaymentModal';
import { supabase } from '../lib/supabaseClient';
import logo from '../assets/logo.png';
import './CheckoutPage.css';

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
  'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

// Helper to safely load Razorpay Checkout SDK script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const CheckoutPage = () => {
  const {
    cartItems,
    getCartTotal,
    clearCart,
    updateQuantity,
    removeFromCart,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    getDiscountAmount
  } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const subtotal = getCartTotal();
  const discount = getDiscountAmount();
  const finalTotal = Math.max(0, subtotal - discount);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingServerOrder, setPendingServerOrder] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    newsAndOffers: false,
    country: 'India',
    firstName: '',
    lastName: '',
    company: '',
    address: '',
    apartment: '',
    city: '',
    state: 'Uttar Pradesh',
    pinCode: '',
    phone: '',
    saveInfo: false,
    billingAddress: 'same'
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || prev.email,
        firstName: user.name ? user.name.split(' ')[0].replace(/[^a-zA-Z\s]/g, '') : prev.firstName,
        lastName: user.name ? user.name.split(' ').slice(1).join(' ').replace(/[^a-zA-Z\s]/g, '') : prev.lastName,
        phone: user.phone ? user.phone.replace(/\D/g, '').slice(0, 10) : prev.phone,
        address: user.address || prev.address,
        city: user.city || prev.city,
        state: user.state || prev.state,
        pinCode: user.pinCode ? user.pinCode.replace(/\D/g, '').slice(0, 6) : prev.pinCode
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, phone: digitsOnly }));
  };

  const handlePinCodeChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setFormData(prev => ({ ...prev, pinCode: digitsOnly }));
  };

  const handleNameChange = (e) => {
    const alphaOnly = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    setFormData(prev => ({ ...prev, [e.target.name]: alphaOnly }));
  };

  const handleCouponSubmit = (e) => {
    e.preventDefault();
    setCouponError('');
    const res = applyCoupon(couponInput);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponInput('');
    }
  };

  // Submit form & call create-razorpay-order Edge Function
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    if (formData.phone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (formData.pinCode.length !== 6 || !/^[1-9]\d{5}$/.test(formData.pinCode)) {
      setErrorMessage("Please enter a valid 6-digit Indian PIN code.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity
        })),
        shippingDetails: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          apartment: formData.apartment.trim(),
          city: formData.city.trim(),
          state: formData.state,
          pinCode: formData.pinCode.trim(),
          country: formData.country
        },
        couponCode: appliedCoupon?.code || null
      };

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/create-razorpay-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create order on server.');
      }

      const { razorpayOrderId, orderId, displayOrderId, totalAmount, keyId } = data;

      const orderDataForVerification = {
        razorpayOrderId,
        orderId,
        displayOrderId,
        totalAmount
      };

      setPendingServerOrder(orderDataForVerification);

      const scriptLoaded = await loadRazorpayScript();

      if (scriptLoaded && window.Razorpay && keyId && !keyId.startsWith('rzp_test_placeholder')) {
        const options = {
          key: keyId,
          amount: Math.round(totalAmount * 100),
          currency: 'INR',
          name: 'Kabgeer Masale',
          description: `Order ${displayOrderId}`,
          order_id: razorpayOrderId,
          prefill: {
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            contact: formData.phone
          },
          theme: { color: '#1A2F22' },
          handler: function (razorpayResponse) {
            handleServerPaymentVerification({
              orderId,
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
              displayOrderId
            });
          },
          modal: {
            ondismiss: function () {
              setIsSubmitting(false);
              setErrorMessage('Payment cancelled by user.');
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        setShowPaymentModal(true);
      }
    } catch (err) {
      console.error('Order Initialization Error:', err);
      setErrorMessage(err.message || 'Unable to connect to order server.');
      setIsSubmitting(false);
    }
  };

  const handleServerPaymentVerification = async (verifyPayload) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/verify-razorpay-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify(verifyPayload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Server-side payment verification failed.');
      }

      clearCart();
      setShowPaymentModal(false);
      setIsSubmitting(false);
      navigate(`/order-success?id=${verifyPayload.displayOrderId}`);
    } catch (err) {
      console.error('Payment Verification Failure:', err);
      setErrorMessage(`Payment verification failed: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-main">
          {/* Brand Header Banner */}
          <div className="checkout-brand-header">
            <Link to="/" className="brand-logo-link">
              <img src={logo} alt="Kabgeer Masale" className="checkout-brand-logo" />
            </Link>
            <div className="checkout-steps-badge">
              <ShieldCheck size={16} color="#16a34a" /> 256-Bit SSL Encrypted Checkout
            </div>
          </div>

          {errorMessage && (
            <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Contact Section */}
            <div className="checkout-section">
              <div className="section-header">
                <h3>Contact Details</h3>
                {!user && <Link to="/login" className="login-link">Sign in</Link>}
              </div>
              <input 
                type="email" 
                name="email" 
                className="form-input" 
                placeholder="Email address (e.g. rahul@example.com)" 
                autoComplete="email"
                value={formData.email} 
                onChange={handleChange} 
                required 
              />
              <label className="checkbox-label mt-1">
                <input 
                  type="checkbox" 
                  name="newsAndOffers"
                  checked={formData.newsAndOffers}
                  onChange={handleChange}
                />
                <span>Email me with exclusive recipe tips and special offers</span>
              </label>
            </div>

            {/* Delivery Section */}
            <div className="checkout-section">
              <h3>Shipping Address</h3>
              <select name="country" className="form-input" value={formData.country} onChange={handleChange}>
                <option value="India">India</option>
              </select>

              <div className="form-row">
                <input 
                  type="text" 
                  name="firstName" 
                  className="form-input" 
                  placeholder="First name (e.g. Rahul)" 
                  autoComplete="given-name"
                  value={formData.firstName} 
                  onChange={handleNameChange} 
                  required 
                />
                <input 
                  type="text" 
                  name="lastName" 
                  className="form-input" 
                  placeholder="Last name (e.g. Sharma)" 
                  autoComplete="family-name"
                  value={formData.lastName} 
                  onChange={handleNameChange} 
                  required 
                />
              </div>

              <input 
                type="text" 
                name="company" 
                className="form-input" 
                placeholder="Company or Business name (optional)" 
                autoComplete="organization"
                value={formData.company} 
                onChange={handleChange} 
              />
              <input 
                type="text" 
                name="address" 
                className="form-input" 
                placeholder="Street address, house number, area" 
                autoComplete="address-line1"
                value={formData.address} 
                onChange={handleChange} 
                required 
              />
              <input 
                type="text" 
                name="apartment" 
                className="form-input" 
                placeholder="Apartment, suite, unit, landmark (optional)" 
                autoComplete="address-line2"
                value={formData.apartment} 
                onChange={handleChange} 
              />

              <div className="form-row three-cols">
                <input 
                  type="text" 
                  name="city" 
                  className="form-input" 
                  placeholder="City / Town (e.g. Lucknow)" 
                  autoComplete="address-level2"
                  value={formData.city} 
                  onChange={handleChange} 
                  required 
                />
                <select name="state" className="form-input" value={formData.state} onChange={handleChange}>
                  {INDIAN_STATES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                <input 
                  type="text" 
                  name="pinCode" 
                  className="form-input" 
                  placeholder="6-digit PIN code (e.g. 226001)" 
                  autoComplete="postal-code"
                  maxLength={6}
                  value={formData.pinCode} 
                  onChange={handlePinCodeChange} 
                  required 
                />
              </div>

              <div className="input-with-icon">
                <input 
                  type="tel" 
                  name="phone" 
                  className="form-input" 
                  placeholder="10-digit mobile number (e.g. 9876543210)" 
                  autoComplete="tel"
                  maxLength={10}
                  value={formData.phone} 
                  onChange={handlePhoneChange} 
                  required 
                />
                <Info size={16} className="input-icon text-text-light" />
              </div>

              <label className="checkbox-label mt-1">
                <input type="checkbox" name="saveInfo" checked={formData.saveInfo} onChange={handleChange} />
                <span>Save address details for future orders</span>
              </label>
            </div>

            {/* Shipping Method */}
            <div className="checkout-section">
              <h3>Shipping method</h3>
              <div className="radio-group" style={{ marginTop: '0.75rem' }}>
                <label className="radio-label active" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input type="radio" name="shippingMethod" checked readOnly />
                    <span>Standard Express Shipping (2–4 Working Days)</span>
                  </div>
                  <strong style={{ color: '#16a34a', fontSize: '0.9rem' }}>FREE</strong>
                </label>
              </div>
            </div>

            {/* Payment Section */}
            <div className="checkout-section">
              <h3>Payment Gateway</h3>
              <p className="text-sm text-text-light mb-2">All transactions are 100% secure and encrypted with Razorpay.</p>
              
              <div className="payment-box">
                <div className="payment-header">
                  <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Razorpay Secure Gateway</span>
                  <div className="payment-icons">
                    <span className="cc-icon">UPI</span>
                    <span className="cc-icon">Cards</span>
                    <span className="cc-icon">NetBanking</span>
                  </div>
                </div>
                <div className="payment-body text-center text-sm text-text-light" style={{ padding: '2rem 1.5rem', backgroundColor: '#fafafa' }}>
                  <CreditCard size={40} className="mb-2" style={{ margin: '0 auto', color: 'var(--color-primary)', opacity: 0.8 }} />
                  <p style={{ margin: '0.5rem 0 0', color: '#555', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    After clicking <strong>"Pay now"</strong>, you will be redirected to Razorpay Secure to complete your purchase safely using GPay, PhonePe, Paytm, Cards, or NetBanking.
                  </p>
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div className="checkout-section">
              <h3>Billing address</h3>
              <div className="radio-group">
                <label className={`radio-label ${formData.billingAddress === 'same' ? 'active' : ''}`}>
                  <input type="radio" name="billingAddress" value="same" checked={formData.billingAddress === 'same'} onChange={handleChange} />
                  <span>Same as shipping address</span>
                </label>
                <label className={`radio-label ${formData.billingAddress === 'different' ? 'active' : ''}`}>
                  <input type="radio" name="billingAddress" value="different" checked={formData.billingAddress === 'different'} onChange={handleChange} />
                  <span>Use a different billing address</span>
                </label>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || cartItems.length === 0} 
              className="btn btn-primary btn-large w-100 mt-2" 
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <Lock size={18} /> {isSubmitting ? 'Initializing Payment...' : `Pay ₹${finalTotal.toFixed(2)}`}
            </button>

            <div className="trust-badge-container">
              <div className="trust-badge"><ShieldCheck size={18} color="#16a34a" /> SSL Encrypted</div>
              <div className="trust-badge"><Lock size={18} color="#16a34a" /> Secure Checkout</div>
            </div>

            <div className="checkout-footer-links mt-4 text-sm text-accent">
              <Link to="/returns">Returns policy</Link>
              <Link to="/shipping">Shipping</Link>
              <Link to="/privacy">Privacy policy</Link>
              <Link to="/terms">Terms of service</Link>
            </div>
          </form>
        </div>

        {/* Sidebar Order Summary */}
        <div className="checkout-sidebar">
          <div className="order-summary">
            <div className="summary-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e0e0e0' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                Order Summary ({cartItems.reduce((acc, i) => acc + i.quantity, 0)})
              </h3>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#cc0c39',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={14} /> Clear Cart
                </button>
              )}
            </div>

            <div className="summary-items">
              {cartItems.map((item) => (
                <div key={item.id} className="summary-item">
                  <div className="summary-item-img placeholder-img" style={{ position: 'relative' }}>
                    <span className="item-badge">{item.quantity}</span>
                    <img 
                      src={item.image || item.images?.[0]} 
                      alt={item.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px', borderRadius: '8px', backgroundColor: '#fff' }} 
                    />
                  </div>
                  <div className="summary-item-details" style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, paddingRight: '10px' }}>
                    <span className="item-name">{item.name}</span>
                    <div className="quantity-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label="Decrease quantity"
                        style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '1rem' }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: '0.9rem', minWidth: '16px', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                      <button 
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label="Increase quantity"
                        style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '1rem' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span className="summary-item-price" style={{ fontWeight: 700 }}>
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      title="Remove item"
                      style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: '2px' }}
                      onMouseOver={(e) => e.target.style.color = '#cc0c39'}
                      onMouseOut={(e) => e.target.style.color = '#999'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {cartItems.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#666' }}>
                  <ShoppingBag size={36} style={{ margin: '0 auto 0.5rem auto', color: '#ccc', display: 'block' }} />
                  <p className="text-sm text-text-light text-center">Your cart is currently empty.</p>
                  <Link to="/products" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}>
                    Browse Spices
                  </Link>
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="summary-totals mt-3">
                {/* Coupon Code Row */}
                <form onSubmit={handleCouponSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Coupon code (e.g. KABGEER10)"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                  <button type="submit" style={{ backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    Apply
                  </button>
                </form>

                {appliedCoupon && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    <span>Coupon: <strong>{appliedCoupon.code}</strong></span>
                    <button onClick={removeCoupon} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer' }}><X size={14} /></button>
                  </div>
                )}

                {couponError && <p style={{ fontSize: '0.78rem', color: '#cc0c39', marginTop: '-0.5rem', marginBottom: '0.75rem' }}>{couponError}</p>}

                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="summary-row" style={{ color: '#16a34a', fontWeight: 600 }}>
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="summary-row">
                  <span>Estimated Shipping</span>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>FREE</span>
                </div>
                <div className="summary-row total-row mt-2" style={{ borderTop: '1px solid #e0e0e0', paddingTop: '1rem' }}>
                  <span>Total Amount</span>
                  <span className="total-price" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                    <span className="currency-code">INR</span> ₹{finalTotal.toFixed(2)}
                  </span>
                </div>
                <p className="tax-info text-sm text-text-light mt-1">Inclusive of all taxes. Verified securely by server during checkout.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPaymentModal && pendingServerOrder && (
        <MockPaymentModal 
          amount={pendingServerOrder.totalAmount} 
          displayOrderId={pendingServerOrder.displayOrderId}
          razorpayOrderId={pendingServerOrder.razorpayOrderId}
          onClose={() => {
            setShowPaymentModal(false);
            setIsSubmitting(false);
            setErrorMessage('Payment simulation window closed.');
          }} 
          onSuccess={(simulatedResponse) => {
            handleServerPaymentVerification({
              orderId: pendingServerOrder.orderId,
              razorpay_order_id: simulatedResponse.razorpay_order_id,
              razorpay_payment_id: simulatedResponse.razorpay_payment_id,
              razorpay_signature: simulatedResponse.razorpay_signature,
              displayOrderId: pendingServerOrder.displayOrderId
            });
          }} 
        />
      )}
    </div>
  );
};

export default CheckoutPage;
