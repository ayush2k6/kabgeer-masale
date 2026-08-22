import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem('kabgeer_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('kabgeer_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeout = useRef(null);

  const showToast = (message) => {
    setToastMessage(message);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const addToCart = (product, quantity = 2) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { ...product, quantity: Math.max(2, quantity) }];
    });
    showToast(`${product.name} added to your cart!`);
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 2) return;
    setCartItems(prev => 
      prev.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item)
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
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      getCartTotal,
      getCartCount,
      clearCart
    }}>
      {children}
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="cart-toast-popup" style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          backgroundColor: '#3A2414',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '1rem',
          fontWeight: '500',
          transition: 'all 0.3s ease',
          animation: 'toastFadeIn 0.3s forwards'
        }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#4CAF50',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px'
          }}>
            ✓
          </div>
          {toastMessage}
        </div>
      )}
    </CartContext.Provider>
  );
};
