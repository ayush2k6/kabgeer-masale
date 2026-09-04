import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SlidersHorizontal, X, Sparkles, Search } from 'lucide-react';
import { PRODUCTS, CATEGORIES } from '../data/products';
import ProductCard from '../components/ProductCard';
import './CataloguePage.css';
import catalogueBannerImg from '../assets/catalogue banner.png';

const CataloguePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const initialSearch = searchParams.get('search') || '';

  const [activeCategory, setActiveCategory] = useState('All Masalas');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortBy, setSortBy] = useState('featured');
  const [priceFilter, setPriceFilter] = useState('all');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const q = searchParams.get('search') || '';
    setSearchQuery(q);
  }, [location.search]);

  const categoryCounts = useMemo(() => {
    const counts = { 'All Masalas': PRODUCTS.length };
    CATEGORIES.forEach(cat => {
      if (cat !== 'All Masalas') {
        counts[cat] = PRODUCTS.filter(p => p.category === cat).length;
      }
    });
    return counts;
  }, []);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter(product => {
      const matchesCategory = activeCategory === 'All Masalas' || product.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      let matchesSearch = !q;
      
      if (q) {
        const searchSpace = [
          product.name,
          product.category,
          product.description,
          product.about,
          ...(product.tags || [])
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (q === 'veg') {
          // Prevent 'veg' search from matching 'non-veg'
          const cleanedSpace = searchSpace.replace(/non-veg/g, '').replace(/non veg/g, '');
          matchesSearch = cleanedSpace.includes('veg');
        } else {
          matchesSearch = searchSpace.includes(q);
        }
      }
        
      let matchesPrice = true;
      if (priceFilter === 'under-60') matchesPrice = product.price < 60;
      else if (priceFilter === '60-80') matchesPrice = product.price >= 60 && product.price <= 80;
      else if (priceFilter === 'over-80') matchesPrice = product.price > 80;
        
      return matchesCategory && matchesSearch && matchesPrice;
    });
  }, [activeCategory, searchQuery, priceFilter]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'alpha-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'alpha-desc') return b.name.localeCompare(a.name);
      return 0;
    });
  }, [filteredProducts, sortBy]);

  const clearSearch = () => {
    setSearchQuery('');
    navigate('/products', { replace: true });
  };

  return (
    <div className="catalogue-page">
      {/* Banner Section */}
      <section className="catalogue-hero-banner">
        <img
          src={catalogueBannerImg}
          alt="Explore Our Authentic Masala Catalogue"
          className="catalogue-banner-image"
        />
      </section>

      <div className="container catalogue-container">
        
        {/* Category Pill Tabs Scroll */}
        <div className="catalogue-category-tabs-wrapper">
          <div className="catalogue-category-tabs">
            {CATEGORIES.map(category => {
              const count = categoryCounts[category] || 0;
              const isActive = activeCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`catalogue-cat-pill ${isActive ? 'active' : ''}`}
                >
                  <span>{category}</span>
                  <span className="cat-count-badge">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filter & Sort Bar */}
        <div className="catalogue-secondary-bar">
          
          <div className="catalogue-summary-text">
            {searchQuery ? (
              <div className="active-search-chip">
                <Search size={14} />
                <span>Search: "<strong>{searchQuery}</strong>"</span>
                <button type="button" onClick={clearSearch} aria-label="Clear search">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <span className="masala-count-text">
                Showing <strong>{sortedProducts.length}</strong> {sortedProducts.length === 1 ? 'masala' : 'authentic masalas'}
              </span>
            )}
          </div>

          <div className="catalogue-dropdowns-group">
            {/* Price Filter */}
            <div className="catalogue-select-wrapper">
              <label htmlFor="price-select" className="visually-hidden">Filter by Price</label>
              <select
                id="price-select"
                className="catalogue-select"
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
              >
                <option value="all">All Prices</option>
                <option value="under-60">Under ₹60</option>
                <option value="60-80">₹60 – ₹80</option>
                <option value="over-80">Above ₹80</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="catalogue-select-wrapper">
              <label htmlFor="sort-select" className="visually-hidden">Sort by</label>
              <select
                id="sort-select"
                className="catalogue-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="alpha-asc">Name: A to Z</option>
                <option value="alpha-desc">Name: Z to A</option>
              </select>
            </div>
          </div>

        </div>

        {/* Product Cards Grid */}
        {sortedProducts.length === 0 ? (
          <div className="catalogue-empty-state">
            <div className="empty-icon-wrapper">
              <SlidersHorizontal size={32} color="#d4af37" />
            </div>
            <h3>No masalas match your selected filters</h3>
            <p>Try resetting the price filter or selecting another category.</p>
            <button 
              className="btn-royal-reset" 
              onClick={() => { setActiveCategory('All Masalas'); setPriceFilter('all'); clearSearch(); }}
            >
              Show All Masalas
            </button>
          </div>
        ) : (
          <div className="catalogue-product-grid">
            {sortedProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default CataloguePage;
