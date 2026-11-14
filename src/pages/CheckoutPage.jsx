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
  Gift,
  Truck,
  Tag,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Sparkles
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

  // Accurate post-discount GST (5% inclusive on net goods amount)
  const netGoodsAmount = isTestCoupon ? 1 : Math.max(0, subtotal - discount);
  const inclusiveGst = Math.round((netGoodsAmount * 0.05 / 1.05) * 100) / 100;
  const taxableGoodsAmount = Math.round((netGoodsAmount - inclusiveGst) * 100) / 100;

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
  const [toastError, setToastError] = useState(null);

  // Auto-dismiss toast error after 5s
  useEffect(() => {
    if (toastError) {
      const timer = setTimeout(() => {
        setToastError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastError]);

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
    if (toastError?.field === name) {
      setToastError(null);
    }
  };

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, phone: digitsOnly }));
    if (formErrors.phone) {
      setFormErrors(prev => ({ ...prev, phone: '' }));
    }
    if (toastError?.field === 'phone') {
      setToastError(null);
    }
  };

  // PIN Code First: Auto-lookup City and State
  const handlePinCodeChange = async (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setFormData(prev => ({ ...prev, pinCode: digitsOnly }));
    if (formErrors.pinCode) {
      setFormErrors(prev => ({ ...prev, pinCode: '' }));
    }
    if (toastError?.field === 'pinCode') {
      setToastError(null);
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
    if (toastError?.field === name) {
      setToastError(null);
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
      errors.pinCode = 'Please enter a valid 6-digit Indian PIN code.';
    }

    if (!formData.city.trim()) errors.city = 'City / Town is required.';
    if (!formData.state.trim()) errors.state = 'State is required.';
    if (!formData.address.trim()) errors.address = 'Street address is required.';

    if (!formData.phone.trim()) {
      errors.phone = 'Mobile number is required.';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      errors.phone = 'Please enter a valid 10-digit Indian mobile number.';
    }

    setFormErrors(errors);
    const hasErrors = Object.keys(errors).length > 0;

    if (hasErrors) {
      // Find first error in visual order
      const visualOrder = ['email', 'firstName', 'lastName', 'pinCode', 'city', 'state', 'address', 'phone'];
      const firstKey = visualOrder.find(k => errors[k]) || Object.keys(errors)[0];
      const errorMsg = errors[firstKey];

      // Show popup toast
      setToastError({
        field: firstKey,
        message: errorMsg
      });

      // Move / scroll the user smoothly to that section
      setTimeout(() => {
        const targetEl = document.getElementById(firstKey) || document.querySelector(`[name="${firstKey}"]`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetEl.focus();
        }
      }, 50);
    }

    return !hasErrors;
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

  // Render Luxury Empty Cart State when cart is empty
  if (cartItems.length === 0) {
    return (
      <div className="checkout-page empty-checkout-page">
        <div className="checkout-empty-container">
          <div className="checkout-empty-card">
            <div className="empty-card-icon-wrap">
              <ShoppingBag size={42} className="empty-cart-icon text-emerald" />
              <span className="empty-icon-badge">0</span>
            </div>

            <span className="empty-royal-pill">👑 KABGEER MASALE</span>
            <h1 className="empty-card-title">Your Spice Box is Empty</h1>
            <p className="empty-card-desc">
              You don't have any masalas in your cart to checkout. 
              Explore our handcrafted 65-year-old authentic Lucknowi formulations or build a bespoke bundle with 10% flat savings and complimentary chef's sample boxes!
            </p>

            <div className="empty-card-actions">
              <Link to="/products" className="btn-empty-primary">
                <span>Explore Royal Masalas</span>
                <ChevronRight size={16} />
              </Link>
              <Link to="/build-bundle" className="btn-empty-secondary">
                <Crown size={15} color="#b59226" />
                <span>Build Your Bundle (Save 10%)</span>
              </Link>
            </div>

            <div className="empty-trust-features">
              <div className="empty-feature-item">
                <ShieldCheck size={15} className="text-emerald" />
                <span>100% Authentic Awadhi Heritage</span>
              </div>
              <div className="empty-feature-item">
                <Crown size={15} color="#b59226" />
                <span>2 Free Mini Masala Boxes on Any 4 Masalas</span>
              </div>
              <div className="empty-feature-item">
                <Truck size={15} className="text-emerald" />
                <span>Express Insured Pan-India Doorstep Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      {/* Floating Pop Notification for validation errors or unfilled info */}
      {toastError && (
        <div className="checkout-toast-pop" role="alert" aria-live="assertive">
          <div className="toast-pop-content">
            <AlertCircle size={18} className="toast-pop-icon" />
            <span className="toast-pop-text">{toastError.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setToastError(null)} 
            className="toast-pop-close"
            aria-label="Dismiss error"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div className="checkout-container">
        
        {/* Main Column (Only this side scrolls on desktop) */}
        <main className="checkout-main">
          <div className="checkout-main-content">
            
            {/* Enhanced Luxury Mobile Summary Accordion (Shopify Plus Mobile Standard) */}
            <div className="checkout-mobile-summary">
              <button
                type="button"
                className="mobile-summary-btn"
                onClick={() => setIsMobileSummaryOpen(prev => !prev)}
                aria-expanded={isMobileSummaryOpen}
              >
                <div className="mobile-btn-left">
                  <ShoppingBag size={16} className="text-emerald" />
                  <span className="mobile-toggle-text">
                    {isMobileSummaryOpen ? 'Hide order summary' : `Show order summary (${totalMasalaUnits} items)`}
                  </span>
                  <ChevronDown size={14} className={`mobile-chevron-icon ${isMobileSummaryOpen ? 'rotated' : ''}`} />
                </div>
                <div className="mobile-btn-right">
                  <span className="mobile-summary-currency">INR</span>
                  <span className="mobile-summary-total">₹{finalTotal.toFixed(2)}</span>
                </div>
              </button>

              {isMobileSummaryOpen && (
                <div className="mobile-summary-body">
                  {/* Meta Bar: BYB Tag & Clear Cart */}
                  <div className="mobile-summary-meta-bar">
                    {isBundle ? (
                      <span className="byb-tag">👑 BYB ORDER ACTIVATED</span>
                    ) : (
                      <span className="mobile-meta-hint">{totalMasalaUnits} royal masalas</span>
                    )}
                    {cartItems.length > 0 && (
                      <button 
                        type="button" 
                        onClick={() => {
                          if (window.confirm('Are you sure you want to clear your cart?')) {
                            clearCart();
                          }
                        }}
                        className="mobile-clear-cart-btn"
                      >
                        <Trash2 size={12} />
                        <span>Clear Cart</span>
                      </button>
                    )}
                  </div>

                  {/* Items List with Interactive Steppers */}
                  <div className="mobile-items-list">
                    {cartItems.map((item) => {
                      const itemId = item.cartItemId || `${item.id}__${item.weight || '50g'}`;
                      return (
                        <div key={itemId} className="mobile-item-line">
                          <div className="mobile-thumb-wrap">
                            <img src={item.image || item.images?.[0]} alt={item.name} className="mobile-thumb" />
                            <span className="mobile-thumb-qty">{item.quantity}</span>
                          </div>
                          <div className="mobile-meta">
                            <div className="mobile-title-row">
                              <span className="mobile-title">{item.name}</span>
                              <span className="mobile-price">₹{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                            <div className="mobile-controls-row">
                              <span className="mobile-unit-hint">
                                {item.weight || '50g'}
                                {item.quantity > 1 && ` • ₹${Number(item.price).toFixed(2)} each`}
                              </span>
                              <div className="mobile-qty-stepper">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(itemId, item.quantity - 1)}
                                  className="item-qty-btn"
                                  aria-label="Decrease quantity"
                                >
                                  -
                                </button>
                                <span className="item-qty-num">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(itemId, item.quantity + 1)}
                                  className="item-qty-btn"
                                  aria-label="Increase quantity"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(itemId)}
                                  className="item-remove-btn"
                                  title="Remove item"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Complimentary Gift Box */}
                    {isBundle && (
                      <div className="mobile-item-line mobile-gift-line">
                        <div className="mobile-thumb-wrap gift-thumb-wrap">
                          <Gift size={16} color="#047857" />
                          <span className="mobile-thumb-qty">2</span>
                        </div>
                        <div className="mobile-meta">
                          <div className="mobile-title-row">
                            <span className="mobile-title text-emerald">2x Mini Masala Boxes (Sample Pack)</span>
                            <span className="mobile-price text-emerald font-bold">FREE</span>
                          </div>
                          <span className="mobile-unit-hint text-emerald">Complimentary Royal Chef Curation</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile Coupon Code Form */}
                  <form onSubmit={handleCouponSubmit} className="mobile-coupon-form">
                    <div className="mobile-coupon-input-wrap">
                      <Tag size={14} className="coupon-tag-icon" />
                      <input
                        type="text"
                        placeholder="Discount or coupon code"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="mobile-coupon-field"
                      />
                    </div>
                    <button type="submit" className="mobile-coupon-btn" disabled={!couponInput.trim()}>
                      Apply
                    </button>
                  </form>

                  {appliedCoupon && (
                    <div className="mobile-applied-coupon">
                      <span>Coupon: <strong>{appliedCoupon.code}</strong></span>
                      <button type="button" onClick={removeCoupon} className="coupon-remove-btn" title="Remove coupon">
                        <X size={13} />
                      </button>
                    </div>
                  )}
                  {couponError && <p className="coupon-error">{couponError}</p>}

                  {/* Mobile Totals Breakdown */}
                  <div className="mobile-totals-list">
                    <div className="mob-row">
                      <span>Items Subtotal</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="mob-row text-emerald font-semibold">
                        <span>Special Discount ({appliedCoupon?.code || 'Build Your Bundle 10% OFF'})</span>
                        <span>-₹{discount.toFixed(2)}</span>
                      </div>
                    )}
                    {isBundle && (
                      <div className="mob-row text-emerald">
                        <span>2 Mini Masala Boxes</span>
                        <span>FREE (Included)</span>
                      </div>
                    )}
                    <div className="mob-row">
                      <span>Standard Shipping</span>
                      <span>{shippingFee === 0 ? 'FREE' : `₹${shippingFee.toFixed(2)}`}</span>
                    </div>
                    <div className="mob-row mob-row-total">
                      <div className="mob-total-col">
                        <span className="mob-grand-title">Total</span>
                        <span className="mob-tax-note">Inclusive of ₹{inclusiveGst.toFixed(2)} GST</span>
                      </div>
                      <div className="mob-val-col">
                        <span className="mob-currency">INR</span>
                        <span className="mob-grand-amount">₹{finalTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Header with Step Progress & 256-Bit SSL Encrypted Badge */}
            <header className="checkout-header">
              <div className="checkout-step-nav">
                <span className="step-tag-pill active">
                  <span className="step-num">1</span>
                  <span className="step-text-desktop">Information & Delivery</span>
                  <span className="step-text-mobile">Information</span>
                </span>
                <ChevronRight size={12} className="step-nav-chevron" />
                <span className="step-tag-pill">
                  <span className="step-num">2</span> Payment
                </span>
              </div>
              <div className="checkout-secure-badge">
                <ShieldCheck size={13} color="#15803d" />
                <span>256-Bit SSL</span>
              </div>
            </header>

          {errorMessage && (
            <div className="checkout-alert">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Elevated BYB Notification Banner */}
          {isBundle && (
            <div className="byb-minimal-banner">
              <div className="byb-banner-left">
                <Crown size={14} className="byb-crown-icon" />
                <span><strong>Royal BYB Perks Applied:</strong> 10% Bundle Discount & 2 Free Masala Boxes Included</span>
              </div>
              <span className="byb-active-chip">APPLIED</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="checkout-form">
            
            {/* 1. Contact Section */}
            <div className="form-section">
              <div className="section-title-wrap">
                <span className="section-step-badge">01</span>
                <h2 className="section-title">Contact Information</h2>
              </div>
              <div className="form-field">
                <label className="field-label" htmlFor="email">
                  Email Address <span className="required-star">*</span>
                </label>
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
                <span>Email me with exclusive recipe tips and order updates</span>
              </label>
            </div>

            {/* 2. Delivery Section (PIN CODE FIRST!) */}
            <div className="form-section">
              <div className="section-title-wrap">
                <span className="section-step-badge">02</span>
                <h2 className="section-title">Delivery Address</h2>
              </div>

              {/* Name Row */}
              <div className="grid-2-cols">
                <div className="form-field">
                  <label className="field-label" htmlFor="firstName">
                    First Name <span className="required-star">*</span>
                  </label>
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
                  <label className="field-label" htmlFor="lastName">
                    Last Name <span className="required-star">*</span>
                  </label>
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
                  <label className="field-label" htmlFor="pinCode">
                    PIN Code <span className="required-star">*</span>
                  </label>
                  {isLookingUpPincode && <span className="pincode-status locating">Locating delivery hub...</span>}
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
                  <label className="field-label" htmlFor="city">
                    City / Town <span className="required-star">*</span>
                  </label>
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
                  <label className="field-label" htmlFor="state">
                    State <span className="required-star">*</span>
                  </label>
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
                <label className="field-label" htmlFor="address">
                  Flat, House No., Building, Street <span className="required-star">*</span>
                </label>
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
                <label className="field-label" htmlFor="apartment">
                  Apartment, Suite, Landmark <span className="optional-tag">(optional)</span>
                </label>
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

              {/* Phone with +91 Country Tag */}
              <div className="form-field">
                <label className="field-label" htmlFor="phone">
                  Phone Number <span className="required-star">*</span>
                </label>
                <div className="phone-input-group">
                  <span className="phone-prefix-tag">
                    <span className="flag-icon">🇮🇳</span>
                    <span className="prefix-num">+91</span>
                  </span>
                  <input 
                    id="phone"
                    type="tel" 
                    name="phone" 
                    className={`field-input phone-input ${formErrors.phone ? 'input-err' : ''}`} 
                    placeholder="10-digit mobile number" 
                    autoComplete="tel"
                    maxLength={10}
                    value={formData.phone} 
                    onChange={handlePhoneChange} 
                    required 
                  />
                </div>
                {formErrors.phone && <span className="field-err">{formErrors.phone}</span>}
              </div>

              <label className="checkbox-row mt-2">
                <input type="checkbox" name="saveInfo" checked={formData.saveInfo} onChange={handleChange} />
                <span>Save this delivery information for next time</span>
              </label>
            </div>

            {/* 3. Shipping Method Section */}
            <div className="form-section">
              <div className="section-title-wrap">
                <span className="section-step-badge">03</span>
                <h2 className="section-title">Shipping Method</h2>
              </div>
              <div className="shipping-option-card selected">
                <div className="option-card-left">
                  <div className="custom-radio checked">
                    <span className="radio-inner-dot"></span>
                  </div>
                  <div className="option-text-group">
                    <span className="option-primary-title">Standard Express Courier</span>
                    <span className="option-subtitle">3–5 Business Days • Pan-India Tracked Dispatch</span>
                  </div>
                </div>
                <span className="option-price-tag">
                  {shippingFee === 0 ? 'FREE' : `₹${shippingFee.toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* 4. Payment Section */}
            <div className="form-section">
              <div className="section-title-wrap">
                <span className="section-step-badge">04</span>
                <h2 className="section-title">Payment Options</h2>
              </div>
              
              <div className="payment-option-card selected">
                <div className="payment-card-main">
                  <div className="option-card-left">
                    <div className="custom-radio checked">
                      <span className="radio-inner-dot"></span>
                    </div>
                    <div className="option-text-group">
                      <div className="payment-title-row">
                        <span className="option-primary-title">Razorpay Secure Online Checkout</span>
                        <div className="payment-trust-chips">
                          <span className="pay-chip">UPI</span>
                          <span className="pay-chip">Cards</span>
                          <span className="pay-chip">NetBanking</span>
                        </div>
                      </div>
                      <span className="option-subtitle">Instant UPI (Google Pay, PhonePe, Paytm), Debit/Credit Cards & NetBanking</span>
                    </div>
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
              <Lock size={17} />
              <span>{isSubmitting ? 'Securing Order...' : `Pay Securely • ₹${finalTotal.toFixed(2)}`}</span>
            </button>

            {/* High-Trust Guarantee Row */}
            <div className="checkout-trust-row">
              <div className="trust-item">
                <ShieldCheck size={14} className="trust-icon" />
                <span>100% Authentic Awadhi Spices</span>
              </div>
              <div className="trust-item">
                <Lock size={14} className="trust-icon" />
                <span>Zero Storage of Card Data</span>
              </div>
              <div className="trust-item">
                <Truck size={14} className="trust-icon" />
                <span>Express Pan-India Delivery</span>
              </div>
            </div>

            {/* Clean Footer Policy Links */}
            <div className="checkout-footer-links">
              <Link to="/returns">Refund Policy</Link>
              <span className="policy-dot">•</span>
              <Link to="/shipping">Shipping Policy</Link>
              <span className="policy-dot">•</span>
              <Link to="/privacy">Privacy Policy</Link>
              <span className="policy-dot">•</span>
              <Link to="/terms">Terms of Service</Link>
            </div>
          </form>
          </div>
        </main>

        {/* Right Sticky Sidebar (Order Summary) */}
        <aside className="checkout-sidebar">
          <div className="sidebar-sticky-wrap">
            
            <div className="sidebar-header">
              <div className="sidebar-title-group">
                <h2 className="sidebar-title">Order Summary</h2>
                <span className="sidebar-count-chip">{totalMasalaUnits} items</span>
                {isBundle && <span className="byb-tag">👑 BYB ORDER</span>}
              </div>
              {cartItems.length > 0 && (
                <button 
                  type="button" 
                  onClick={clearCart} 
                  className="clear-cart-btn" 
                  title="Remove all items from cart"
                >
                  <Trash2 size={13} />
                  <span>Clear Cart</span>
                </button>
              )}
            </div>

            {/* Items */}
            <div className="items-list">
              {cartItems.map((item) => {
                const itemId = item.cartItemId || `${item.id}__${item.weight || '50g'}`;
                return (
                  <div key={itemId} className="item-row">
                    <div className="item-thumb-box">
                      <img 
                        src={item.image || item.images?.[0]} 
                        alt={item.name} 
                        className="item-thumb-img" 
                      />
                      <span className="item-qty-badge">{item.quantity}</span>
                    </div>
                    <div className="item-meta">
                      <div className="item-title-row">
                        <span className="item-title">{item.name}</span>
                        <span className="item-price">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                      <div className="item-sub-row">
                        <span className="item-weight">
                          {item.weight || '50g'}
                          {item.quantity > 1 && (
                            <span className="unit-price-hint"> • ₹{Number(item.price).toFixed(2)} each</span>
                          )}
                        </span>
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
                    </div>
                  </div>
                );
              })}

              {/* Complimentary BYB Gift Box */}
              {isBundle && (
                <div className="gift-row">
                  <div className="gift-thumb-box">
                    <Gift size={16} color="#047857" />
                    <span className="item-qty-badge">2</span>
                  </div>
                  <div className="item-meta">
                    <div className="item-title-row">
                      <span className="item-title text-emerald">2x Mini Masala Boxes (Sample Pack)</span>
                      <span className="item-price text-emerald font-bold">FREE</span>
                    </div>
                    <span className="item-weight text-emerald">Complimentary Royal Chef Curation</span>
                  </div>
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
                  <div className="coupon-input-wrap">
                    <Tag size={15} className="coupon-tag-icon" />
                    <input
                      type="text"
                      placeholder="Discount or coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="coupon-field"
                    />
                  </div>
                  <button type="submit" className="coupon-apply-btn" disabled={!couponInput.trim()}>
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
                    <span className="totals-label">Items Subtotal</span>
                    <span className="totals-val">₹{subtotal.toFixed(2)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="totals-row text-emerald font-semibold">
                      <span className="totals-label">Special Discount ({appliedCoupon?.code || 'Build Your Bundle 10% OFF'})</span>
                      <span className="totals-val discount-val">-₹{discount.toFixed(2)}</span>
                    </div>
                  )}

                  {isBundle && (
                    <div className="totals-row text-emerald">
                      <span className="totals-label">2 Mini Masala Boxes</span>
                      <span className="totals-val gift-val">FREE (Included)</span>
                    </div>
                  )}

                  {isBundle && (
                    <div className="totals-row byb-classification-row">
                      <span className="totals-label">Order Classification</span>
                      <span className="byb-class-badge">👑 BYB ORDER</span>
                    </div>
                  )}

                  <div className="totals-row">
                    <span className="totals-label">Standard Shipping</span>
                    <span className="totals-val">{shippingFee === 0 ? 'FREE' : `₹${shippingFee.toFixed(2)}`}</span>
                  </div>

                  <div className="totals-row total-grand-row">
                    <div className="grand-label-col">
                      <span className="grand-title">Total Amount</span>
                      <span className="taxes-note">Inclusive of ₹{inclusiveGst.toFixed(2)} GST</span>
                    </div>
                    <div className="grand-val-col">
                      <span className="currency-unit">INR</span>
                      <span className="grand-amount">₹{finalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
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
