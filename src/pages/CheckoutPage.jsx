import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { 
  ShieldCheck, 
  Trash2, 
  X, 
  ShoppingBag, 
  AlertCircle, 
  Lock, 
  Crown, 
  Gift
} from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const couponParam = searchParams.get('coupon') || searchParams.get('promo');
    const isTest = searchParams.get('test') === '1' || searchParams.get('test') === 'true';
    if (couponParam) {
      applyCoupon(couponParam);
    } else if (isTest) {
      applyCoupon('TESTPAY1');
    }
  }, [searchParams]);

  const subtotal = getCartTotal();
  const discount = getDiscountAmount();
  const isTestCoupon = appliedCoupon?.code === 'TESTPAY1';
  const shippingFee = isTestCoupon ? 0 : (cartItems.length > 0 ? 50 : 0);
  const finalTotal = isTestCoupon ? 1 : Math.max(0, subtotal - discount + shippingFee);

  const totalMasalaUnits = cartItems.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
  const isBundle = Boolean(
    (typeof isBundleOfferActive === 'function' && isBundleOfferActive()) ||
    totalMasalaUnits >= 4 ||
    cartItems.some(item => item.isBundleItem)
  );

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
    pinCode: '',
    city: '',
    state: 'Uttar Pradesh',
    address: '',
    apartment: '',
    phone: '',
    saveInfo: false
  });

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

  // PIN Code First: Auto-lookup City and State
  const handlePinCodeChange = async (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setFormData(prev => ({ ...prev, pinCode: digitsOnly }));
    if (formErrors.pinCode) {
      setFormErrors(prev => ({ ...prev, pinCode: '' }));
    }

    if (digitsOnly.length === 6) {
      if (!/^[1-9]\d{5}$/.test(digitsOnly)) {
        setPincodeStatusMessage('Invalid 6-digit PIN code');
        return;
      }
      setIsLookingUpPincode(true);
      setPincodeStatusMessage('');
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${digitsOnly}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
          const postOffice = data[0].PostOffice[0];
          const detectedCity = postOffice.District || postOffice.Block || postOffice.Name;
          const rawState = postOffice.State || '';
          
          const matchedState = INDIAN_STATES.find(
            s => s.toLowerCase() === rawState.toLowerCase()
          ) || rawState || formData.state;

          setFormData(prev => ({
            ...prev,
            city: detectedCity || prev.city,
            state: matchedState
          }));
          if (formErrors.city) setFormErrors(prev => ({ ...prev, city: '' }));
          if (formErrors.state) setFormErrors(prev => ({ ...prev, state: '' }));
          setPincodeStatusMessage(`✓ ${detectedCity}, ${matchedState}`);
        } else {
          setPincodeStatusMessage('Enter City & State below');
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

    if (!formData.pinCode.trim()) {
      errors.pinCode = 'PIN code is required.';
    } else if (!/^[1-9]\d{5}$/.test(formData.pinCode.trim())) {
      errors.pinCode = 'Enter valid 6-digit Indian PIN.';
    }

    if (!formData.city.trim()) errors.city = 'City is required.';
    if (!formData.state.trim()) errors.state = 'State is required.';
    if (!formData.address.trim()) errors.address = 'Address is required.';

    if (!formData.phone.trim()) {
      errors.phone = '10-digit mobile number is required.';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      errors.phone = 'Enter valid 10-digit Indian mobile number.';
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
      setErrorMessage("Please complete all required fields correctly before proceeding.");
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
        couponCode: appliedCoupon?.code || null,
        isBundle: isBundle
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
            shippingFee: shippingFee,
            discountAmount: discount
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
              setErrorMessage('Payment window closed. You can retry payment anytime.');
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          console.error('Razorpay payment failed:', response.error);
          setIsSubmitting(false);
          setErrorMessage(response.error?.description || 'Payment was declined or failed. Please try another UPI/Card method.');
        });
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
          unit_price: item.price,
          total_price: item.price * item.quantity,
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
        
        {/* Main Column */}
        <main className="checkout-main">
          
          {/* Minimal Header */}
          <header className="checkout-header">
            <Link to="/" className="brand-logo-link" title="Return to home">
              <img src={logo} alt="Kabgeer Masale" className="brand-logo-img" />
            </Link>
            <div className="checkout-secure-badge">
              <ShieldCheck size={14} color="#16a34a" />
              <span>Secure Checkout</span>
            </div>
          </header>

          {/* Mobile Summary Dropdown */}
          <div className="checkout-mobile-summary">
            <button
              type="button"
              className="mobile-summary-btn"
              onClick={() => setIsMobileSummaryOpen(prev => !prev)}
            >
              <div className="mobile-btn-left">
                <ShoppingBag size={16} />
                <span>{isMobileSummaryOpen ? 'Hide order summary' : 'Show order summary'}</span>
                <span className="mobile-chevron">{isMobileSummaryOpen ? '▲' : '▼'}</span>
              </div>
              <span className="mobile-summary-total">₹{finalTotal.toFixed(2)}</span>
            </button>

            {isMobileSummaryOpen && (
              <div className="mobile-summary-body">
                {cartItems.map((item) => {
                  const itemId = item.cartItemId || `${item.id}__${item.weight || '50g'}`;
                  return (
                    <div key={itemId} className="mobile-item-line">
                      <img src={item.image || item.images?.[0]} alt={item.name} className="mobile-thumb" />
                      <div className="mobile-meta">
                        <span className="mobile-title">{item.name} ({item.weight || '50g'})</span>
                        <span className="mobile-qty">Qty: {item.quantity}</span>
                      </div>
                      <span className="mobile-price">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}

                {isBundle && (
                  <div className="mobile-item-line mobile-gift-line">
                    <Gift size={16} color="#047857" />
                    <div className="mobile-meta">
                      <span className="mobile-title text-emerald">2x Mini Masala Boxes (Sample Pack)</span>
                      <span className="mobile-qty text-emerald">Complimentary Gift</span>
                    </div>
                    <span className="mobile-price text-emerald">FREE</span>
                  </div>
                )}

                <div className="mobile-totals-list">
                  <div className="mob-row">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="mob-row text-emerald">
                      <span>Discount ({appliedCoupon?.code || '10% Bundle'})</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="mob-row">
                    <span>Shipping</span>
                    <span>₹{shippingFee.toFixed(2)}</span>
                  </div>
                  <div className="mob-row mob-row-total">
                    <strong>Total</strong>
                    <strong>₹{finalTotal.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="checkout-alert">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Minimalist BYB Notification Banner */}
          {isBundle && (
            <div className="byb-minimal-banner">
              <Crown size={15} color="#854d0e" />
              <span><strong>Build Your Bundle Applied:</strong> 10% Flat Savings + 2 Free Mini Boxes included with this order.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="checkout-form">
            
            {/* 1. Contact Section */}
            <div className="form-section">
              <h2 className="section-title">Contact</h2>
              <div className="form-field">
                <label className="field-label" htmlFor="email">Email</label>
                <input 
                  id="email"
                  type="email" 
                  name="email" 
                  className={`field-input ${formErrors.email ? 'input-err' : ''}`} 
                  placeholder="name@example.com" 
                  autoComplete="email"
                  value={formData.email} 
                  onChange={handleChange} 
                  required 
                />
                {formErrors.email && <span className="field-err">{formErrors.email}</span>}
              </div>
              <label className="checkbox-row mt-2">
                <input 
                  type="checkbox" 
                  name="newsAndOffers"
                  checked={formData.newsAndOffers}
                  onChange={handleChange}
                />
                <span>Email me with news and offers</span>
              </label>
            </div>

            {/* 2. Delivery Section (PIN CODE FIRST!) */}
            <div className="form-section">
              <h2 className="section-title">Delivery</h2>

              {/* Name Row */}
              <div className="grid-2-cols">
                <div className="form-field">
                  <label className="field-label" htmlFor="firstName">First name</label>
                  <input 
                    id="firstName"
                    type="text" 
                    name="firstName" 
                    className={`field-input ${formErrors.firstName ? 'input-err' : ''}`} 
                    placeholder="First name" 
                    autoComplete="given-name"
                    value={formData.firstName} 
                    onChange={handleNameChange} 
                    required 
                  />
                  {formErrors.firstName && <span className="field-err">{formErrors.firstName}</span>}
                </div>
                <div className="form-field">
                  <label className="field-label" htmlFor="lastName">Last name</label>
                  <input 
                    id="lastName"
                    type="text" 
                    name="lastName" 
                    className={`field-input ${formErrors.lastName ? 'input-err' : ''}`} 
                    placeholder="Last name" 
                    autoComplete="family-name"
                    value={formData.lastName} 
                    onChange={handleNameChange} 
                    required 
                  />
                  {formErrors.lastName && <span className="field-err">{formErrors.lastName}</span>}
                </div>
              </div>

              {/* PIN Code FIRST */}
              <div className="form-field">
                <div className="field-label-row">
                  <label className="field-label" htmlFor="pinCode">PIN code</label>
                  {isLookingUpPincode && <span className="pincode-status">Locating...</span>}
                  {pincodeStatusMessage && !isLookingUpPincode && (
                    <span className={`pincode-status ${pincodeStatusMessage.startsWith('✓') ? 'pincode-ok' : ''}`}>
                      {pincodeStatusMessage}
                    </span>
                  )}
                </div>
                <input 
                  id="pinCode"
                  type="text" 
                  name="pinCode" 
                  className={`field-input ${formErrors.pinCode ? 'input-err' : ''}`} 
                  placeholder="6-digit PIN code (e.g. 208010)" 
                  autoComplete="postal-code"
                  maxLength={6}
                  value={formData.pinCode} 
                  onChange={handlePinCodeChange} 
                  required 
                />
                {formErrors.pinCode && <span className="field-err">{formErrors.pinCode}</span>}
              </div>

              {/* City & State (Auto-filled from PIN) */}
              <div className="grid-2-cols">
                <div className="form-field">
                  <label className="field-label" htmlFor="city">City</label>
                  <input 
                    id="city"
                    type="text" 
                    name="city" 
                    className={`field-input ${formErrors.city ? 'input-err' : ''}`} 
                    placeholder="City" 
                    autoComplete="address-level2"
                    value={formData.city} 
                    onChange={handleChange} 
                    required 
                  />
                  {formErrors.city && <span className="field-err">{formErrors.city}</span>}
                </div>
                <div className="form-field">
                  <label className="field-label" htmlFor="state">State</label>
                  <select 
                    id="state"
                    name="state" 
                    className="field-input field-select" 
                    value={formData.state} 
                    onChange={handleChange}
                  >
                    {INDIAN_STATES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Street Address */}
              <div className="form-field">
                <label className="field-label" htmlFor="address">Address</label>
                <input 
                  id="address"
                  type="text" 
                  name="address" 
                  className={`field-input ${formErrors.address ? 'input-err' : ''}`} 
                  placeholder="House no., building name, street, area" 
                  autoComplete="address-line1"
                  value={formData.address} 
                  onChange={handleChange} 
                  required 
                />
                {formErrors.address && <span className="field-err">{formErrors.address}</span>}
              </div>

              {/* Apartment / Landmark */}
              <div className="form-field">
                <label className="field-label" htmlFor="apartment">Apartment, suite, landmark <span className="optional-tag">(optional)</span></label>
                <input 
                  id="apartment"
                  type="text" 
                  name="apartment" 
                  className="field-input" 
                  placeholder="Apartment, suite, unit, etc." 
                  autoComplete="address-line2"
                  value={formData.apartment} 
                  onChange={handleChange} 
                />
              </div>

              {/* Phone */}
              <div className="form-field">
                <label className="field-label" htmlFor="phone">Phone</label>
                <input 
                  id="phone"
                  type="tel" 
                  name="phone" 
                  className={`field-input ${formErrors.phone ? 'input-err' : ''}`} 
                  placeholder="10-digit mobile number" 
                  autoComplete="tel"
                  maxLength={10}
                  value={formData.phone} 
                  onChange={handlePhoneChange} 
                  required 
                />
                {formErrors.phone && <span className="field-err">{formErrors.phone}</span>}
              </div>

              <label className="checkbox-row mt-2">
                <input type="checkbox" name="saveInfo" checked={formData.saveInfo} onChange={handleChange} />
                <span>Save this information for next time</span>
              </label>
            </div>

            {/* 3. Shipping Method Section */}
            <div className="form-section">
              <h2 className="section-title">Shipping method</h2>
              <div className="shipping-radio-row">
                <div className="shipping-info-left">
                  <input type="radio" checked readOnly />
                  <span>Standard Express Shipping (3–5 Business Days)</span>
                </div>
                <span className="shipping-price-tag">
                  {shippingFee === 0 ? 'FREE' : `₹${shippingFee.toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* 4. Payment Section */}
            <div className="form-section">
              <h2 className="section-title">Payment</h2>
              <p className="payment-helper-text">All transactions are secure and encrypted.</p>
              <div className="payment-radio-box">
                <div className="payment-box-header">
                  <div className="payment-header-left">
                    <input type="radio" checked readOnly />
                    <span className="payment-name">Razorpay Secure (UPI, Cards, NetBanking)</span>
                  </div>
                  <div className="payment-tags-wrap">
                    <span className="pay-mini-badge">UPI</span>
                    <span className="pay-mini-badge">Cards</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pay Button */}
            <button 
              type="submit" 
              disabled={isSubmitting || cartItems.length === 0} 
              className="btn-pay-now"
            >
              <Lock size={16} />
              <span>{isSubmitting ? 'Processing...' : `Pay ₹${finalTotal.toFixed(2)}`}</span>
            </button>

            {/* Clean Footer Policy Links */}
            <div className="checkout-footer-links">
              <Link to="/returns">Refund policy</Link>
              <Link to="/shipping">Shipping policy</Link>
              <Link to="/privacy">Privacy policy</Link>
              <Link to="/terms">Terms of service</Link>
            </div>
          </form>
        </main>

        {/* Right Sticky Sidebar (Order Summary) */}
        <aside className="checkout-sidebar">
          <div className="sidebar-sticky-wrap">
            
            <div className="sidebar-header">
              <h2 className="sidebar-title">Order summary ({totalMasalaUnits})</h2>
              {isBundle && <span className="byb-tag">BYB Order</span>}
            </div>

            {/* Items */}
            <div className="items-list">
              {cartItems.map((item) => {
                const itemId = item.cartItemId || `${item.id}__${item.weight || '50g'}`;
                return (
                  <div key={itemId} className="item-row">
                    <div className="item-thumb-box">
                      <span className="item-qty-badge">{item.quantity}</span>
                      <img 
                        src={item.image || item.images?.[0]} 
                        alt={item.name} 
                        className="item-thumb-img" 
                      />
                    </div>
                    <div className="item-meta">
                      <div className="item-title-row">
                        <span className="item-title">{item.name}</span>
                      </div>
                      <span className="item-weight">• {item.weight || '50g'}</span>
                      <div className="item-controls">
                        <button 
                          type="button"
                          onClick={() => updateQuantity(itemId, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="item-qty-btn"
                        >
                          -
                        </button>
                        <span className="item-qty-num">{item.quantity}</span>
                        <button 
                          type="button"
                          onClick={() => updateQuantity(itemId, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="item-qty-btn"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(itemId)}
                          title="Remove item"
                          className="item-remove-btn"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <span className="item-price">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                );
              })}

              {/* Complimentary BYB Gift Box */}
              {isBundle && (
                <div className="gift-row">
                  <div className="gift-thumb-box">
                    <span className="item-qty-badge">2</span>
                    <Gift size={16} color="#047857" />
                  </div>
                  <div className="item-meta">
                    <span className="item-title text-emerald">2x Mini Masala Boxes (Sample Pack)</span>
                    <span className="item-weight text-emerald">Complimentary Royal Chef Curation</span>
                  </div>
                  <span className="item-price text-emerald">FREE</span>
                </div>
              )}

              {cartItems.length === 0 && (
                <div className="empty-cart-state">
                  <p>Your cart is empty.</p>
                  <Link to="/products" className="btn-browse-link">
                    Browse Masalas
                  </Link>
                </div>
              )}
            </div>

            {/* Coupon & Totals */}
            {cartItems.length > 0 && (
              <div className="summary-bottom">
                
                {/* Coupon input */}
                <form onSubmit={handleCouponSubmit} className="coupon-form-row">
                  <input
                    type="text"
                    placeholder="Discount code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="coupon-field"
                  />
                  <button type="submit" className="coupon-apply-btn">
                    Apply
                  </button>
                </form>

                {appliedCoupon && (
                  <div className="applied-coupon-row">
                    <span>Coupon: <strong>{appliedCoupon.code}</strong></span>
                    <button type="button" onClick={removeCoupon} className="coupon-remove-btn">
                      <X size={13} />
                    </button>
                  </div>
                )}

                {couponError && <p className="coupon-error">{couponError}</p>}

                {/* Totals table */}
                <div className="totals-table">
                  <div className="totals-row">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="totals-row text-emerald font-semibold">
                      <span>Discount ({appliedCoupon?.code || '10% Bundle'})</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}

                  {isBundle && (
                    <div className="totals-row text-emerald">
                      <span>2 Mini Masala Boxes</span>
                      <span>FREE (Included)</span>
                    </div>
                  )}

                  <div className="totals-row">
                    <span>Shipping</span>
                    <span>{shippingFee === 0 ? 'FREE' : `₹${shippingFee.toFixed(2)}`}</span>
                  </div>

                  <div className="totals-row total-grand-row">
                    <span className="grand-title">Total</span>
                    <span className="grand-amount">
                      <span className="currency-unit">INR</span> ₹{finalTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <p className="taxes-note">Including ₹{(subtotal * 0.05 / 1.05).toFixed(2)} in taxes</p>
              </div>
            )}
          </div>
        </aside>

      </div>

      {/* Mock payment modal */}
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
