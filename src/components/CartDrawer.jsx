import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingBag, Plus, Minus, Trash2, Tag, ArrowRight, Truck, Sparkles, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { PRODUCTS } from '../data/products';
import './CartDrawer.css';

const FREE_SHIPPING_THRESHOLD = 399;

const CartDrawer = () => {
  const {
    cartItems,
    isCartDrawerOpen,
    closeCartDrawer,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartTotal,
    addToCart,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    getDiscountAmount
  } = useCart();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const navigate = useNavigate();

  if (!isCartDrawerOpen) return null;

  const subtotal = getCartTotal();
  const discount = getDiscountAmount();
  const finalTotal = Math.max(0, subtotal - discount);
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  // Filter 2 add-on products not yet in cart
  const addOnProducts = PRODUCTS.filter(p => !cartItems.some(item => item.id === p.id)).slice(0, 2);

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

  const handleCheckoutClick = () => {
    closeCartDrawer();
    navigate('/checkout');
  };

  return (
    <div className="cart-drawer-overlay" onClick={closeCartDrawer}>
      <div className="cart-drawer-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="cart-drawer-header">
          <div className="drawer-title-row">
            <ShoppingBag size={22} className="drawer-title-icon" />
            <h3>Your Spice Box</h3>
            <span className="drawer-count-pill">{cartItems.reduce((acc, i) => acc + i.quantity, 0)}</span>
          </div>
          <button className="drawer-close-btn" onClick={closeCartDrawer} aria-label="Close cart">
            <X size={20} />
          </button>
        </div>

        {/* Free Shipping Progress Bar */}
        <div className="free-shipping-bar-container">
          {amountToFreeShipping > 0 ? (
            <p className="shipping-bar-text">
              Add <strong className="gold-text">₹{amountToFreeShipping}.00</strong> more to unlock <strong className="green-text">FREE Express Shipping</strong> across India! 🚚
            </p>
          ) : (
            <p className="shipping-bar-text green-text">
              🎉 Congratulations! You unlocked <strong className="green-text">FREE Express Shipping</strong>!
            </p>
          )}
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${freeShippingProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Cart Content */}
        <div className="cart-drawer-body">
          {cartItems.length === 0 ? (
            <div className="empty-drawer-state">
              <ShoppingBag size={48} className="empty-drawer-icon" />
              <h4>Your Spice Box is Empty</h4>
              <p>Explore our 65-year-old authentic Lucknavi masalas and build your flavor collection.</p>
              <button
                className="btn-browse-masalas"
                onClick={() => { closeCartDrawer(); navigate('/products'); }}
              >
                Browse Masalas <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <>
              {/* Item Rows */}
              <div className="drawer-item-list">
                {cartItems.map((item) => (
                  <div key={item.id} className="drawer-item-card">
                    <div className="drawer-item-img-wrapper">
                      <img src={item.image || item.images?.[0]} alt={item.name} />
                    </div>
                    <div className="drawer-item-info">
                      <h4 className="drawer-item-title">{item.name}</h4>
                      <p className="drawer-item-weight">• {item.weight || (item.weightInGrams ? `${item.weightInGrams}g` : '50g')}</p>
                      
                      <div className="drawer-item-controls">
                        <div className="qty-picker">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity">
                            <Minus size={14} />
                          </button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Increase quantity">
                            <Plus size={14} />
                          </button>
                        </div>

                        <span className="drawer-item-total">₹{(item.price * item.quantity).toFixed(2)}</span>

                        <button
                          className="drawer-trash-btn"
                          onClick={() => removeFromCart(item.id)}
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Frequently Bought Together Add-ons */}
              {addOnProducts.length > 0 && (
                <div className="drawer-addons-section">
                  <h4 className="addons-heading"><Sparkles size={14} /> Frequently Bought Together</h4>
                  <div className="addons-grid">
                    {addOnProducts.map(addon => (
                      <div key={addon.id} className="addon-card">
                        <img src={addon.image} alt={addon.name} className="addon-img" />
                        <div className="addon-info">
                          <span className="addon-name">{addon.name}</span>
                          <span className="addon-price">₹{addon.price}.00</span>
                        </div>
                        <button
                          className="btn-add-addon"
                          onClick={() => addToCart(addon, 1)}
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer & Checkout Action */}
        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            
            {/* Coupon Code Input */}
            <form onSubmit={handleCouponSubmit} className="coupon-form">
              <div className="coupon-input-wrapper">
                <Tag size={16} className="coupon-icon" />
                <input
                  type="text"
                  placeholder="Coupon code (e.g. KABGEER10)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className="coupon-input"
                />
                <button type="submit" className="btn-apply-coupon">Apply</button>
              </div>
            </form>

            {appliedCoupon && (
              <div className="applied-coupon-pill">
                <span>Applied: <strong>{appliedCoupon.code}</strong> ({appliedCoupon.description})</span>
                <button onClick={removeCoupon} className="remove-coupon-btn"><X size={14} /></button>
              </div>
            )}

            {couponError && <p className="coupon-error-text">{couponError}</p>}

            {/* Financial Summary */}
            <div className="drawer-summary-box">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="summary-row discount-row">
                  <span>Discount ({appliedCoupon?.code})</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Shipping</span>
                <span className={amountToFreeShipping === 0 ? "green-text" : ""}>
                  {amountToFreeShipping === 0 ? "FREE" : "Calculated at checkout"}
                </span>
              </div>
              <div className="summary-row total-row">
                <span>Total</span>
                <span className="total-amount">₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <button className="btn-checkout-now" onClick={handleCheckoutClick}>
              Proceed to Checkout <ArrowRight size={18} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default CartDrawer;
