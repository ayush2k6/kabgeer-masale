import React, { useState, useEffect } from 'react';
import { ShoppingBag, Star, Heart, Check, Minus, Plus, ChevronRight, ChevronLeft, ShieldCheck, Truck, RefreshCcw, Leaf, BookOpen, Droplets, Clock, Layers, Utensils, Quote, AlertCircle, Award, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { PRODUCTS } from '../data/products';
import ProductCard from '../components/ProductCard';
import './ProductPage.css';


import makeInIndiaLogo from '../assets/make in india logo.png';

const ProductPage = () => {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const { addToCart } = useCart();
  const { user, toggleWishlist } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveImageIdx(0);
  }, [id]);

  const product = PRODUCTS.find(p => p.id === id);

  if (!product) {
    return (
      <div className="container error-container">
        <AlertCircle size={64} className="error-icon" />
        <h1>Product Not Found</h1>
        <p>Sorry, the masala you're looking for doesn't exist or has been removed.</p>
        <Link to="/products" className="btn-primary">Browse Catalogue</Link>
      </div>
    );
  }

  // Calculate dynamic product properties from authoritative data
  const originalPrice = product.mrp || Math.round(product.price * 1.15);
  const discountPercent = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 15;

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.image].filter(Boolean);

  const features = product.features || [
    { icon: <Leaf size={16} />, label: '100% Pure Natural' },
    { icon: <BookOpen size={16} />, label: 'Traditional Recipe' },
    { icon: <ShieldCheck size={16} />, label: 'No Preservatives' },
    { icon: <Droplets size={16} />, label: 'No Artificial Color' },
    { icon: <Clock size={16} />, label: 'Aromatic & Fresh' },
    { icon: <Layers size={16} />, label: 'Versatile Spice' }
  ];

  const ingredientsText = Array.isArray(product.ingredients)
    ? product.ingredients.join(', ')
    : (product.ingredients || 'Pure ground spices, aromatic herbs, and natural seasonings.');

  const usageText = Array.isArray(product.usageInstructions)
    ? product.usageInstructions.join(' ')
    : (product.usageInstructions || product.howToUse || `Cook with your favorite recipe. Store in a dry and cool place.`);

  const chefTipText = product.chefTip || 'Let your dish rest for 10-15 minutes after cooking to allow the spice flavors to fully infuse.';

  const handleAddToCart = () => addToCart(product, quantity);
  const handleBuyNow = () => { addToCart(product, quantity); navigate('/checkout'); };

  const relatedProducts = PRODUCTS.filter(p => p.id !== product.id).slice(0, 4);

  return (
    <div className="pdp-wrapper">
      <div className="container">

        {/* Breadcrumbs */}
        <div className="pdp-breadcrumbs">
          <Link to="/">Home</Link> <ChevronRight size={14} />
          <Link to="/products">Products</Link> <ChevronRight size={14} />
          <span className="current">{product.name}</span>
        </div>

        {/* Main Product Section */}
        <div className="pdp-main-grid">

          {/* Left: Images */}
          <div className="pdp-gallery">
            <div className="pdp-main-image-wrapper">
              <button className="wishlist-btn" onClick={() => toggleWishlist(product)}>
                <Heart size={20} className={user?.wishlist?.some(p => p.id === product.id) ? 'active' : ''} />
              </button>
              {discountPercent > 0 && (
                <span className="pdp-discount-badge">-{discountPercent}%</span>
              )}

              <img
                src={images[activeImageIdx] || product.image}
                alt={product.name}
                className="pdp-main-img"
              />
            </div>

            {images.length > 1 && (
              <div className="pdp-thumbnails">
                {images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`${product.name} thumbnail ${idx + 1}`}
                    className={`pdp-thumb ${idx === activeImageIdx ? 'active' : ''}`}
                    onClick={() => setActiveImageIdx(idx)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="pdp-details">
            <h1 className="pdp-title">{product.name}</h1>
            <p className="pdp-subtitle">
              {product.category || 'Premium Masala'} • {product.weight || (product.weightInGrams ? `${product.weightInGrams}g` : '50g')}
            </p>
            <p className="pdp-description">{product.description || product.about}</p>

            {/* Pricing */}
            <div className="pdp-pricing-row">
              <span className="pdp-price">₹{product.price}.00</span>
              <span className="pdp-mrp">M.R.P.: <s>₹{originalPrice}.00</s></span>
              <span className="pdp-taxes">Inclusive of all taxes</span>
            </div>

            {/* Feature Badges Grid */}
            <div className="pdp-features-grid">
              {features.map((feat, idx) => (
                <div key={idx} className="pdp-feature-item">
                  <Check size={16} className="feature-check" />
                  <span>{feat.label}</span>
                </div>
              ))}
            </div>

            <hr className="pdp-divider" />

            {/* Actions */}
            <div className="pdp-actions">
              <div className="pdp-quantity">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity"><Minus size={18} /></button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity"><Plus size={18} /></button>
              </div>
              <div className="pdp-buttons">
                <button className="btn-add-cart" onClick={handleAddToCart}>
                  <ShoppingBag size={18} /> Add to Cart
                </button>
                <button className="btn-buy-now" onClick={handleBuyNow}>Buy Now</button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="pdp-trust-badges">
              <div className="trust-item">
                <Truck size={20} />
                <div>
                  <strong>Estimated Delivery</strong>
                  <span>2-4 working days across India</span>
                </div>
              </div>
              <div className="trust-item">
                <ShieldCheck size={20} />
                <div>
                  <strong>Secure Payment</strong>
                  <span>100% safe Razorpay checkout</span>
                </div>
              </div>
              <div className="trust-item">
                <RefreshCcw size={20} />
                <div>
                  <strong>Easy Returns</strong>
                  <span>Hassle-free return policy</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Info Blocks (Chef's Tip, Ingredients, How To Use) */}
        <div className="pdp-info-blocks">

          <div className="info-block chef-tip-block">
            <div className="info-header">
              <div className="info-icon"><Quote size={20} /></div>
              <h3>Chef's Tip</h3>
            </div>
            <p>{chefTipText}</p>
          </div>

          <div className="info-block ingredients-block">
            <div className="info-header">
              <div className="info-icon">🌿</div>
              <h3>Authentic Ingredients</h3>
            </div>
            <p>{ingredientsText}</p>
          </div>

          <div className="info-block usage-block">
            <div className="info-header">
              <div className="info-icon">🍲</div>
              <h3>How To Use & Storage</h3>
            </div>
            <p>{usageText}</p>
            <Link
              to="/recipes"
              state={{ openRecipeFor: product.name }}
              className="btn-recipe"
            >
              <BookOpen size={18} /> View Recipes
            </Link>
          </div>

        </div>

        {/* Premium Brand Features */}
        <div className="pdp-brand-features">
          <div className="brand-feat">
            <div className="b-icon-wrapper">
              <Sparkles size={28} />
            </div>
            <h4>Authentic Blends</h4>
            <p>Traditional Lucknavi recipes crafted to perfection.</p>
          </div>
          <div className="brand-feat">
            <div className="b-icon-wrapper">
              <Award size={28} />
            </div>
            <h4>Premium Quality</h4>
            <p>Hygienically packed to lock in aroma & freshness.</p>
          </div>
          <div className="brand-feat">
            <div className="b-icon-wrapper">
              <Heart size={28} />
            </div>
            <h4>Loved by Thousands</h4>
            <p>Trusted by home cooks across India.</p>
          </div>
          <div className="brand-feat">
            <div className="b-icon-wrapper">
              <img src={makeInIndiaLogo} alt="Make in India" className="make-in-india-img" />
            </div>
            <h4>Proudly Indian</h4>
            <p>Made for authentic Indian kitchens.</p>
          </div>
        </div>

        {/* Recommended Products */}
        <div className="pdp-related-section">
          <div className="related-header">
            <h2>Recommended Products</h2>
            <p>Explore More Flavourful Blends</p>
          </div>
          <div className="related-grid">
            {relatedProducts.map(relProd => (
              <ProductCard key={relProd.id} product={relProd} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProductPage;

