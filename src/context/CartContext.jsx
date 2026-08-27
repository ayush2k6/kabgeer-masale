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

  const addToCart = (product, quantity = 1) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      const addQty = Math.max(1, quantity);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + addQty } : item
        );
      }
      return [...prev, { ...product, quantity: addQty }];
    });
    showToast(`${product.name} added to your cart!`);
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }
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
            width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#d99026',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px'
          }}>
            ✓
          </div>
          {toastMessage}
        </div>
      )}
    </CartContext.Provider>
  );
};
