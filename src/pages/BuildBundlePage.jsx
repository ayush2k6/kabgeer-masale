import React, { useState, useMemo, useEffect } from 'react';
import { ShoppingBag, ArrowRight, Sparkles, CheckCircle2, Truck, ShieldCheck, Flame, Search, X } from 'lucide-react';
import { PRODUCTS, CATEGORIES } from '../data/products';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import './BuildBundlePage.css';

const BuildBundlePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Masalas');
  const { cartItems, openCartDrawer } = useCart();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const totalBundleItems = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }, [cartItems]);

  const totalBundlePrice = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (Number(item.price || 0) * (item.quantity || 1)), 0);
  }, [cartItems]);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter(product => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q ||
        product.name?.toLowerCase().includes(q) ||
        product.category?.toLowerCase().includes(q) ||
        product.description?.toLowerCase().includes(q) ||
        product.about?.toLowerCase().includes(q);
      const matchesCategory = activeCategory === 'All Masalas' || product.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts = { 'All Masalas': PRODUCTS.length };
    CATEGORIES.forEach(cat => {
      if (cat !== 'All Masalas') {
        counts[cat] = PRODUCTS.filter(p => p.category === cat).length;
      }
    });
    return counts;
  }, []);

  return (
    <div className="build-bundle-page-wrapper">
      
      {/* 1. Hero Banner Section — Royal Awadhi Curation */}
      <section className="bundle-hero">
        <div className="bundle-hero-ambient-glow" />
        
        <div className="container bundle-hero-container">
          <div className="bundle-hero-content">
            
            <div className="royal-badge-pill">
              <Sparkles size={14} className="gold-icon" />
              <span>Royal Awadhi Curation</span>
              <span className="badge-dot">•</span>
              <span>Custom Spice Box</span>
            </div>

            <h1 className="hero-title">
              Craft Your <em>Royal Spice Box</em>
            </h1>

            <p className="hero-subtitle">
              Curate your personalized selection of authentic Lucknavi masala blends. Milled in small batches, freshly sealed, and delivered free across India.
            </p>

            {/* How It Works Steps Grid */}
            <div className="bundle-steps-grid">
              <div className="bundle-step-card">
                <div className="step-num-badge">1</div>
                <div className="step-text-col">
                  <h4>Choose Blends</h4>
                  <p>Pick heritage Mughlai, daily, or pure powders</p>
                </div>
              </div>

              <div className="bundle-step-divider">
                <ArrowRight size={18} />
              </div>

              <div className="bundle-step-card">
                <div className="step-num-badge">2</div>
                <div className="step-text-col">
                  <h4>Build Custom Box</h4>
                  <p>Mix & match any quantities for your kitchen</p>
                </div>
              </div>

              <div className="bundle-step-divider">
                <ArrowRight size={18} />
              </div>

              <div className="bundle-step-card">
                <div className="step-num-badge">3</div>
                <div className="step-text-col">
                  <h4>Fresh Delivery</h4>
                  <p>Packed in Lucknow & shipped free to your door</p>
                </div>
              </div>
            </div>

            {/* Value Highlights */}
            <div className="bundle-perks-row">
              <div className="bundle-perk-item">
                <Flame size={15} color="#d4af37" />
                <span>Stone Ground Pure</span>
              </div>
              <div className="bundle-perk-item">
                <Truck size={15} color="#d4af37" />
                <span>Free Pan-India Delivery</span>
              </div>
              <div className="bundle-perk-item">
                <ShieldCheck size={15} color="#d4af37" />
                <span>No Added Preservatives</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Main Content Area */}
      <section className="bundle-main-content">
        <div className="container bundle-container">
          
          {/* Controls Bar: Search + Category Selector */}
          <div className="bundle-controls-card">
            
            {/* Quick Search */}
            <div className="bundle-search-bar">
              <Search size={18} className="bundle-search-icon" />
              <input
                type="text"
                placeholder="Search masalas in bundle builder (e.g. Biryani, Korma, Chaat)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bundle-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="bundle-search-clear"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Category Filter Tabs */}
            <div className="bundle-filters-scroll">
              {CATEGORIES.map(category => {
                const count = categoryCounts[category] || 0;
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`category-pill ${isActive ? 'active' : ''}`}
                  >
                    <span>{category}</span>
                    <span className="category-count-pill">{count}</span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Spices Grid */}
          <div className="bundle-grid-header">
            <div className="grid-count-text">
              Showing <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'masala' : 'masalas'} in <span>{activeCategory}</span>
            </div>
            {activeCategory !== 'All Masalas' && (
              <button
                type="button"
                className="btn-reset-filter"
                onClick={() => { setActiveCategory('All Masalas'); setSearchQuery(''); }}
              >
                Reset to All Masalas
              </button>
            )}
          </div>

          <div className="premium-product-grid">
            {filteredProducts.map(spice => (
              <ProductCard
                key={spice.id}
                product={spice}
                actionLabel="Add to Box"
              />
            ))}
            
            {filteredProducts.length === 0 && (
              <div className="no-products-found-card">
                <div className="no-products-icon-circle">
                  <Search size={32} color="#d4af37" />
                </div>
                <h3>No masalas match your filter</h3>
                <p>We couldn't find any masalas matching "{searchQuery || activeCategory}". Try searching for another name or reset the category.</p>
                <button 
                  className="btn-royal-reset" 
                  onClick={() => { setActiveCategory('All Masalas'); setSearchQuery(''); }}
                >
                  Show All Masalas
                </button>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* 3. Floating Royal Bundle Dock (Appears when items are in cart) */}
      {totalBundleItems > 0 && (
        <div className="floating-bundle-dock-wrapper">
          <div className="container">
            <div className="floating-bundle-dock">
              
              <div className="dock-left-group">
                <div className="dock-box-icon">
                  <ShoppingBag size={20} />
                  <span className="dock-badge">{totalBundleItems}</span>
                </div>
                
                <div className="dock-text-col">
                  <div className="dock-title">
                    Your Custom Spice Box
                  </div>
                  <div className="dock-sub">
                    <strong>{totalBundleItems} {totalBundleItems === 1 ? 'item' : 'items'}</strong> selected • <span className="dock-free-ship">Free Shipping</span>
                  </div>
                </div>

                {/* Thumbnails preview */}
                <div className="dock-thumbnails-group">
                  {cartItems.slice(0, 4).map((item, idx) => (
                    <img
                      key={item.cartItemId || idx}
                      src={item.image || item.images?.[0]}
                      alt={item.name}
                      className="dock-thumb"
                      title={item.name}
                    />
                  ))}
                  {cartItems.length > 4 && (
                    <span className="dock-more-thumbs">+{cartItems.length - 4}</span>
                  )}
                </div>
              </div>

              <div className="dock-right-group">
                <div className="dock-price-col">
                  <span className="dock-price-label">Total Box Value</span>
                  <span className="dock-total-price">₹{totalBundlePrice.toFixed(2)}</span>
                </div>

                <button
                  type="button"
                  className="btn-dock-checkout"
                  onClick={openCartDrawer}
                >
                  <span>Review Box & Checkout</span>
                  <ArrowRight size={17} />
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BuildBundlePage;
