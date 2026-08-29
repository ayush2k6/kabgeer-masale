import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Search, User, ShoppingBag, X, ArrowUp, Home, Package, Sparkles, ChefHat } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { PRODUCTS } from '../data/products';
import CartDrawer from './CartDrawer';
import './Header.css';
import logo from '../assets/logo.png';

const Header = () => {
  const { getCartCount, openCartDrawer } = useCart();
  const { user, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isOnAuthPage = ['/login', '/signup', '/account', '/profile', '/admin'].some(
    p => location.pathname.startsWith(p)
  );

  useEffect(() => {
    const handleScroll = () => setShowTopBtn(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchResults([]);
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on route change
  useEffect(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, [location.pathname]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    const q = value.trim().toLowerCase();
    if (q.length < 2) { setSearchResults([]); return; }
    const matches = PRODUCTS.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    ).slice(0, 5);
    setSearchResults(matches);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      closeSearch();
    }
  };

  const handleSuggestionClick = (productId) => {
    navigate(`/product/${productId}`);
    closeSearch();
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const totalResults = searchQuery.trim().length >= 2
    ? PRODUCTS.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.trim().toLowerCase())
      ).length
    : 0;

  return (
    <>
      <header className="header-wrapper">
        {/* Top Marquee */}
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

        {/* Main Header */}
        <div className="main-header">
          <div className="container header-inner">
            <div className="logo-container">
              <Link to="/" className="logo-link">
                <img src={logo} alt="Kabgeer Masale" className="header-brand-logo" />
              </Link>
            </div>

            <nav className="desktop-nav">
              <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <Home size={16} /> Home
              </NavLink>
              <NavLink to="/products" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <Package size={16} /> Products
              </NavLink>
              <NavLink to="/bundle" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <Sparkles size={16} /> Build Your Bundle
              </NavLink>
              <NavLink to="/recipes" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <ChefHat size={16} /> Recipes
              </NavLink>
            </nav>

            <div className="header-actions">
              {/* Search */}
              <div className="search-container" ref={searchRef}>
                <button
                  className={`icon-btn search-trigger${isSearchOpen ? ' search-active' : ''}`}
                  aria-label="Search"
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                >
                  <Search size={20} />
                </button>

                {/* Full Search Overlay Panel */}
                {isSearchOpen && (
                  <div className="search-panel">
                    <div className="search-panel-header">
                      <span className="search-panel-title">Search Masalas</span>
                      <button type="button" onClick={closeSearch} className="search-panel-close">
                        <X size={18} />
                      </button>
                    </div>
                    <form onSubmit={handleSearchSubmit} className="search-panel-form">
                      <Search size={18} className="search-panel-icon" />
                      <input
                        type="text"
                        placeholder="Try 'Biryani Masala', 'Garam Masala'..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        autoFocus
                        className="search-panel-input"
                      />
                    </form>

                    {/* Results */}
                    {searchResults.length > 0 && (
                      <div className="search-results">
                        <div className="search-results-label">
                          Showing {searchResults.length} of {totalResults} results
                        </div>
                        {searchResults.map(product => (
                          <button
                            key={product.id}
                            type="button"
                            className="search-result-item"
                            onClick={() => handleSuggestionClick(product.id)}
                          >
                            <div className="search-result-img-wrap">
                              <img src={product.image} alt={product.name} className="search-result-img" />
                            </div>
                            <div className="search-result-info">
                              <span className="search-result-name">{product.name}</span>
                              <span className="search-result-meta">{product.weight} · {product.category}</span>
                            </div>
                            <span className="search-result-price">₹{product.price}</span>
                          </button>
                        ))}
                        {totalResults > 5 && (
                          <button type="button" onClick={handleSearchSubmit} className="search-viewall">
                            View all {totalResults} results →
                          </button>
                        )}
                      </div>
                    )}

                    {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                      <div className="search-results">
                        <div className="search-empty">
                          <Package size={32} strokeWidth={1.2} />
                          <span>No masalas found for "{searchQuery}"</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User (Desktop Header) */}
              <Link
                to={user ? (isAdmin ? "/admin" : "/account") : "/login"}
                className={`icon-btn user-btn header-user-btn${isOnAuthPage ? ' user-btn-active' : ''}`}
                aria-label={isAdmin ? "Admin Portal" : "Account"}
              >
                <User size={20} />
              </Link>

              {/* Cart */}
              <button className="icon-btn cart-btn" onClick={openCartDrawer} aria-label="Cart">
                <ShoppingBag size={20} />
                {getCartCount() > 0 && <span className="cart-badge">{getCartCount()}</span>}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Backdrop Overlay */}
      {isSearchOpen && <div className="search-backdrop" onClick={closeSearch} />}

      <CartDrawer />

      {/* Mobile Bottom Nav — Pure Discovery */}
      <nav className="mobile-bottom-nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? "mobile-nav-item active" : "mobile-nav-item"}>
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
        <NavLink to="/account" className={({ isActive }) => isActive ? "mobile-nav-item active" : "mobile-nav-item"}>
          <User size={20} />
          <span>Account</span>
        </NavLink>
      </nav>

      {/* Scroll to Top */}
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
