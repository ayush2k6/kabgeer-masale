import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Info, CreditCard, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import MockPaymentModal from '../components/MockPaymentModal';
import emailjs from '@emailjs/browser';
import { supabase } from '../lib/supabaseClient';
import './CheckoutPage.css';

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
  const { cartItems, getCartTotal, clearCart, updateQuantity, removeFromCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const subtotal = getCartTotal();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingServerOrder, setPendingServerOrder] = useState(null);

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
        firstName: user.name ? user.name.split(' ')[0] : prev.firstName,
        lastName: user.name ? user.name.split(' ').slice(1).join(' ') : prev.lastName,
        phone: user.phone || prev.phone,
        address: user.address || prev.address,
        city: user.city || prev.city,
        state: user.state || prev.state,
        pinCode: user.pinCode || prev.pinCode
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

  // 1. Submit form & call create-razorpay-order Edge Function
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Zero-Trust Payload: Send ONLY product IDs and quantities (NO frontend prices or totals)
      const payload = {
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity
        })),
        shippingDetails: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          apartment: formData.apartment,
          city: formData.city,
          state: formData.state,
          pinCode: formData.pinCode,
          country: formData.country
        },
        billingAddress: formData.billingAddress
      };

      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: payload
      });

      if (error || !data?.success) {
        const errorText = error?.message || data?.error || 'Failed to create payment order.';
        setErrorMessage(errorText);
        setIsSubmitting(false);
        return;
      }

      const { orderId, displayOrderId, razorpayOrderId, amountInPaise, totalAmount, keyId, isTestMode } = data;
      const orderInfo = { orderId, displayOrderId, razorpayOrderId, amountInPaise, totalAmount, keyId };
      setPendingServerOrder(orderInfo);

      // If in simulation / test mode or unconfigured key, open test payment modal
      if (isTestMode || !keyId || keyId.includes('PENDING') || keyId.includes('PLACEHOLDER')) {
        setShowPaymentModal(true);
        setIsSubmitting(false);
        return;
      }

      // Load Razorpay Checkout JS and open payment window
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setErrorMessage('Failed to load Razorpay payment SDK. Please check your internet connection.');
        setIsSubmitting(false);
        return;
      }

      const options = {
        key: keyId,
        amount: amountInPaise,
        currency: 'INR',
        name: 'Kabgeer Masale',
        description: `Order #${displayOrderId}`,
        order_id: razorpayOrderId,
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          contact: formData.phone
        },
        theme: { color: '#0f2818' },
        handler: async (response) => {
          await handleServerPaymentVerification({
            orderId: orderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            displayOrderId: displayOrderId
          });
        },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
            setErrorMessage('Payment window was closed. Your order remains pending.');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        console.error('Razorpay payment failed:', resp.error);
        setIsSubmitting(false);
        setErrorMessage(`Payment failed: ${resp.error?.description || 'Transaction declined.'}`);
      });
      rzp.open();
    } catch (err) {
      console.error('Checkout submit error:', err);
      setErrorMessage('An unexpected error occurred during checkout.');
      setIsSubmitting(false);
    }
  };

  // 2. Server-side payment verification (verify-razorpay-payment Edge Function)
  const handleServerPaymentVerification = async (verifyPayload) => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
        body: {
          orderId: verifyPayload.orderId,
          razorpay_order_id: verifyPayload.razorpay_order_id,
          razorpay_payment_id: verifyPayload.razorpay_payment_id,
          razorpay_signature: verifyPayload.razorpay_signature
        }
      });

      if (error || !data?.success) {
        const errorMsg = error?.message || data?.error || 'Server-side payment verification failed.';
        setErrorMessage(errorMsg);
        setIsSubmitting(false);
        return;
      }

      // EmailJS confirmation email trigger (if configured)
      try {
        const ordersArray = cartItems.map(item => ({
          name: item.name,
          units: item.quantity,
          price: item.price,
          image_url: window.location.origin + item.image
        }));
        
        const templateParams = {
          order_id: verifyPayload.displayOrderId,
          email: formData.email,
          customer_name: `${formData.firstName} ${formData.lastName}`.trim(),
          customer_phone: formData.phone,
          shipping_address: `${formData.address}, ${formData.apartment ? formData.apartment + ', ' : ''}${formData.city}, ${formData.state} - ${formData.pinCode}`,
          orders: ordersArray
        };

        if (import.meta.env.VITE_EMAILJS_SERVICE_ID) {
          emailjs.send(
            import.meta.env.VITE_EMAILJS_SERVICE_ID,
            import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
            templateParams,
            import.meta.env.VITE_EMAILJS_PUBLIC_KEY
          ).catch(e => console.warn('EmailJS notice:', e));
        }
      } catch (e) {
        console.warn('EmailJS error:', e);
      }

      // ONLY clear cart & navigate after SUCCESSFUL server-side verification
      clearCart();
      setShowPaymentModal(false);
      setIsSubmitting(false);
      navigate(`/order-success?id=${verifyPayload.displayOrderId}`);
    } catch (err) {
      console.error('Verification call error:', err);
      setErrorMessage('An unexpected error occurred while verifying your payment.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-main">
          <div className="checkout-header-mobile">
            <h2>Kabgeer Masale</h2>
          </div>
          
          <div className="express-checkout">
            <button type="button" className="express-checkout-btn btn-gpay">
              Pay with Google Pay
            </button>
            <button type="button" className="express-checkout-btn btn-shoppay">
              Pay with Shop Pay
            </button>
          </div>
          <div className="divider"><span>OR</span></div>
          
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
                <h3>Contact</h3>
                {!user && <Link to="/login" className="login-link">Sign in</Link>}
              </div>
              <input 
                type="email" 
                name="email" 
                className="form-input" 
                placeholder="Email" 
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
                <span>Email me with news and offers</span>
              </label>
            </div>

            {/* Delivery Section */}
            <div className="checkout-section">
              <h3>Delivery</h3>
              <select name="country" className="form-input" value={formData.country} onChange={handleChange}>
                <option value="India">India</option>
              </select>

              <div className="form-row">
                <input type="text" name="firstName" className="form-input" placeholder="First name" value={formData.firstName} onChange={handleChange} required />
                <input type="text" name="lastName" className="form-input" placeholder="Last name" value={formData.lastName} onChange={handleChange} required />
              </div>

              <input type="text" name="company" className="form-input" placeholder="Company (optional)" value={formData.company} onChange={handleChange} />
              <input type="text" name="address" className="form-input" placeholder="Address" value={formData.address} onChange={handleChange} required />
              <input type="text" name="apartment" className="form-input" placeholder="Apartment, suite, etc. (optional)" value={formData.apartment} onChange={handleChange} />

              <div className="form-row three-cols">
                <input type="text" name="city" className="form-input" placeholder="City" value={formData.city} onChange={handleChange} required />
                <select name="state" className="form-input" value={formData.state} onChange={handleChange}>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Maharashtra">Maharashtra</option>
                </select>
                <input type="text" name="pinCode" className="form-input" placeholder="PIN code" value={formData.pinCode} onChange={handleChange} required />
              </div>

              <div className="input-with-icon">
                <input type="tel" name="phone" className="form-input" placeholder="Phone" value={formData.phone} onChange={handleChange} required />
                <Info size={16} className="input-icon text-text-light" />
              </div>

              <label className="checkbox-label mt-1">
                <input type="checkbox" name="saveInfo" checked={formData.saveInfo} onChange={handleChange} />
                <span>Save this information for next time</span>
              </label>
            </div>

            {/* Shipping Method */}
            <div className="checkout-section">
              <h3>Shipping method</h3>
              <div className="info-box text-text-light text-sm">
                Standard shipping options calculated at checkout.
              </div>
            </div>

            {/* Payment Section */}
            <div className="checkout-section">
              <h3>Payment</h3>
              <p className="text-sm text-text-light mb-2">All transactions are secure and encrypted.</p>
              
              <div className="payment-box">
                <div className="payment-header">
                  <span>Razorpay Secure</span>
                  <div className="payment-icons">
                    <span className="cc-icon visa">VISA</span>
                    <span className="cc-icon mc">MC</span>
                    <span className="cc-icon rupay">RuPay</span>
                  </div>
                </div>
                <div className="payment-body text-center text-sm text-text-light">
                  <CreditCard size={48} className="mb-2 opacity-50" style={{margin: '0 auto'}}/>
                  <p>A secure payment window will open when you click 'Pay now'.</p>
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
              <Lock size={18} /> {isSubmitting ? 'Initializing Payment...' : 'Pay now'}
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

        <div className="checkout-sidebar">
          <div className="order-summary">
            <div className="summary-items">
              {cartItems.map((item) => (
                <div key={item.id} className="summary-item">
                  <div className="summary-item-img placeholder-img" style={{ position: 'relative' }}>
                    <span className="item-badge">{item.quantity}</span>
                    {item.image ? (
                      <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px', borderRadius: '8px', backgroundColor: '#fff' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', backgroundColor: item.color || '#ddd', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                        {item.name.substring(0,2)}
                      </div>
                    )}
                  </div>
                  <div className="summary-item-details" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, paddingRight: '15px' }}>
                    <span className="item-name">{item.name}</span>
                    <div className="quantity-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        type="button"
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantity(item.id, item.quantity - 1);
                          } else {
                            removeFromCart(item.id);
                          }
                        }}
                        style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: '0.9rem', minWidth: '16px', textAlign: 'center' }}>{item.quantity}</span>
                      <button 
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="summary-item-price">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
              {cartItems.length === 0 && (
                <p className="text-sm text-text-light">Your cart is empty.</p>
              )}
            </div>

            <div className="summary-totals mt-3">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row total-row mt-2">
                <span>Items Subtotal</span>
                <span className="total-price"><span className="currency-code">INR</span> ₹{subtotal.toFixed(2)}</span>
              </div>
              <p className="tax-info text-sm text-text-light mt-1">Final taxes, shipping & discounts calculated securely by server at payment.</p>
            </div>
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
