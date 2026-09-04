import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

const VALID_COUPONS = {};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeout = useRef(null);



  const showToast = (message) => {
    setToastMessage(message);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const toggleCartDrawer = () => {
    setIsCartDrawerOpen(prev => !prev);
  };

  const openCartDrawer = () => {
    setIsCartDrawerOpen(true);
  };

  const closeCartDrawer = () => {
    setIsCartDrawerOpen(false);
  };

  const addToCart = (product, quantity = 1) => {
    const weight = product.weight || '50g';
    const targetCartItemId = product.cartItemId || `${product.id}__${weight}`;
    const addQty = Math.max(1, quantity);

    setCartItems(prev => {
      const existing = prev.find(item => (item.cartItemId || `${item.id}__${item.weight || '50g'}`) === targetCartItemId);
      if (existing) {
        return prev.map(item => 
          (item.cartItemId || `${item.id}__${item.weight || '50g'}`) === targetCartItemId
            ? { ...item, quantity: item.quantity + addQty }
            : item
        );
      }
      
      const initialQty = Math.max(2, addQty);
      return [...prev, { ...product, cartItemId: targetCartItemId, quantity: initialQty }];
    });
    showToast(`${product.name} (${weight}) added to your spice box!`);
  };

  const removeFromCart = (cartItemId) => {
    setCartItems(prev => prev.filter(item => (item.cartItemId || item.id) !== cartItemId));
  };

  const updateQuantity = (cartItemId, newQuantity) => {
    if (newQuantity < 2) {
      removeFromCart(cartItemId);
      return;
    }
    setCartItems(prev => 
      prev.map(item => 
        (item.cartItemId || item.id) === cartItemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  const clearCart = () => {
    setCartItems([]);
    setAppliedCoupon(null);
  };

  const applyCoupon = (code) => {
    const cleanCode = code ? code.trim() : '';
    if (!cleanCode) return { success: false, message: 'Please enter a coupon code.' };
    return { success: false, message: 'No coupons are currently active at this time.' };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showToast('Coupon removed.');
  };

  const getBundleCartCount = () => {
    return cartItems.filter(item => item.isBundleItem).length;
  };

  const getBundleCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.isBundleItem ? item.price * item.quantity : 0), 0);
  };

  const isBundleOfferActive = () => {
    return getBundleCartCount() >= 4;
  };

  const getDiscountAmount = () => {
    if (isBundleOfferActive()) {
      return getBundleCartTotal() * 0.10;
    }
    return 0;
  };


  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      getCartTotal,
      getCartCount,
      getBundleCartCount,
      clearCart,
      isCartDrawerOpen,
      toggleCartDrawer,
      openCartDrawer,
      closeCartDrawer,
      appliedCoupon,
      applyCoupon,
      removeCoupon,
      getDiscountAmount,
      isBundleOfferActive
    }}>
      {children}
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="cart-toast-popup" style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          backgroundColor: '#1a2f22',
          color: '#fff',
          padding: '14px 20px',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.95rem',
          fontWeight: '500',
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#d4af37',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a2f22', fontSize: '12px', fontWeight: 'bold'
          }}>
            ✓
          </div>
          {toastMessage}
        </div>
      )}
    </CartContext.Provider>
  );
};
