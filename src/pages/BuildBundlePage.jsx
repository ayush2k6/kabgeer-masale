import React, { useState, useMemo, useEffect } from 'react';
import { ArrowRight, Sparkles, Truck, ShieldCheck, Flame } from 'lucide-react';
import { PRODUCTS, CATEGORIES } from '../data/products';
import ProductCard from '../components/ProductCard';
import './BuildBundlePage.css';

const BuildBundlePage = () => {
  const [activeCategory, setActiveCategory] = useState('All Masalas');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter(product => {
      const matchesCategory = activeCategory === 'All Masalas' || product.category === activeCategory;
      return matchesCategory;
    });
  }, [activeCategory]);

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
          
          {/* Category Filter Tabs */}
          <div className="bundle-filters-wrapper">
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

          {/* Grid Header Info */}
          <div className="bundle-grid-header">
            <div className="grid-count-text">
              Showing <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'masala' : 'masalas'} in <span>{activeCategory}</span>
            </div>
            {activeCategory !== 'All Masalas' && (
              <button
                type="button"
                className="btn-reset-filter"
                onClick={() => setActiveCategory('All Masalas')}
              >
                Reset to All Masalas
              </button>
            )}
          </div>

          {/* Spices Grid */}
          <div className="premium-product-grid">
            {filteredProducts.map(spice => (
              <ProductCard
                key={spice.id}
                product={spice}
                actionLabel="Add to Box"
              />
            ))}
          </div>

        </div>
      </section>

    </div>
  );
};

export default BuildBundlePage;
