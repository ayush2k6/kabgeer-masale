import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Filter, X, Plus, Star, ShoppingCart } from 'lucide-react';
import { PRODUCTS, CATEGORIES, TAGS } from '../data/products';
import { useCart } from '../context/CartContext';
import './CataloguePage.css';
import catalogueBannerImg from '../assets/catalogue banner.png';

const CataloguePage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialSearch = searchParams.get('search') || '';

  const [activeCategory, setActiveCategory] = useState('All Masalas');
  const [activeTags, setActiveTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortBy, setSortBy] = useState('featured');
  const [priceFilter, setPriceFilter] = useState('all');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [activeImageIndices, setActiveImageIndices] = useState({});
  const { addToCart } = useCart();
  const categorySliderRef = useRef(null);

  const scrollCategoryLeft = () => {
    if (categorySliderRef.current) {
      const { scrollLeft, scrollWidth } = categorySliderRef.current;
      if (scrollLeft <= 10) {
        categorySliderRef.current.scrollTo({ left: scrollWidth, behavior: 'smooth' });
      } else {
        categorySliderRef.current.scrollBy({ left: -360, behavior: 'smooth' });
      }
    }
  };

  const scrollCategoryRight = () => {
    if (categorySliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categorySliderRef.current;
      if (scrollLeft + clientWidth >= scrollWidth - 10) {
        categorySliderRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        categorySliderRef.current.scrollBy({ left: 360, behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);

  }, []);

  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
  }, [location.search]);

  const handleTagToggle = (tag) => {
    if (activeTags.includes(tag)) {
      setActiveTags(activeTags.filter(t => t !== tag));
    } else {
      setActiveTags([...activeTags, tag]);
    }
  };

  const filteredProducts = PRODUCTS.filter(product => {
    const matchesCategory = activeCategory === 'All Masalas' || product.category === activeCategory;
    const matchesTags = activeTags.length === 0 || activeTags.every(tag => product.tags.includes(tag));
    const matchesSearch = searchQuery === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
      
    let matchesPrice = true;
    if (priceFilter === 'under-60') matchesPrice = product.price < 60;
    else if (priceFilter === '60-80') matchesPrice = product.price >= 60 && product.price <= 80;
    else if (priceFilter === 'over-80') matchesPrice = product.price > 80;
      
    return matchesCategory && matchesTags && matchesSearch && matchesPrice;
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

  const handleNextImage = (e, productId, maxIdx) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndices(prev => ({
      ...prev,
      [productId]: ((prev[productId] || 0) + 1) % maxIdx
    }));
  };

  const handlePrevImage = (e, productId, maxIdx) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndices(prev => {
      const current = prev[productId] || 0;
      return {
        ...prev,
        [productId]: current === 0 ? maxIdx - 1 : current - 1
      };
    });
  };

  return (
    <div className="catalogue-page">
      {/* Banner Section */}
      <section className="hero-section" style={{ padding: 0, margin: 0, width: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={catalogueBannerImg} alt="Products Banner" style={{ width: '100%', height: 'auto', display: 'block', minHeight: '300px', objectFit: 'cover' }} />
        
        {/* Text Overlay Removed */}
      </section>

      <div className="container" style={{ maxWidth: '1400px', padding: '3rem 2rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: 'none', paddingBottom: '0' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#333', marginBottom: '8px' }}>Filter:</div>
            <div style={{ display: 'flex', gap: '15px' }}>
              <select 
                className="ref-dropdown" 
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                style={{ appearance: 'auto', paddingRight: '20px' }}
              >
                <option value="all">Price: All</option>
                <option value="under-60">Under ₹60</option>
                <option value="60-80">₹60 - ₹80</option>
                <option value="over-80">Over ₹80</option>
              </select>

              <select 
                className="ref-dropdown" 
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                style={{ appearance: 'auto', paddingRight: '20px', maxWidth: '200px' }}
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '20px', marginBottom: '30px' }}>{sortedProducts.length} products</div>
          </div>

          <div>
            <div style={{ fontSize: '0.85rem', color: '#333', marginBottom: '8px' }}>Sort by:</div>
            <select 
              className="ref-dropdown" 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ minWidth: '180px', appearance: 'auto', paddingRight: '20px' }}
            >
              <option value="featured">Featured</option>
              <option value="alpha-asc">Alphabetically, A-Z</option>
              <option value="alpha-desc">Alphabetically, Z-A</option>
              <option value="price-low">Price, low to high</option>
              <option value="price-high">Price, high to low</option>
            </select>
          </div>
        </div>

        {sortedProducts.length === 0 ? (
          <div className="no-results text-center mt-4" style={{ marginBottom: '5rem' }}>
            <h3>No products found</h3>
          </div>
        ) : (
          <div className="ref-catalogue-grid" style={{ marginBottom: '6rem' }}>
            {sortedProducts.map(product => (
              <Link to={`/product/${product.id}`} key={product.id} className="ref-product-card">
                <div className="ref-product-image-container">
                  <div className="ref-discount-badge">-{(product.price % 10 + 5)}%</div>
                  {product.image || product.images?.[0] ? (
                    <img src={product.image || product.images?.[0]} alt={product.name} />
                  ) : (
                    <div className="placeholder-img">{product.name}</div>
                  )}
                </div>
                <div className="ref-product-info">
                  <h3 className="ref-product-title">{product.name}</h3>
                  <div className="ref-product-reviews">
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <Star size={12} fill="#000" color="#000" />
                      <Star size={12} fill="#000" color="#000" />
                      <Star size={12} fill="#000" color="#000" />
                      <Star size={12} fill="#000" color="#000" />
                      <Star size={12} fill="#000" color="#000" />
                    </div>
                  </div>
                  <div className="ref-product-price">₹{product.price}.00</div>
                  
                  <div style={{ marginTop: 'auto', paddingTop: '15px' }}>
                    <button 
                      onClick={(e) => handleAddToCart(e, product)}
                      style={{ 
                        width: '100%', 
                        padding: '10px', 
                        backgroundColor: '#111', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: '6px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '8px', 
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#333'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#111'}
                    >
                      <ShoppingCart size={16} /> Add to Cart
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CataloguePage;
