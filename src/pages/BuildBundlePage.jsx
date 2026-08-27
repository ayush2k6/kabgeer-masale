import React, { useState, useMemo, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Sparkles, ArrowRight, Check, Star } from 'lucide-react';
import { PRODUCTS, CATEGORIES } from '../data/products';
import './BuildBundlePage.css';
import buildBundleBannerImg from '../assets/build your bundle banner.png';

const BuildBundlePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Masalas');
  const { addToCart, cartItems } = useCart();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All Masalas' || product.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  return (
    <div className="build-bundle-page-wrapper">
      {/* Hero Banner Section */}
      <section className="bundle-hero">
        <div className="bundle-hero-content">
          <span className="exclusive-badge">✨ Custom Spice Box</span>
          <h1 className="hero-title">Build Your Own Bundle</h1>
          <p className="hero-subtitle">
            Pick your favorite authentic Lucknavi masalas and craft a personalized spice collection for your kitchen.
          </p>

          <div className="how-it-works-steps">
            <div className="hiw-step">
              <span className="hiw-step-num">1</span>
              <span>Select Masalas</span>
            </div>
            <ArrowRight size={16} className="hiw-arrow" />
            <div className="hiw-step">
              <span className="hiw-step-num">2</span>
              <span>Add to Bundle</span>
            </div>
            <ArrowRight size={16} className="hiw-arrow" />
            <div className="hiw-step">
              <span className="hiw-step-num">3</span>
              <span>Checkout & Save</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="bundle-main-content">
        <div className="container">
          <div className="bundle-shop-container">
            
            {/* Category Filter Pills */}
            <div className="bundle-filters">
              {CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`category-pill ${activeCategory === category ? 'active' : ''}`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Spices Grid */}
            <div className="premium-product-grid">
              {filteredProducts.map(spice => {
                const originalPrice = spice.mrp || Math.round(spice.price * 1.15);
                const discountPercent = spice.mrp && spice.mrp > spice.price
                  ? Math.round(((spice.mrp - spice.price) / spice.mrp) * 100)
                  : 15;
                const isInCart = cartItems.some(item => item.id === spice.id);

                return (
                  <div key={spice.id} className="premium-product-card">
                    <div className="card-image-wrapper">
                      {discountPercent > 0 && (
                        <span className="bundle-card-badge">-{discountPercent}%</span>
                      )}
                      <img src={spice.image || spice.images?.[0]} alt={spice.name} className="product-image" loading="lazy" />
                    </div>
                    <div className="card-info">
                      <h4 className="product-name">{spice.name}</h4>
                      <p className="product-weight">• {spice.weight || (spice.weightInGrams ? `${spice.weightInGrams}g` : '50g')}</p>
                      
                      <div className="bundle-price-row">
                        <span className="product-price">₹{spice.price}.00</span>
                        {originalPrice > spice.price && (
                          <span className="bundle-mrp">₹{originalPrice}.00</span>
                        )}
                      </div>

                      <button 
                        className={`btn-add-bundle ${isInCart ? 'in-cart' : ''}`}
                        onClick={() => addToCart(spice, 1)}
                      >
                        {isInCart ? (
                          <>
                            <Check size={16} /> Added to Box
                          </>
                        ) : (
                          <>
                            <ShoppingBag size={16} /> Add To Bundle
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {filteredProducts.length === 0 && (
                <div className="no-products-found" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 1rem', color: '#666' }}>
                  <h3>No masalas found matching "{searchQuery || activeCategory}"</h3>
                  <button 
                    className="btn-primary" 
                    style={{ marginTop: '1rem', padding: '0.6rem 1.5rem', cursor: 'pointer' }}
                    onClick={() => { setActiveCategory('All Masalas'); setSearchQuery(''); }}
                  >
                    Show All Masalas
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BuildBundlePage;
