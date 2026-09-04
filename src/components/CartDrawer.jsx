import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
    getDiscountAmount,
    isBundleOfferActive,
    getCartCount,
    getBundleCartCount
  } = useCart();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const navigate = useNavigate();

  const location = useLocation();

  if (!isCartDrawerOpen) return null;

  const subtotal = getCartTotal();
  const discount = getDiscountAmount();
  const finalTotal = Math.max(0, subtotal - discount);
  
  const cartCount = getCartCount();
  const bundleCount = getBundleCartCount();
  const bundleOfferActive = isBundleOfferActive();
  const itemsToBundleOffer = Math.max(0, 4 - bundleCount);
  const bundleProgress = Math.min(100, (bundleCount / 4) * 100);
  const showBundleProgress = location.pathname === '/bundle' || bundleCount > 0;

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

  const totalItems = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="cart-drawer-overlay" onClick={closeCartDrawer}>
      <div className="cart-drawer-container" onClick={(e) => e.stopPropagation()}>
        
        {/* 1. Header (Fixed Top) */}
        <div className="cart-drawer-header">
          <div className="drawer-title-row">
            <ShoppingBag size={20} className="drawer-title-icon" />
            <h3 className="drawer-title">Your Cart</h3>
            <span className="drawer-items-count">
              ({totalItems} {totalItems === 1 ? 'item' : 'items'})
            </span>
          </div>
          <button className="drawer-close-btn" onClick={closeCartDrawer} aria-label="Close cart">
            <X size={20} />
          </button>
        </div>

        <div className="cart-drawer-body">
          {/* Bundle Offer Progress Bar */}
          {showBundleProgress && (
            <div className="free-shipping-bar-container" style={{ background: 'rgba(212, 175, 55, 0.05)' }}>
              <div className="shipping-bar-header">
                {!bundleOfferActive ? (
                  <p className="shipping-bar-text">
                    <strong>Build your bundle:</strong> Add <strong className="gold-text">{itemsToBundleOffer}</strong> more {itemsToBundleOffer === 1 ? 'item' : 'items'} to unlock <strong className="gold-text">10% OFF + 2 FREE Mini Boxes! 🎁</strong>
                  </p>
                ) : (
                  <p className="shipping-bar-text green-text">
                    🎉 Bundle Complete! You unlocked <strong>10% OFF + 2 FREE Mini Boxes!</strong>
                  </p>
                )}
              </div>
              <div className="progress-track" style={{ background: 'rgba(212, 175, 55, 0.15)' }}>
                <div
                  className="progress-fill"
                  style={{ width: `${bundleProgress}%`, background: 'linear-gradient(90deg, #b59226 0%, #d4af37 100%)' }}
                ></div>
              </div>
            </div>
          )}

          {cartItems.length === 0 ? (
            <div className="empty-drawer-state">
              <ShoppingBag size={48} className="empty-drawer-icon" />
              <h4>Your Cart is Empty</h4>
              <p>Explore our 65-year-old authentic Lucknavi masalas and craft unforgettable royal dishes.</p>
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
                {cartItems.map((item) => {
                  const itemId = item.cartItemId || `${item.id}__${item.weight || (item.weightInGrams ? `${item.weightInGrams}g` : '50g')}`;
                  return (
                    <div key={itemId} className="drawer-item-card">
                      <div className="drawer-item-img-wrapper">
                        <img src={item.image || item.images?.[0]} alt={item.name} />
                      </div>
                      <div className="drawer-item-info">
                        <h4 className="drawer-item-title">{item.name}</h4>
                        <p className="drawer-item-weight">• {item.weight || (item.weightInGrams ? `${item.weightInGrams}g` : '50g')}</p>
                        
                        <div className="drawer-item-controls">
                          <div className="qty-picker">
                            <button onClick={() => updateQuantity(itemId, item.quantity - 1)} aria-label="Decrease quantity">
                              <Minus size={13} />
                            </button>
                            <span>{item.quantity}</span>
                            <button onClick={() => updateQuantity(itemId, item.quantity + 1)} aria-label="Increase quantity">
                              <Plus size={13} />
                            </button>
                          </div>

                          <span className="drawer-item-total">₹{(item.price * item.quantity).toFixed(2)}</span>

                          <button
                            className="drawer-trash-btn"
                            onClick={() => removeFromCart(itemId)}
                            title="Remove item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Frequently Bought Together Add-ons (Spacious & Non-cramped) */}
              {addOnProducts.length > 0 && (
                <div className="drawer-addons-section">
                  <h4 className="addons-heading"><Sparkles size={14} className="gold-icon" /> Frequently Bought Together</h4>
                  <div className="addons-grid">
                    {addOnProducts.map(addon => (
                      <div key={addon.id} className="addon-card">
                        <div className="addon-img-wrapper">
                          <img src={addon.image} alt={addon.name} className="addon-img" />
                        </div>
                        <div className="addon-info">
                          <span className="addon-name">{addon.name}</span>
                          <span className="addon-pack-meta">{addon.weight || (addon.weightInGrams ? `${addon.weightInGrams}g` : '50g')} Pack</span>
                          <span className="addon-price">₹{addon.price}.00</span>
                        </div>
                        <button
                          className="btn-add-addon"
                          onClick={() => addToCart({ ...addon, weight: addon.weight || (addon.weightInGrams ? `${addon.weightInGrams}g` : '50g'), price: addon.price }, 1)}
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

        {/* 3. Footer & Fixed Checkout Action (Fixed Bottom) */}
        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            
            {/* Coupon Code Input */}
            <form onSubmit={handleCouponSubmit} className="coupon-form">
              <div className="coupon-input-wrapper">
                <Tag size={15} className="coupon-icon" />
                <input
                  type="text"
                  placeholder="Promo or coupon code"
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

            {/* Financial Summary with Strong Hierarchy */}
            <div className="drawer-summary-box">
              <div className="summary-row">
                <span>Subtotal</span>
                <span className="summary-val">₹{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="summary-row discount-row">
                  <span>Discount {bundleOfferActive ? '(Bundle 10% OFF)' : (appliedCoupon ? `(${appliedCoupon.code})` : '')}</span>
                  <span className="summary-val">-₹{discount.toFixed(2)}</span>
                </div>
              )}
              {bundleOfferActive && (
                <div className="summary-row" style={{ color: '#27ae60', fontWeight: '500' }}>
                  <span><Sparkles size={13} style={{marginRight: '4px', verticalAlign: 'middle'}}/> 2 Mini Masala Boxes</span>
                  <span className="summary-val">FREE</span>
                </div>
              )}
              <div className="summary-row">
                <span>Shipping</span>
                <span className="shipping-free-tag">
                  FREE
                </span>
              </div>
              <div className="summary-row total-row">
                <div className="total-label-group">
                  <span className="total-title">Total</span>
                  <span className="total-taxes-note">Inclusive of all taxes</span>
                </div>
                <span className="total-amount">₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <button className="btn-checkout-now" onClick={handleCheckoutClick}>
              <span>Proceed to Checkout</span> <ArrowRight size={18} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default CartDrawer;
