import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, User, ShoppingBag, X, ArrowUp, Home, Package, Sparkles, ChefHat, ChevronDown } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import CartDrawer from './CartDrawer';
import './Header.css';
import logo from '../assets/logo.png';

const Header = () => {
  const { getCartCount, openCartDrawer } = useCart();
  const { user, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowTopBtn(true);
      } else {
        setShowTopBtn(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <header className="header-wrapper">
        {/* Top Marquee Announcement Bar */}
        <div className="top-bar">
          <div className="top-bar-marquee">
            <div className="top-bar-content">
              <span>🌿 GHAR SE GHAR TAK <span className="gold-accent">•</span> PURE LUCKNAVI SPICES & RICH FLAVOURS</span>
              <span>🚚 FRESHLY PACKED <span className="gold-accent">•</span> FREE DELIVERY ACROSS INDIA</span>
              <span>✨ 100% PURE & NATURAL <span className="gold-accent">•</span> NO ADDED PRESERVATIVES</span>
              <span>🌿 GHAR SE GHAR TAK <span className="gold-accent">•</span> PURE LUCKNAVI SPICES & RICH FLAVOURS</span>
              <span>🚚 FRESHLY PACKED <span className="gold-accent">•</span> FREE DELIVERY ACROSS INDIA</span>
            </div>
            <div className="top-bar-content" aria-hidden="true">
              <span>🌿 GHAR SE GHAR TAK <span className="gold-accent">•</span> PURE LUCKNAVI SPICES & RICH FLAVOURS</span>
              <span>🚚 FRESHLY PACKED <span className="gold-accent">•</span> FREE DELIVERY ACROSS INDIA</span>
              <span>✨ 100% PURE & NATURAL <span className="gold-accent">•</span> NO ADDED PRESERVATIVES</span>
              <span>🌿 GHAR SE GHAR TAK <span className="gold-accent">•</span> PURE LUCKNAVI SPICES & RICH FLAVOURS</span>
              <span>🚚 FRESHLY PACKED <span className="gold-accent">•</span> FREE DELIVERY ACROSS INDIA</span>
            </div>
          </div>
        </div>

        {/* Main Desktop Header */}
        <div className="main-header">
          <div className="container header-inner">
            <div className="logo-container">
              <Link to="/" className="logo-link">
                <img src={logo} alt="Kabgeer Masale Logo" className="header-brand-logo" />
              </Link>
            </div>

            <nav className="desktop-nav">
              <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                <Home size={17} /> Home
              </NavLink>
              <NavLink to="/products" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                <Package size={17} /> Products <ChevronDown size={14} className="dropdown-arrow" />
              </NavLink>
              <NavLink to="/bundle" className={({ isActive }) => isActive ? "nav-link bundle-link active" : "nav-link bundle-link"}>
                <Sparkles size={17} /> Build Your Bundle
              </NavLink>
              <NavLink to="/recipes" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                <ChefHat size={17} /> Recipes
              </NavLink>
            </nav>

            <div className="header-actions">
              {isSearchOpen ? (
                <form onSubmit={handleSearchSubmit} className="header-search-form">
                  <input
                    type="text"
                    placeholder="Search masalas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="header-search-input"
                  />
                  <button type="button" onClick={() => setIsSearchOpen(false)} className="icon-btn close-search-btn">
                    <X size={16} />
                  </button>
                </form>
              ) : (
                <button className="icon-btn" aria-label="Search" onClick={() => setIsSearchOpen(true)}>
                  <Search size={20} />
                </button>
              )}

              <Link to={user ? (isAdmin ? "/admin" : "/account") : "/login"} className="icon-btn user-btn" aria-label={isAdmin ? "Admin Portal" : "Account"}>
                <User size={20} />
              </Link>

              <button
                className="icon-btn cart-btn"
                onClick={openCartDrawer}
                aria-label="Cart"
              >
                <ShoppingBag size={20} />
                {getCartCount() > 0 && (
                  <span className="cart-badge">{getCartCount()}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Slide-Out Cart Drawer */}
      <CartDrawer />

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <NavLink to="/" className={({ isActive }) => isActive ? "mobile-nav-item active" : "mobile-nav-item"}>
          <Home size={20} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/products" className={({ isActive }) => isActive ? "mobile-nav-item active" : "mobile-nav-item"}>
          <Package size={20} />
          <span>Products</span>
        </NavLink>
        <NavLink to="/bundle" className={({ isActive }) => isActive ? "mobile-nav-item active" : "mobile-nav-item"}>
          <Sparkles size={20} />
          <span>Bundle</span>
        </NavLink>
        <NavLink to="/recipes" className={({ isActive }) => isActive ? "mobile-nav-item active" : "mobile-nav-item"}>
          <ChefHat size={20} />
          <span>Recipes</span>
        </NavLink>
        <button
          type="button"
          onClick={openCartDrawer}
          className="mobile-nav-item cart-item"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <div className="mobile-cart-wrapper">
            <ShoppingBag size={20} />
            {getCartCount() > 0 && (
              <span className="mobile-cart-badge">{getCartCount()}</span>
            )}
          </div>
          <span>Cart</span>
        </button>
      </nav>

      {/* Scroll to Top Button */}
      <button 
        className={`scroll-top-btn ${showTopBtn ? 'show' : ''}`} 
        onClick={scrollToTop}
        aria-label="Scroll to top"
      >
        <ArrowUp size={22} />
      </button>
    </>
  );
};

export default Header;
