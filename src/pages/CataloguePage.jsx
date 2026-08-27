import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PRODUCTS, CATEGORIES } from '../data/products';
import ProductCard from '../components/ProductCard';
import './CataloguePage.css';
import catalogueBannerImg from '../assets/catalogue banner.png';

const CataloguePage = () => {
  const location = useLocation();
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
    setSearchQuery(searchParams.get('search') || '');
  }, [location.search]);

  const filteredProducts = PRODUCTS.filter(product => {
    const matchesCategory = activeCategory === 'All Masalas' || product.category === activeCategory;
    const matchesSearch = searchQuery === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.about?.toLowerCase().includes(searchQuery.toLowerCase());
      
    let matchesPrice = true;
    if (priceFilter === 'under-60') matchesPrice = product.price < 60;
    else if (priceFilter === '60-80') matchesPrice = product.price >= 60 && product.price <= 80;
    else if (priceFilter === 'over-80') matchesPrice = product.price > 80;
      
    return matchesCategory && matchesSearch && matchesPrice;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'alpha-asc') return a.name.localeCompare(b.name);
    if (sortBy === 'alpha-desc') return b.name.localeCompare(a.name);
    return 0;
  });

  return (
    <div className="catalogue-page">
      {/* Banner Section */}
      <section className="hero-section" style={{ padding: 0, margin: 0, width: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={catalogueBannerImg} alt="Products Banner" style={{ width: '100%', height: 'auto', display: 'block', minHeight: '220px', objectFit: 'cover' }} />
      </section>

      <div className="container" style={{ maxWidth: '1400px', padding: '2rem 1.5rem 0' }}>
        
        {/* Responsive Filters Bar */}
        <div className="catalogue-filters-bar">
          <div className="filters-left">
            <div className="filter-item">
              <label htmlFor="category-select">Category:</label>
              <select 
                id="category-select"
                className="ref-dropdown" 
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label htmlFor="price-select">Price:</label>
              <select 
                id="price-select"
                className="ref-dropdown" 
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
              >
                <option value="all">All Prices</option>
                <option value="under-60">Under ₹60</option>
                <option value="60-80">₹60 - ₹80</option>
                <option value="over-80">Over ₹80</option>
              </select>
            </div>
          </div>

          <div className="filters-right">
            <div className="filter-item">
              <label htmlFor="sort-select">Sort by:</label>
              <select 
                id="sort-select"
                className="ref-dropdown" 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="alpha-asc">Alphabetically, A-Z</option>
                <option value="alpha-desc">Alphabetically, Z-A</option>
                <option value="price-low">Price, low to high</option>
                <option value="price-high">Price, high to low</option>
              </select>
            </div>
          </div>
        </div>

        <div className="product-count-summary">
          Showing {sortedProducts.length} of {PRODUCTS.length} authentic masalas
        </div>

        {/* Product Cards Grid */}
        {sortedProducts.length === 0 ? (
          <div className="no-results text-center mt-4" style={{ marginBottom: '5rem', padding: '4rem 1rem' }}>
            <h3>No products match your selected filters</h3>
            <button 
              className="btn-primary" 
              style={{ marginTop: '1rem', padding: '0.6rem 1.5rem', cursor: 'pointer' }}
              onClick={() => { setActiveCategory('All Masalas'); setPriceFilter('all'); setSearchQuery(''); }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="ref-catalogue-grid" style={{ marginBottom: '6rem' }}>
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
