import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Info, CreditCard, Lock, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import MockPaymentModal from '../components/MockPaymentModal';
import emailjs from '@emailjs/browser';
import './CheckoutPage.css';

const CheckoutPage = () => {
  const { cartItems, getCartTotal, clearCart, updateQuantity, removeFromCart } = useCart();
  const { user, addOrder } = useAuth();
  
  const totalItems = cartItems.reduce((count, item) => count + item.quantity, 0);
  const isBundleEligible = totalItems >= 4;
  
  const subtotal = getCartTotal();
  const discountAmount = isBundleEligible ? subtotal * 0.10 : 0;
  const discountedSubtotal = subtotal - discountAmount;
  
  const tax = discountedSubtotal * 0.05; // Dummy tax
  const shippingFee = cartItems.length > 0 ? 50 : 0;
  const total = discountedSubtotal + tax + shippingFee;
  const navigate = useNavigate();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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

  React.useEffect(() => {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (orderId) => {
    // Format cart items for the dynamic template
    const ordersArray = cartItems.map(item => ({
      name: item.name,
      units: item.quantity,
      price: item.price,
      image_url: window.location.origin + item.image
    }));
    
    const templateParams = {
      order_id: orderId,
      email: formData.email,
      customer_name: `${formData.firstName} ${formData.lastName}`,
      customer_phone: formData.phone,
      shipping_address: `${formData.address}, ${formData.apartment ? formData.apartment + ', ' : ''}${formData.city}, ${formData.state} - ${formData.pinCode}`,
      
      // Values expected by your specific EmailJS template
      orders: ordersArray,
      cost: {
        shipping: shippingFee.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2)
      }
    };

    // Send email using EmailJS
    emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID',
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID',
      templateParams,
      { publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY' }
    ).then((response) => {
       console.log('Order email sent successfully!', response.status, response.text);
    }).catch((err) => {
       console.error('Failed to send order email:', err);
       alert("Email sending failed! Error: " + JSON.stringify(err));
    });

    addOrder({
      id: orderId,
      items: cartItems,
      total: total,
      shipping: formData
    });
    setShowPaymentModal(false);
    clearCart();
    navigate(`/order-success?id=${orderId}`);
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
          
          <form onSubmit={handleSubmit}>
            {/* Contact Section */}
            <div className="checkout-section">
              <div className="section-header">
                <h3>Contact</h3>
                <Link to="/login" className="login-link">Sign in</Link>
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
                Enter your shipping address to view available shipping methods.
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

            <button type="submit" className="btn btn-primary btn-large w-100 mt-2" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} /> Pay now
            </button>

            <div className="trust-badge-container">
              <div className="trust-badge"><ShieldCheck size={18} color="#16a34a" /> SSL Encrypted</div>
              <div className="trust-badge"><Lock size={18} color="#16a34a" /> Secure Checkout</div>
            </div>

            <div className="checkout-footer-links mt-4 text-sm text-accent">
              <Link to="/refund-policy">Refund policy</Link>
              <Link to="/shipping-policy">Shipping</Link>
              <Link to="/privacy-policy">Privacy policy</Link>
              <Link to="/terms-of-service">Terms of service</Link>
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
                          if (item.quantity > 2) {
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

            <div className="discount-form mt-3">
              <input type="text" className="form-input" placeholder="Discount code" />
              <button className="btn btn-outline" type="button" onClick={() => alert('Invalid discount code.')}>Apply</button>
            </div>

            <div className="summary-totals mt-3">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {isBundleEligible && (
                <div className="summary-row text-accent" style={{ color: '#16a34a' }}>
                  <span>Bundle Discount (10%)</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              {isBundleEligible && (
                <div className="summary-row text-accent" style={{ color: '#16a34a', fontSize: '0.85rem' }}>
                  <span>🎁 2 Free Mini Masala Boxes</span>
                  <span>Included</span>
                </div>
              )}
              <div className="summary-row">
                <span>Shipping</span>
                <span>₹{shippingFee.toFixed(2)}</span>
              </div>
              <div className="summary-row total-row mt-2">
                <span>Total</span>
                <span className="total-price"><span className="currency-code">INR</span> ₹{total.toFixed(2)}</span>
              </div>
              <p className="tax-info text-sm text-text-light mt-1">Including ₹{tax.toFixed(2)} in taxes</p>
            </div>
          </div>
        </div>
      </div>
      
      {showPaymentModal && (
        <MockPaymentModal 
          amount={total} 
          onClose={() => setShowPaymentModal(false)} 
          onSuccess={handlePaymentSuccess} 
        />
      )}
    </div>
  );
};

export default CheckoutPage;
