import React, { useState, useMemo, useEffect } from 'react';
import { PRODUCTS, CATEGORIES } from '../data/products';
import ProductCard from '../components/ProductCard';
import './BuildBundlePage.css';
import buildBundleBanner from '../assets/build your bundle banner.png';

const BuildBundlePage = () => {
  const [activeCategory, setActiveCategory] = useState('All Masalas');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const checkVeg = (product) => {
    if (product.tags?.includes('Non-Veg')) return false;
    if (product.tags?.includes('Veg')) return true;
    
    const vn = product.vegNonveg?.toLowerCase() || '';
    return vn.includes('veg') && !vn.includes('non');
  };
  
  const checkNonVeg = (product) => {
    if (product.tags?.includes('Non-Veg')) return true;
    if (product.tags?.includes('Veg')) return false;
    
    const vn = product.vegNonveg?.toLowerCase() || '';
    return vn.includes('non');
  };

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter(product => {
      if (activeCategory === 'All Masalas') return true;
      if (activeCategory === 'Veg') return checkVeg(product);
      if (activeCategory === 'Non-Veg') return checkNonVeg(product);
      return product.category === activeCategory;
    });
  }, [activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts = { 'All Masalas': PRODUCTS.length, 'Veg': 0, 'Non-Veg': 0 };
    CATEGORIES.forEach(cat => {
      if (cat !== 'All Masalas') {
        counts[cat] = PRODUCTS.filter(p => p.category === cat).length;
      }
    });
    
    counts['Veg'] = PRODUCTS.filter(p => checkVeg(p)).length;
    counts['Non-Veg'] = PRODUCTS.filter(p => checkNonVeg(p)).length;
    
    return counts;
  }, []);

  const DISPLAY_FILTERS = [...CATEGORIES, 'Veg', 'Non-Veg'];

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
              Special <em>Bundle Offer!</em>
            </h1>

            <p className="hero-subtitle" style={{ fontSize: '1.15rem', color: '#fcfaf5', marginBottom: '2.5rem' }}>
              Buy <strong>4 or more products</strong> to unlock <strong style={{ color: '#d4af37' }}>10% OFF + 2 FREE Mini Masala Boxes!</strong>
            </p>


          </div>
        </div>
      </section>

      {/* 2. Main Content Area */}
      <section className="bundle-main-content">
        <div className="container bundle-container">

          {/* Category Filter Tabs */}
          <div className="bundle-filters-wrapper">
            <div className="bundle-filters-scroll">
              {DISPLAY_FILTERS.map(category => {
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
