import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Filter, Star, ShoppingCart } from 'lucide-react';
import { PRODUCTS, CATEGORIES } from '../data/products';
import { useCart } from '../context/CartContext';
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
  const { addToCart } = useCart();

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

  const handleAddToCart = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
  };

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
            {sortedProducts.map(product => {
              const originalPrice = product.mrp || Math.round(product.price * 1.15);
              const discountPercent = product.mrp && product.mrp > product.price
                ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
                : 15;
              const weightDisplay = product.weight || (product.weightInGrams ? `${product.weightInGrams}g` : '50g');

              return (
                <Link to={`/product/${product.id}`} key={product.id} className="ref-product-card">
                  <div className="ref-product-image-container">
                    {discountPercent > 0 && (
                      <div className="ref-discount-badge">-{discountPercent}%</div>
                    )}
                    <img 
                      src={product.image || product.images?.[0]} 
                      alt={product.name} 
                      loading="lazy"
                    />
                  </div>
                  <div className="ref-product-info">
                    <h3 className="ref-product-title">{product.name}</h3>
                    <div className="ref-product-weight">{weightDisplay} • {product.packType || 'Single Pack'}</div>
                    
                    <div className="ref-product-reviews">
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <Star size={12} fill="#d99026" color="#d99026" />
                        <Star size={12} fill="#d99026" color="#d99026" />
                        <Star size={12} fill="#d99026" color="#d99026" />
                        <Star size={12} fill="#d99026" color="#d99026" />
                        <Star size={12} fill="#d99026" color="#d99026" />
                      </div>
                      <span className="ref-review-count">(5.0)</span>
                    </div>

                    <div className="ref-product-pricing">
                      <span className="ref-price">₹{product.price}.00</span>
                      {originalPrice > product.price && (
                        <span className="ref-mrp">₹{originalPrice}.00</span>
                      )}
                    </div>
                    
                    <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
                      <button 
                        onClick={(e) => handleAddToCart(e, product)}
                        className="ref-add-cart-btn"
                      >
                        <ShoppingCart size={16} /> Add to Cart
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CataloguePage;
