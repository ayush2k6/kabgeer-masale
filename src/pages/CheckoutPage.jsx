import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Trash2, 
  X, 
  ShoppingBag, 
  AlertCircle, 
  Info, 
  CreditCard, 
  Check, 
  Sparkles,
  Lock 
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import MockPaymentModal from '../components/MockPaymentModal';
import logo from '../assets/logo.png';
import { supabase } from '../lib/supabaseClient';
import './CheckoutPage.css';

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
  'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli', 'Daman and Diu',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

// Helper to safely load Razorpay Checkout SDK script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
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
    getDiscountAmount,
    isBundleOfferActive
  } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const subtotal = getCartTotal();
  const discount = getDiscountAmount();
  const finalTotal = Math.max(0, subtotal - discount);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [pendingServerOrder, setPendingServerOrder] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isLookingUpPincode, setIsLookingUpPincode] = useState(false);
  const [pincodeStatusMessage, setPincodeStatusMessage] = useState('');
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);

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
    saveInfo: false
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
    const name = e.target.name;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, phone: digitsOnly }));
    if (formErrors.phone) {
      setFormErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const handlePinCodeChange = async (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setFormData(prev => ({ ...prev, pinCode: digitsOnly }));
    if (formErrors.pinCode) {
      setFormErrors(prev => ({ ...prev, pinCode: '' }));
    }

    if (digitsOnly.length === 6) {
      if (!/^[1-9]\d{5}$/.test(digitsOnly)) {
        setPincodeStatusMessage('⚠️ Please enter a valid 6-digit Indian PIN code.');
        return;
      }
      setIsLookingUpPincode(true);
      setPincodeStatusMessage('Looking up PIN code...');
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${digitsOnly}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
          const postOffice = data[0].PostOffice[0];
          const detectedCity = postOffice.District || postOffice.Block || postOffice.Name;
          const detectedState = postOffice.State;
          setFormData(prev => ({
            ...prev,
            city: detectedCity || prev.city,
            state: detectedState || prev.state
          }));
          setPincodeStatusMessage(`✓ Location: ${detectedCity}, ${detectedState}`);
        } else {
          setPincodeStatusMessage('');
        }
      } catch {
        setPincodeStatusMessage('');
      } finally {
        setIsLookingUpPincode(false);
      }
    } else {
      setPincodeStatusMessage('');
    }
  };

  const handleNameChange = (e) => {
    const alphaOnly = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    const name = e.target.name;
    setFormData(prev => ({ ...prev, [name]: alphaOnly }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
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

  const validateForm = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required.';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required.';
    
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!formData.phone.trim()) {
      errors.phone = '10-digit mobile number is required.';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      errors.phone = 'Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, 9).';
    }

    if (!formData.address.trim()) errors.address = 'Street / delivery address is required.';
    if (!formData.city.trim()) errors.city = 'City / Town is required.';
    if (!formData.state.trim()) errors.state = 'State is required.';

    if (!formData.pinCode.trim()) {
      errors.pinCode = '6-digit PIN code is required.';
    } else if (!/^[1-9]\d{5}$/.test(formData.pinCode.trim())) {
      errors.pinCode = 'Please enter a valid 6-digit Indian PIN code (cannot start with 0).';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form & call create-razorpay-order Edge Function
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    if (!validateForm()) {
      setErrorMessage("Please complete all required fields correctly before proceeding to payment.");
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

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cfvopnzcqbtqcupdomto.supabase.co';
      const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY && !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR_'))
        ? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        : ((import.meta.env.VITE_SUPABASE_ANON_KEY && !import.meta.env.VITE_SUPABASE_ANON_KEY.startsWith('YOUR_'))
          ? import.meta.env.VITE_SUPABASE_ANON_KEY
          : 'sb_publishable_9Ry6OuD-80stD-4Cz8fMaQ_0EAHlUsU');

      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token || supabaseAnonKey;

      const response = await fetch(`${supabaseUrl}/functions/v1/create-razorpay-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          ...payload,
          pricingConfig: {
            shippingFee: 0
          }
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.details || `Failed to create order on server (Status ${response.status}).`);
      }

      const orderId = data.orderId;
      const displayOrderId = data.displayOrderId;
      const razorpayOrderId = data.razorpayOrderId;
      const keyId = data.key || data.keyId;
      const totalAmount = Number(data.summary?.total ?? (data.amount ? data.amount / 100 : (data.totalAmount ?? finalTotal)));

      const orderDataForVerification = {
        razorpayOrderId,
        orderId,
        displayOrderId,
        totalAmount,
        keyId
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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cfvopnzcqbtqcupdomto.supabase.co';
      const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY && !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR_'))
        ? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        : ((import.meta.env.VITE_SUPABASE_ANON_KEY && !import.meta.env.VITE_SUPABASE_ANON_KEY.startsWith('YOUR_'))
          ? import.meta.env.VITE_SUPABASE_ANON_KEY
          : 'sb_publishable_9Ry6OuD-80stD-4Cz8fMaQ_0EAHlUsU');

      const response = await fetch(`${supabaseUrl}/functions/v1/verify-razorpay-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify(verifyPayload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.details || 'Server-side payment verification failed.');
      }

      const finalPaidAmount = Number(pendingServerOrder?.totalAmount ?? finalTotal);
      const successData = {
        orderId: verifyPayload.orderId,
        displayOrderId: verifyPayload.displayOrderId,
        totalAmount: finalPaidAmount,
        order_status: 'Confirmed',
        payment_status: 'Paid',
        order_items: cartItems.map(item => ({
          product_name: item.name,
          weight_pack: item.weight || (item.weightInGrams ? `${item.weightInGrams}g` : '50g'),
          quantity: item.quantity,
          line_total: item.price * item.quantity
        })),
        shipping_address: { ...formData }
      };

      try {
        sessionStorage.setItem(`kbg_order_${verifyPayload.displayOrderId}`, JSON.stringify(successData));
      } catch {
        // ignore
      }

      clearCart();
      setShowPaymentModal(false);
      setIsSubmitting(false);
      navigate(`/order-success?id=${verifyPayload.displayOrderId}`, { state: successData });
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

          {/* Mobile Collapsible Order Summary Accordion */}
          <div className="checkout-mobile-summary-accordion">
            <button
              type="button"
              className="mobile-summary-toggle"
              onClick={() => setIsMobileSummaryOpen(prev => !prev)}
            >
              <div className="summary-toggle-left">
                <ShoppingBag size={18} />
                <span>{isMobileSummaryOpen ? 'Hide order summary' : 'Show order summary'}</span>
                <span className="toggle-chevron">{isMobileSummaryOpen ? '▲' : '▼'}</span>
              </div>
              <span className="summary-toggle-amount">₹{finalTotal.toFixed(2)}</span>
            </button>

            {isMobileSummaryOpen && (
              <div className="mobile-summary-dropdown">
                {cartItems.map((item) => {
                  const itemId = item.cartItemId || `${item.id}__${item.weight || '50g'}`;
                  return (
                    <div key={itemId} className="mobile-summary-item-row">
                      <img src={item.image || item.images?.[0]} alt={item.name} className="mobile-summary-thumb" />
                      <div className="mobile-summary-item-meta">
                        <span className="mobile-item-title">{item.name} ({item.weight || '50g'})</span>
                        <span className="mobile-item-qty">Qty: {item.quantity}</span>
                      </div>
                      <span className="mobile-item-price">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="mobile-summary-totals">
                  <div className="mob-sum-row">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="mob-sum-row" style={{ color: '#16a34a' }}>
                      <span>Discount ({appliedCoupon?.code || 'Coupon'})</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="mob-sum-row">
                    <span>Shipping</span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>FREE</span>
                  </div>
                  <div className="mob-sum-row mob-sum-total">
                    <strong>Total</strong>
                    <strong>₹{finalTotal.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            )}
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
                <h3>Contact Details <span style={{ color: '#dc2626', fontSize: '0.9rem' }}>*</span></h3>
                {!user && <Link to="/login" className="login-link">Sign in</Link>}
              </div>
              <input 
                type="email" 
                name="email" 
                className={`form-input ${formErrors.email ? 'input-error' : ''}`} 
                placeholder="Email address (e.g. rahul@example.com) *" 
                autoComplete="email"
                value={formData.email} 
                onChange={handleChange} 
                required 
              />
              {formErrors.email && (
                <span style={{ color: '#dc2626', fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>{formErrors.email}</span>
              )}
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
              <h3>Shipping & Delivery Address <span style={{ color: '#dc2626', fontSize: '0.9rem' }}>*</span></h3>
              <select name="country" className="form-input" value={formData.country} onChange={handleChange}>
                <option value="India">India</option>
              </select>

              <div className="form-row">
                <div>
                  <input 
                    type="text" 
                    name="firstName" 
                    className={`form-input ${formErrors.firstName ? 'input-error' : ''}`} 
                    placeholder="First name (e.g. Rahul) *" 
                    autoComplete="given-name"
                    value={formData.firstName} 
                    onChange={handleNameChange} 
                    required 
                  />
                  {formErrors.firstName && (
                    <span style={{ color: '#dc2626', fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>{formErrors.firstName}</span>
                  )}
                </div>
                <div>
                  <input 
                    type="text" 
                    name="lastName" 
                    className={`form-input ${formErrors.lastName ? 'input-error' : ''}`} 
                    placeholder="Last name (e.g. Sharma) *" 
                    autoComplete="family-name"
                    value={formData.lastName} 
                    onChange={handleNameChange} 
                    required 
                  />
                  {formErrors.lastName && (
                    <span style={{ color: '#dc2626', fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>{formErrors.lastName}</span>
                  )}
                </div>
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

              <div style={{ marginTop: '0.75rem' }}>
                <input 
                  type="text" 
                  name="address" 
                  className={`form-input ${formErrors.address ? 'input-error' : ''}`} 
                  placeholder="Street address, house number, area *" 
                  autoComplete="address-line1"
                  value={formData.address} 
                  onChange={handleChange} 
                  required 
                />
                {formErrors.address && (
                  <span style={{ color: '#dc2626', fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>{formErrors.address}</span>
                )}
              </div>

              <input 
                type="text" 
                name="apartment" 
                className="form-input" 
                placeholder="Apartment, suite, unit, landmark (optional)" 
                autoComplete="address-line2"
                value={formData.apartment} 
                onChange={handleChange} 
                style={{ marginTop: '0.75rem' }}
              />

              <div className="form-row three-cols" style={{ marginTop: '0.75rem' }}>
                <div>
                  <input 
                    type="text" 
                    name="city" 
                    className={`form-input ${formErrors.city ? 'input-error' : ''}`} 
                    placeholder="City / Town *" 
                    autoComplete="address-level2"
                    value={formData.city} 
                    onChange={handleChange} 
                    required 
                  />
                  {formErrors.city && (
                    <span style={{ color: '#dc2626', fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>{formErrors.city}</span>
                  )}
                </div>
                <div>
                  <select name="state" className="form-input" value={formData.state} onChange={handleChange}>
                    {INDIAN_STATES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <input 
                    type="text" 
                    name="pinCode" 
                    className={`form-input ${formErrors.pinCode ? 'input-error' : ''}`} 
                    placeholder="6-digit PIN *" 
                    autoComplete="postal-code"
                    maxLength={6}
                    value={formData.pinCode} 
                    onChange={handlePinCodeChange} 
                    required 
                  />
                  {formErrors.pinCode && (
                    <span style={{ color: '#dc2626', fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>{formErrors.pinCode}</span>
                  )}
                </div>
              </div>

              {pincodeStatusMessage && (
                <p style={{ fontSize: '0.8rem', color: isLookingUpPincode ? '#d4af37' : '#16a34a', marginTop: '0.35rem', fontWeight: 600 }}>
                  {pincodeStatusMessage}
                </p>
              )}

              <div className="input-with-icon mt-2">
                <input 
                  type="tel" 
                  name="phone" 
                  className={`form-input ${formErrors.phone ? 'input-error' : ''}`} 
                  placeholder="10-digit mobile number (e.g. 9876543210) *" 
                  autoComplete="tel"
                  maxLength={10}
                  value={formData.phone} 
                  onChange={handlePhoneChange} 
                  required 
                />
                <Info size={16} className="input-icon text-text-light" />
              </div>
              {formErrors.phone && (
                <span style={{ color: '#dc2626', fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>{formErrors.phone}</span>
              )}

              <label className="checkbox-label mt-1">
                <input type="checkbox" name="saveInfo" checked={formData.saveInfo} onChange={handleChange} />
                <span>Save address details for future orders</span>
              </label>
            </div>

            {/* Shipping Method */}
            <div className="checkout-section">
              <h3>Shipping Method</h3>
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

            {/* Payment Method Section - Online Only */}
            <div className="checkout-section">
              <h3>Payment Method</h3>
              <div className="radio-group" style={{ marginTop: '0.75rem' }}>
                <div className="radio-label active" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CreditCard size={22} color="var(--color-primary)" />
                    <div>
                      <strong style={{ color: 'var(--color-primary)', fontSize: '0.95rem' }}>⚡ Razorpay Secure Checkout</strong>
                      <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, NetBanking</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', backgroundColor: '#dcfce7', color: '#16a34a', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                    100% Secure
                  </span>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || cartItems.length === 0} 
              className="btn btn-primary btn-large w-100 mt-2" 
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <Lock size={18} /> {isSubmitting ? 'Initializing Payment...' : `Pay ₹${finalTotal.toFixed(2)}`}
            </button>

            <div className="trust-badge-container">
              <div className="trust-badge"><ShieldCheck size={16} color="#16a34a" /> 256-Bit SSL Encrypted</div>
              <div className="trust-badge"><Lock size={16} color="#16a34a" /> FSSAI Certified Quality</div>
              <div className="trust-badge"><Check size={16} color="#16a34a" /> 100% Pure Lucknavi Masala</div>
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
              {cartItems.map((item) => {
                const itemId = item.cartItemId || `${item.id}__${item.weight || '50g'}`;
                return (
                  <div key={itemId} className="summary-item">
                    <div className="summary-item-img placeholder-img" style={{ position: 'relative' }}>
                      <span className="item-badge">{item.quantity}</span>
                      <img 
                        src={item.image || item.images?.[0]} 
                        alt={item.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px', borderRadius: '8px', backgroundColor: '#fff' }} 
                      />
                    </div>
                    <div className="summary-item-details" style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, paddingRight: '10px' }}>
                      <span className="item-name">{item.name} ({item.weight || '50g'})</span>
                      <div className="quantity-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          type="button"
                          onClick={() => updateQuantity(itemId, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '1rem' }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '0.9rem', minWidth: '16px', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                        <button 
                          type="button"
                          onClick={() => updateQuantity(itemId, item.quantity + 1)}
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
                        onClick={() => removeFromCart(itemId)}
                        title="Remove item"
                        style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: '2px' }}
                        onMouseOver={(e) => e.target.style.color = '#cc0c39'}
                        onMouseOut={(e) => e.target.style.color = '#999'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {isBundleOfferActive() && (
                <div className="summary-item" style={{ backgroundColor: 'rgba(39, 174, 96, 0.05)', border: '1px dashed #27ae60', padding: '10px', borderRadius: '8px', marginTop: '10px' }}>
                  <div className="summary-item-img placeholder-img" style={{ position: 'relative', width: '50px', height: '50px' }}>
                    <span className="item-badge" style={{ backgroundColor: '#27ae60' }}>2</span>
                    <div style={{ width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={24} color="#27ae60" />
                    </div>
                  </div>
                  <div className="summary-item-details" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, paddingRight: '10px' }}>
                    <span className="item-name" style={{ color: '#27ae60', fontWeight: '600' }}>Mini Masala Boxes (Assorted)</span>
                    <span style={{ fontSize: '0.8rem', color: '#16a34a' }}>Bundle Offer Gift</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span className="summary-item-price" style={{ fontWeight: 700, color: '#16a34a' }}>
                      FREE
                    </span>
                  </div>
                </div>
              )}

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
                    placeholder="Coupon code"
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
                    <span>Discount {isBundleOfferActive() ? '(Bundle 10% OFF)' : (appliedCoupon ? `(${appliedCoupon.code})` : '')}</span>
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
