import React, { useState, useMemo, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Check, Search, Filter, Star, ArrowRight } from 'lucide-react';
import { PRODUCTS, CATEGORIES } from '../data/products';
import './BuildBundlePage.css';

const BuildBundlePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Masalas');
  const { addToCart } = useCart();

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
      {/* Main Content Area */}
      <section className="bundle-main-content" style={{ marginTop: '0', paddingTop: '3rem' }}>
        <div className="container">
          
          <div className="bundle-shop-container">
            {/* Filters */}
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
              {filteredProducts.map(spice => (
                <div key={spice.id} className="premium-product-card">
                  <div className="card-image-wrapper">
                    {spice.image ? (
                      <img src={spice.image} alt={spice.name} className="product-image" />
                    ) : (
                      <div className="no-image" style={{ backgroundColor: spice.color || '#ddd' }}>No Image</div>
                    )}
                  </div>
                  <div className="card-info">
                    <h4 className="product-name">{spice.name}</h4>
                    <p className="product-weight">• {spice.weight || '50g'}</p>
                    <p className="product-type">Single Pack</p>
                    <p className="product-price">₹{spice.price}</p>
                    <button 
                      className="btn-add-bundle"
                      onClick={() => addToCart(spice, 1)}
                    >
                      <ShoppingBag size={16} /> Add To Bundle
                    </button>
                  </div>
                </div>
              ))}
              
              {filteredProducts.length === 0 && (
                <div className="no-products-found">
                  No spices found matching your selection.
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
