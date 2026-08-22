import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, User, ShoppingBag, X, ArrowUp, Home, Package, Sparkles, ChefHat, ChevronDown } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './Header.css';
import logo from '../assets/logo.png';

const Header = () => {
  const { getCartCount } = useCart();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [showTopBtn, setShowTopBtn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      // Show scroll-to-top button if scrolled past 400px
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
      <div className="top-bar">
        <div className="top-bar-marquee">
          <div className="top-bar-content">
            <span>🌿 Ghar se Ghar Tak – Pure Spices. Rich Flavours.</span>
            <span>🚚 Freshly Packed • Delivered Across India</span>
            <span>🌿 Ghar se Ghar Tak – Pure Spices. Rich Flavours.</span>
            <span>🚚 Freshly Packed • Delivered Across India</span>
            <span>🌿 Ghar se Ghar Tak – Pure Spices. Rich Flavours.</span>
            <span>🚚 Freshly Packed • Delivered Across India</span>
          </div>
          <div className="top-bar-content" aria-hidden="true">
            <span>🌿 Ghar se Ghar Tak – Pure Spices. Rich Flavours.</span>
            <span>🚚 Freshly Packed • Delivered Across India</span>
            <span>🌿 Ghar se Ghar Tak – Pure Spices. Rich Flavours.</span>
            <span>🚚 Freshly Packed • Delivered Across India</span>
            <span>🌿 Ghar se Ghar Tak – Pure Spices. Rich Flavours.</span>
            <span>🚚 Freshly Packed • Delivered Across India</span>
          </div>
        </div>
      </div>
      <div className="main-header">
        <div className="container header-inner">
          <div className="logo-container" style={{ display: 'flex', alignItems: 'center' }}>
            <Link to="/" className="logo-link">
              <img src={logo} alt="Kabgeer Masale Logo" style={{ height: '90px', width: 'auto', mixBlendMode: 'multiply', margin: '-15px 0' }} />
            </Link>
          </div>

          <nav className="desktop-nav">
            <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Home size={18} strokeWidth={1.5} /> Home
            </NavLink>
            <NavLink to="/products" className={({isActive}) => isActive ? "nav-link has-dropdown active" : "nav-link has-dropdown"} style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
              <Package size={18} strokeWidth={1.5} /> Products <ChevronDown size={14} className="dropdown-arrow" />
            </NavLink>
            <NavLink to="/bundle" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a88820', fontWeight: '600' }}>
              <Sparkles size={18} strokeWidth={1.5} /> Build your Bundle
            </NavLink>
            <NavLink to="/recipes" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ChefHat size={18} strokeWidth={1.5} /> Recipes
            </NavLink>
          </nav>

          <div className="header-icons" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {isSearchOpen ? (
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-bg-alt)', borderRadius: '20px', padding: '5px 15px' }}>
                <input
                  type="text"
                  placeholder="Search masalas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '150px', fontSize: '0.9rem' }}
                />
                <button type="button" onClick={() => setIsSearchOpen(false)} className="icon-btn" style={{ width: '30px', height: '30px' }}><X size={16} strokeWidth={1.5} /></button>
              </form>
            ) : (
              <button className="icon-btn" aria-label="Search" onClick={() => setIsSearchOpen(true)}><Search size={20} strokeWidth={1.5} /></button>
            )}


            <button
              className="icon-btn cart-btn"
              onClick={() => navigate('/checkout')}
              aria-label="Cart"
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              {getCartCount() > 0 && (
                <span className="cart-badge">{getCartCount()}</span>
              )}
            </button>
          </div>
        </div>
      </div>
      </header>

      {/* Scroll to top button */}
      <button 
        className={`scroll-top-btn ${showTopBtn ? 'show' : ''}`} 
        onClick={scrollToTop}
        aria-label="Scroll to top"
      >
        <ArrowUp size={24} />
      </button>
    </>
  );
};

export default Header;
