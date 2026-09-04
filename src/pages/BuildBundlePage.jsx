import React, { useState, useMemo, useEffect } from 'react';
import { ArrowRight, Sparkles, Truck, ShieldCheck, Flame } from 'lucide-react';
import { PRODUCTS, CATEGORIES } from '../data/products';
import ProductCard from '../components/ProductCard';
import './BuildBundlePage.css';
import buildBundleBanner from '../assets/build your bundle banner.png';

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

      {/* Banner Image */}
      <div style={{ width: '100%', overflow: 'hidden', display: 'block' }}>
        <img src={buildBundleBanner} alt="Build Your Bundle" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>

      {/* 1. Hero Banner Section — Royal Awadhi Curation */}
      <section className="bundle-hero">
        <div className="bundle-hero-ambient-glow" />

        <div className="container bundle-hero-container">
          <div className="bundle-hero-content">

            <h1 className="hero-title">
              Craft Your <em> Own Spice Box</em>
            </h1>

            <p className="hero-subtitle">
              Curate your personalized selection of authentic masala blends. Milled in small batches, freshly sealed, and delivered free across India.
            </p>

            {/* Bundle Offer Highlight */}
            <div className="bundle-offer-highlight" style={{
              background: 'rgba(212, 175, 55, 0.12)',
              border: '1.5px dashed rgba(212, 175, 55, 0.5)',
              borderRadius: '12px',
              padding: '1.25rem 2rem',
              marginBottom: '2.5rem',
              display: 'inline-block'
            }}>
              <h3 style={{ color: '#d4af37', fontSize: '1.15rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '700' }}>
                <Sparkles size={18} fill="#d4af37" /> Special Bundle Offer!
              </h3>
              <p style={{ color: '#fcfaf5', fontSize: '1rem', margin: 0, opacity: 0.9 }}>
                Buy <strong>4 or more products</strong> to unlock <strong style={{ color: '#d4af37' }}>10% OFF + 2 FREE Mini Masala Boxes!</strong>
              </p>
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
                product={{...spice, isBundleItem: true}}
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
