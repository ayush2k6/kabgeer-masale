import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { 
  ShieldCheck, 
  Trash2, 
  X, 
  ShoppingBag, 
  AlertCircle, 
  CreditCard, 
  Check, 
  Lock, 
  Crown, 
  Gift,
  MapPin,
  CheckCircle2,
  Truck,
  Tag,
  RotateCw,
  ArrowRight
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
    company: '',
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
        setPincodeStatusMessage('⚠️ Please enter a valid 6-digit Indian PIN code.');
        return;
      }
      setIsLookingUpPincode(true);
      setPincodeStatusMessage('Looking up City & State from postal registry...');
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${digitsOnly}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
          const postOffice = data[0].PostOffice[0];
          const detectedCity = postOffice.District || postOffice.Block || postOffice.Name;
          const rawState = postOffice.State || '';
          
          // Match state name exactly with INDIAN_STATES list
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
          setPincodeStatusMessage(`✓ Delivery Location: ${detectedCity}, ${matchedState}`);
        } else {
          setPincodeStatusMessage('⚠️ Location not found automatically. Please enter City & State below.');
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
      errors.pinCode = '6-digit PIN code is required.';
    } else if (!/^[1-9]\d{5}$/.test(formData.pinCode.trim())) {
      errors.pinCode = 'Please enter a valid 6-digit Indian PIN code (cannot start with 0).';
    }

    if (!formData.city.trim()) errors.city = 'City / Town is required.';
    if (!formData.state.trim()) errors.state = 'State is required.';
    if (!formData.address.trim()) errors.address = 'Street / delivery address is required.';

    if (!formData.phone.trim()) {
      errors.phone = '10-digit mobile number is required.';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      errors.phone = 'Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, 9).';
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
        
        {/* Main Form Area */}
        <div className="checkout-main">
          
          {/* Top Brand Navigation Header */}
          <div className="checkout-top-nav">
            <Link to="/" className="brand-logo-link" title="Return to Kabgeer Masale">
              <img src={logo} alt="Kabgeer Masale" className="checkout-brand-logo" />
            </Link>
            <div className="checkout-security-pill">
              <ShieldCheck size={16} color="#16a34a" />
              <span>100% Encrypted Checkout</span>
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

                {isBundle && (
                  <div className="mobile-summary-item-row" style={{ backgroundColor: '#f0fdf4', padding: '6px 8px', borderRadius: '6px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '4px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Gift size={16} color="#047857" />
                    </div>
                    <div className="mobile-summary-item-meta" style={{ flex: 1, paddingLeft: '8px' }}>
                      <span className="mobile-item-title" style={{ color: '#047857', fontWeight: 600 }}>2x Mini Masala Boxes (Assorted Pack)</span>
                      <span className="mobile-item-qty" style={{ color: '#059669' }}>Complimentary Gift (Qty: 2)</span>
                    </div>
                    <span className="mobile-item-price" style={{ color: '#047857', fontWeight: 700 }}>FREE</span>
                  </div>
                )}

                <div className="mobile-summary-totals">
                  <div className="mob-sum-row">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="mob-sum-row" style={{ color: '#16a34a', fontWeight: 600 }}>
                      <span>
                        {isBundle
                          ? (appliedCoupon ? `Special Discount (BYB • ${appliedCoupon.code})` : 'Special Discount (Build Your Bundle 10% OFF)')
                          : (appliedCoupon ? `Discount (${appliedCoupon.code})` : 'Discount')
                        }
                      </span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  {isBundle && (
                    <div className="mob-sum-row" style={{ color: '#047857', fontWeight: 600 }}>
                      <span>2 Mini Masala Boxes</span>
                      <span style={{ color: '#047857' }}>FREE (Included)</span>
                    </div>
                  )}
                  <div className="mob-sum-row">
                    <span>Shipping</span>
                    <span style={{ fontWeight: 600 }}>₹{shippingFee.toFixed(2)}</span>
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
            <div className="checkout-error-banner">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Luxury Royal BYB Perk Notification */}
          {isBundle && (
            <div className="byb-royal-card">
              <div className="byb-royal-inner">
                <div className="byb-crown-box">
                  <Crown size={20} color="#b45309" />
                </div>
                <div className="byb-royal-content">
                  <div className="byb-royal-header">
                    <h4>Royal Awadhi Bundle Applied</h4>
                    <span className="byb-tag-gold">10% FLAT SAVINGS + 2 FREE GIFTS</span>
                  </div>
                  <p className="byb-royal-desc">
                    Your order qualifies for our signature Awadhi Bundle! <strong>10% instant savings</strong> and <strong>2 complimentary mini masala boxes</strong> are included with your parcel.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            
            {/* Step 1: Contact Information */}
            <div className="checkout-card">
              <div className="card-header">
                <div className="step-circle">1</div>
                <div>
                  <h3 className="card-title">Contact Information</h3>
                  <p className="card-subtitle">Order receipt & dispatch updates will be sent here</p>
                </div>
              </div>
              <div className="form-group">
                <label className="field-label">Email Address <span className="req-star">*</span></label>
                <input 
                  type="email" 
                  name="email" 
                  className={`form-control ${formErrors.email ? 'is-invalid' : ''}`} 
                  placeholder="name@example.com" 
                  autoComplete="email"
                  value={formData.email} 
                  onChange={handleChange} 
                  required 
                />
                {formErrors.email && <span className="field-error-text">{formErrors.email}</span>}
                <label className="custom-checkbox mt-2">
                  <input 
                    type="checkbox" 
                    name="newsAndOffers"
                    checked={formData.newsAndOffers}
                    onChange={handleChange}
                  />
                  <span>Email me with royal recipes, culinary tips, and exclusive offers</span>
                </label>
              </div>
            </div>

            {/* Step 2: Shipping Address (PIN CODE FIRST!) */}
            <div className="checkout-card">
              <div className="card-header">
                <div className="step-circle">2</div>
                <div>
                  <h3 className="card-title">Shipping & Delivery Address</h3>
                  <p className="card-subtitle">Where should we deliver your authentic royal spices?</p>
                </div>
              </div>

              {/* Recipient Full Name */}
              <div className="form-row two-cols">
                <div className="form-group">
                  <label className="field-label">First Name <span className="req-star">*</span></label>
                  <input 
                    type="text" 
                    name="firstName" 
                    className={`form-control ${formErrors.firstName ? 'is-invalid' : ''}`} 
                    placeholder="First name" 
                    autoComplete="given-name"
                    value={formData.firstName} 
                    onChange={handleNameChange} 
                    required 
                  />
                  {formErrors.firstName && <span className="field-error-text">{formErrors.firstName}</span>}
                </div>
                <div className="form-group">
                  <label className="field-label">Last Name <span className="req-star">*</span></label>
                  <input 
                    type="text" 
                    name="lastName" 
                    className={`form-control ${formErrors.lastName ? 'is-invalid' : ''}`} 
                    placeholder="Last name" 
                    autoComplete="family-name"
                    value={formData.lastName} 
                    onChange={handleNameChange} 
                    required 
                  />
                  {formErrors.lastName && <span className="field-error-text">{formErrors.lastName}</span>}
                </div>
              </div>

              {/* >>> PIN CODE FIRST AS REQUESTED <<< */}
              <div className="form-group pincode-first-group">
                <div className="field-label-split">
                  <label className="field-label">PIN Code <span className="req-star">*</span></label>
                  <span className="field-hint-badge">Auto-detects City & State</span>
                </div>
                <div className="input-with-affix">
                  <MapPin size={18} className="affix-icon" />
                  <input 
                    type="text" 
                    name="pinCode" 
                    className={`form-control affix-field ${formErrors.pinCode ? 'is-invalid' : ''}`} 
                    placeholder="Enter 6-digit PIN code (e.g. 208010 or 226001)" 
                    autoComplete="postal-code"
                    maxLength={6}
                    value={formData.pinCode} 
                    onChange={handlePinCodeChange} 
                    required 
                  />
                  {isLookingUpPincode && (
                    <div className="affix-loader">
                      <RotateCw size={16} className="animate-spin text-emerald" />
                    </div>
                  )}
                </div>
                {pincodeStatusMessage && (
                  <div className={`pincode-status-chip ${pincodeStatusMessage.startsWith('✓') ? 'chip-success' : 'chip-warning'}`}>
                    {pincodeStatusMessage.startsWith('✓') ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>{pincodeStatusMessage}</span>
                  </div>
                )}
                {formErrors.pinCode && <span className="field-error-text">{formErrors.pinCode}</span>}
              </div>

              {/* City & State (Auto-populated from PIN code) */}
              <div className="form-row two-cols">
                <div className="form-group">
                  <label className="field-label">City / Town <span className="req-star">*</span></label>
                  <input 
                    type="text" 
                    name="city" 
                    className={`form-control ${formErrors.city ? 'is-invalid' : ''}`} 
                    placeholder="City / Town" 
                    autoComplete="address-level2"
                    value={formData.city} 
                    onChange={handleChange} 
                    required 
                  />
                  {formErrors.city && <span className="field-error-text">{formErrors.city}</span>}
                </div>
                <div className="form-group">
                  <label className="field-label">State <span className="req-star">*</span></label>
                  <select name="state" className="form-control form-select" value={formData.state} onChange={handleChange}>
                    {INDIAN_STATES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                  {formErrors.state && <span className="field-error-text">{formErrors.state}</span>}
                </div>
              </div>

              {/* Street Address */}
              <div className="form-group">
                <label className="field-label">Flat / House No., Road, Locality <span className="req-star">*</span></label>
                <input 
                  type="text" 
                  name="address" 
                  className={`form-control ${formErrors.address ? 'is-invalid' : ''}`} 
                  placeholder="e.g. House #24, Near Hazratganj Metro Gate 1, Civil Lines" 
                  autoComplete="address-line1"
                  value={formData.address} 
                  onChange={handleChange} 
                  required 
                />
                {formErrors.address && <span className="field-error-text">{formErrors.address}</span>}
              </div>

              {/* Apartment / Landmark */}
              <div className="form-group">
                <label className="field-label">Apartment, Suite, Landmark <span className="optional-text">(Optional)</span></label>
                <input 
                  type="text" 
                  name="apartment" 
                  className="form-control" 
                  placeholder="e.g. 2nd Floor, Opposite Clock Tower" 
                  autoComplete="address-line2"
                  value={formData.apartment} 
                  onChange={handleChange} 
                />
              </div>

              {/* Mobile Phone with +91 Country Badge */}
              <div className="form-group">
                <label className="field-label">Mobile Number <span className="req-star">*</span></label>
                <div className="phone-prefix-wrap">
                  <span className="phone-flag-pill">🇮🇳 +91</span>
                  <input 
                    type="tel" 
                    name="phone" 
                    className={`form-control phone-input ${formErrors.phone ? 'is-invalid' : ''}`} 
                    placeholder="10-digit mobile number" 
                    autoComplete="tel"
                    maxLength={10}
                    value={formData.phone} 
                    onChange={handlePhoneChange} 
                    required 
                  />
                </div>
                <span className="field-help-subtext">Used for Trackon parcel tracking and courier delivery updates.</span>
                {formErrors.phone && <span className="field-error-text">{formErrors.phone}</span>}
              </div>

              <label className="custom-checkbox mt-1">
                <input type="checkbox" name="saveInfo" checked={formData.saveInfo} onChange={handleChange} />
                <span>Save this address securely for future orders</span>
              </label>
            </div>

            {/* Step 3: Shipping Method */}
            <div className="checkout-card">
              <div className="card-header">
                <div className="step-circle">3</div>
                <div>
                  <h3 className="card-title">Shipping Method</h3>
                  <p className="card-subtitle">Fast, tracked delivery across India</p>
                </div>
              </div>
              <div className="shipping-select-card selected">
                <div className="shipping-card-left">
                  <input type="radio" name="shippingMethod" checked readOnly />
                  <div className="shipping-icon-circle">
                    <Truck size={18} color="var(--color-primary)" />
                  </div>
                  <div className="shipping-card-meta">
                    <strong>Standard Express Courier (3–5 Working Days)</strong>
                    <span>Safe doorstep delivery with automated SMS tracking</span>
                  </div>
                </div>
                <div className="shipping-card-price">
                  {shippingFee === 0 ? <span className="free-tag">FREE</span> : <strong>₹{shippingFee.toFixed(2)}</strong>}
                </div>
              </div>
            </div>

            {/* Step 4: Payment Method */}
            <div className="checkout-card">
              <div className="card-header">
                <div className="step-circle">4</div>
                <div>
                  <h3 className="card-title">Payment Method</h3>
                  <p className="card-subtitle">All transactions are encrypted and processed securely by Razorpay</p>
                </div>
              </div>
              <div className="payment-select-card selected">
                <div className="payment-card-top">
                  <div className="payment-card-title-group">
                    <CreditCard size={22} color="var(--color-primary)" />
                    <div>
                      <strong className="payment-main-title">⚡ Razorpay Secure Checkout</strong>
                      <span className="payment-sub-title">UPI (Google Pay, PhonePe, Paytm), Cards & NetBanking</span>
                    </div>
                  </div>
                  <span className="payment-secure-badge">
                    <ShieldCheck size={13} /> 100% Secure
                  </span>
                </div>
                <div className="payment-chips-strip">
                  <span className="p-chip">GPay</span>
                  <span className="p-chip">PhonePe</span>
                  <span className="p-chip">Paytm</span>
                  <span className="p-chip">UPI</span>
                  <span className="p-chip">Debit / Credit Card</span>
                  <span className="p-chip">NetBanking</span>
                </div>
              </div>
            </div>

            {/* Pay Now Button */}
            <button 
              type="submit" 
              disabled={isSubmitting || cartItems.length === 0} 
              className="btn-pay-securely"
            >
              <Lock size={18} />
              <span>{isSubmitting ? 'Securing Transaction...' : `Pay ₹${finalTotal.toFixed(2)} Securely`}</span>
              <ArrowRight size={18} />
            </button>

            {/* Bottom Trust Strip */}
            <div className="checkout-trust-row">
              <div className="trust-pill"><ShieldCheck size={16} color="#16a34a" /> Bank-Grade 256-Bit SSL</div>
              <div className="trust-pill"><Check size={16} color="#16a34a" /> FSSAI Certified Heritage Quality</div>
              <div className="trust-pill"><Truck size={16} color="#16a34a" /> Doorstep Tracked Delivery</div>
            </div>

            {/* Footer Policy Links */}
            <div className="checkout-legal-links">
              <Link to="/returns">Returns policy</Link>
              <span className="link-divider">•</span>
              <Link to="/shipping">Shipping policy</Link>
              <span className="link-divider">•</span>
              <Link to="/privacy">Privacy policy</Link>
              <span className="link-divider">•</span>
              <Link to="/terms">Terms of service</Link>
            </div>
          </form>
        </div>

        {/* Right Sticky Sidebar (Order Summary) */}
        <div className="checkout-sidebar">
          <div className="order-summary-box">
            
            <div className="summary-title-row">
              <h3 className="summary-main-heading">
                <span>Order Summary</span>
                <span className="summary-count-badge">({totalMasalaUnits})</span>
              </h3>
              {isBundle && (
                <span className="summary-byb-pill"><Crown size={12} /> BYB Order</span>
              )}
            </div>

            {/* Items List */}
            <div className="summary-items-list">
              {cartItems.map((item) => {
                const itemId = item.cartItemId || `${item.id}__${item.weight || '50g'}`;
                return (
                  <div key={itemId} className="summary-product-row">
                    <div className="product-thumb-box">
                      <span className="product-qty-tag">{item.quantity}</span>
                      <img 
                        src={item.image || item.images?.[0]} 
                        alt={item.name} 
                        className="product-thumb-img" 
                      />
                    </div>
                    <div className="product-details-col">
                      <div className="product-name-row">
                        <span className="product-name">{item.name}</span>
                        {isBundle && <span className="product-byb-tag">BYB</span>}
                      </div>
                      <span className="product-weight-pack">• {item.weight || '50g'}</span>
                      <div className="product-stepper">
                        <button 
                          type="button"
                          onClick={() => updateQuantity(itemId, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="stepper-btn"
                        >
                          -
                        </button>
                        <span className="stepper-count">{item.quantity}</span>
                        <button 
                          type="button"
                          onClick={() => updateQuantity(itemId, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="stepper-btn"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="product-price-col">
                      <span className="product-line-price">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(itemId)}
                        title="Remove item"
                        className="btn-trash-item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Complimentary BYB Gift Box Row */}
              {isBundle && (
                <div className="summary-gift-card">
                  <div className="gift-card-icon-box">
                    <span className="gift-qty-badge">2</span>
                    <Gift size={18} color="#047857" />
                  </div>
                  <div className="gift-card-meta">
                    <span className="gift-card-title">2x Mini Masala Boxes (Assorted Pack)</span>
                    <span className="gift-card-subtitle">Complimentary Royal Chef Curation</span>
                  </div>
                  <span className="gift-free-badge">FREE</span>
                </div>
              )}

              {cartItems.length === 0 && (
                <div className="summary-empty-state">
                  <ShoppingBag size={36} className="empty-bag-icon" />
                  <p>Your cart is currently empty.</p>
                  <Link to="/products" className="btn-browse-spices">
                    Browse Spices
                  </Link>
                </div>
              )}
            </div>

            {/* Totals & Coupon Section */}
            {cartItems.length > 0 && (
              <div className="summary-totals-wrapper">
                
                {/* Coupon Form */}
                <form onSubmit={handleCouponSubmit} className="coupon-submit-form">
                  <div className="coupon-input-wrap">
                    <Tag size={15} className="coupon-tag-icon" />
                    <input
                      type="text"
                      placeholder="Coupon or promo code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="coupon-field"
                    />
                    <button type="submit" className="btn-apply-coupon">
                      Apply
                    </button>
                  </div>
                </form>

                {appliedCoupon && (
                  <div className="active-coupon-chip">
                    <div className="coupon-chip-left">
                      <CheckCircle2 size={14} />
                      <span>Coupon applied: <strong>{appliedCoupon.code}</strong></span>
                    </div>
                    <button type="button" onClick={removeCoupon} className="btn-remove-coupon">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {couponError && <p className="coupon-err-text">{couponError}</p>}

                {/* Subtotal, Discount, Shipping, Total */}
                <div className="totals-table">
                  <div className="total-line">
                    <span className="line-label">Subtotal</span>
                    <span className="line-val">₹{subtotal.toFixed(2)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="total-line discount-line">
                      <span className="line-label">
                        {isBundle
                          ? (appliedCoupon ? `Special Discount (BYB Order • ${appliedCoupon.code})` : 'Special Discount (Build Your Bundle 10% OFF)')
                          : (appliedCoupon ? `Discount (${appliedCoupon.code})` : 'Discount')
                        }
                      </span>
                      <span className="line-val">-₹{discount.toFixed(2)}</span>
                    </div>
                  )}

                  {isBundle && (
                    <div className="total-line gift-line">
                      <span className="line-label">
                        <Gift size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                        2 Mini Masala Boxes
                      </span>
                      <span className="line-val gift-val">FREE (Included)</span>
                    </div>
                  )}

                  <div className="total-line">
                    <span className="line-label">Standard Shipping</span>
                    <span className="line-val">{shippingFee === 0 ? 'FREE' : `₹${shippingFee.toFixed(2)}`}</span>
                  </div>

                  <div className="total-line grand-total-line">
                    <span className="grand-label">Total Amount</span>
                    <span className="grand-val">
                      <span className="currency-tag">INR</span> ₹{finalTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <p className="summary-taxes-note">All taxes inclusive • 100% Encrypted & Secure Checkout</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Simulated/Mock Payment Modal if credentials not configured */}
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
