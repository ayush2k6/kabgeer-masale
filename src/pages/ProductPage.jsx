import React, { useState, useEffect } from 'react';
import { ShoppingBag, Star, Heart, Check, Minus, Plus, ChevronRight, ShieldCheck, Truck, RefreshCcw, Leaf, BookOpen, Droplets, Clock, Layers, Utensils, Quote, AlertCircle, Award, Sparkles, Flame, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { PRODUCTS } from '../data/products';
import ProductCard from '../components/ProductCard';
import './ProductPage.css';

import makeInIndiaLogo from '../assets/make in india logo.png';

const PACK_SIZES = [
  { label: '50g Pack', weight: '50g', multiplier: 1, badge: 'Standard' },
  { label: '100g Pack (2x50g)', weight: '100g', multiplier: 1.9, badge: 'Save 5%' },
  { label: '250g Pack (5x50g)', weight: '250g', multiplier: 4.5, badge: 'Best Value' }
];

const ProductPage = () => {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedPack, setSelectedPack] = useState(PACK_SIZES[0]);
  const { addToCart, openCartDrawer } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveImageIdx(0);
    setSelectedPack(PACK_SIZES[0]);
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

  // Calculate dynamic pricing based on selected pack size
  const basePrice = Math.round(product.price * selectedPack.multiplier);
  const originalPrice = product.mrp ? Math.round(product.mrp * selectedPack.multiplier) : Math.round(basePrice * 1.18);
  const discountPercent = Math.round(((originalPrice - basePrice) / originalPrice) * 100);

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.image].filter(Boolean);

  const features = product.features || [
    { icon: <Leaf size={16} />, label: '100% Pure & Natural' },
    { icon: <BookOpen size={16} />, label: '65-Yr Secret Recipe' },
    { icon: <ShieldCheck size={16} />, label: 'No Added Preservatives' },
    { icon: <Droplets size={16} />, label: 'Zero Artificial Color' },
    { icon: <Clock size={16} />, label: 'Rich Slow-Roasted Aroma' },
    { icon: <Flame size={16} />, label: 'Authentic Lucknavi Flavor' }
  ];

  const ingredientsText = Array.isArray(product.ingredients)
    ? product.ingredients.join(', ')
    : (product.ingredients || 'Pure ground spices, aromatic herbs, and handpicked natural seasonings.');

  const usageText = Array.isArray(product.usageInstructions)
    ? product.usageInstructions.join(' ')
    : (product.usageInstructions || product.howToUse || `Add 1-2 tsp during cooking. Store in an airtight container in a dry, cool place.`);

  const chefTipText = product.chefTip || 'Sprinkle a pinch towards the end of cooking to lock in the rich Mughlai aroma and essential oils.';

  const handleAddToCart = () => {
    const itemToAdd = {
      ...product,
      price: basePrice,
      weight: selectedPack.weight
    };
    addToCart(itemToAdd, quantity);
  };

  const handleBuyNow = () => {
    const itemToAdd = {
      ...product,
      price: basePrice,
      weight: selectedPack.weight
    };
    addToCart(itemToAdd, quantity);
    navigate('/checkout');
  };

  const relatedProducts = PRODUCTS.filter(p => p.id !== product.id).slice(0, 4);

  return (
    <div className="pdp-wrapper">
      <div className="container">

        {/* Breadcrumbs */}
        <nav className="pdp-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link> <ChevronRight size={14} />
          <Link to="/products">Masala Catalogue</Link> <ChevronRight size={14} />
          <span className="current">{product.name}</span>
        </nav>

        {/* Main Product Showcase Layout */}
        <div className="pdp-main-card">
          <div className="pdp-main-grid">

            {/* Left Column: Image Gallery */}
            <div className="pdp-gallery">
              <div className="pdp-main-image-wrapper">
                {discountPercent > 0 && (
                  <span className="pdp-discount-badge">-{discountPercent}% OFF</span>
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
                    <button
                      key={idx}
                      className={`pdp-thumb-btn ${idx === activeImageIdx ? 'active' : ''}`}
                      onClick={() => setActiveImageIdx(idx)}
                    >
                      <img src={img} alt={`${product.name} thumbnail ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Product Specs & Ordering */}
            <div className="pdp-details">
              
              <div className="pdp-category-tag">
                <Sparkles size={14} className="gold-icon" /> {product.category || 'Authentic Lucknavi Masala'}
              </div>

              <h1 className="pdp-title">{product.name}</h1>
              
              {/* Rating Review Row */}
              <div className="pdp-rating-row">
                <div className="stars-wrapper">
                  <Star size={16} className="star-filled" />
                  <Star size={16} className="star-filled" />
                  <Star size={16} className="star-filled" />
                  <Star size={16} className="star-filled" />
                  <Star size={16} className="star-filled" />
                  <span className="rating-num">5.0</span>
                </div>
                <span className="review-count">(142 Verified Reviews)</span>
                <span className="stock-status"><CheckCircle2 size={14} /> In Stock & Freshly Sealed</span>
              </div>

              <p className="pdp-description">{product.description || product.about}</p>

              {/* Pricing Section */}
              <div className="pdp-pricing-card">
                <div className="price-row">
                  <span className="pdp-price">₹{basePrice}.00</span>
                  <span className="pdp-mrp">M.R.P.: <s>₹{originalPrice}.00</s></span>
                  <span className="pdp-savings-badge">Save ₹{originalPrice - basePrice}.00 ({discountPercent}%)</span>
                </div>
                <span className="pdp-taxes">Inclusive of all taxes • Free Shipping on orders above ₹399</span>
              </div>

              {/* Pack Size Selector */}
              <div className="pdp-pack-selector">
                <label className="selector-label">Select Pack Size:</label>
                <div className="pack-options-grid">
                  {PACK_SIZES.map(pack => (
                    <button
                      key={pack.weight}
                      type="button"
                      className={`pack-option-pill ${selectedPack.weight === pack.weight ? 'active' : ''}`}
                      onClick={() => setSelectedPack(pack)}
                    >
                      <div className="pack-pill-left">
                        <span className="pack-weight">{pack.label}</span>
                      </div>
                      <div className="pack-pill-right">
                        <span className="pack-price">₹{Math.round(product.price * pack.multiplier)}.00</span>
                        {pack.badge && <span className="pack-badge">{pack.badge}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>


              {/* Feature Badges Grid */}
              <div className="pdp-features-grid">
                {features.map((feat, idx) => (
                  <div key={idx} className="pdp-feature-pill">
                    <Check size={14} className="feature-check" />
                    <span>{feat.label}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pdp-actions-row">
                <div className="pdp-quantity-selector">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity">
                    <Minus size={16} />
                  </button>
                  <span>{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity">
                    <Plus size={16} />
                  </button>
                </div>
                <div className="pdp-action-btns">
                  <button className="btn-add-cart" onClick={handleAddToCart}>
                    <ShoppingBag size={18} /> Add to Cart
                  </button>
                  <button className="btn-buy-now" onClick={handleBuyNow}>
                    Buy Now
                  </button>
                </div>
              </div>

              {/* Delivery & Trust Perks */}
              <div className="pdp-trust-grid">
                <div className="trust-pill-card">
                  <Truck size={20} className="trust-icon" />
                  <div>
                    <strong>Express Delivery</strong>
                    <span>Delivered in 2–4 days across India</span>
                  </div>
                </div>
                <div className="trust-pill-card">
                  <ShieldCheck size={20} className="trust-icon" />
                  <div>
                    <strong>Razorpay Secured</strong>
                    <span>100% safe & encrypted payments</span>
                  </div>
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
              <h3>Chef's Secret Tip</h3>
            </div>
            <p>{chefTipText}</p>
          </div>

          <div className="info-block ingredients-block">
            <div className="info-header">
              <div className="info-icon"><Leaf size={20} /></div>
              <h3>Authentic Ingredients</h3>
            </div>
            <p>{ingredientsText}</p>
          </div>

          <div className="info-block usage-block">
            <div className="info-header">
              <div className="info-icon"><Utensils size={20} /></div>
              <h3>How To Use & Storage</h3>
            </div>
            <p>{usageText}</p>
            <Link
              to="/recipes"
              state={{ openRecipeFor: product.name }}
              className="btn-view-recipe"
            >
              <BookOpen size={16} /> View Step-by-Step Recipe
            </Link>
          </div>
        </div>

        {/* Brand Authenticity Banner */}
        <div className="pdp-brand-features">
          <div className="brand-feat">
            <div className="b-icon-wrapper"><Sparkles size={26} /></div>
            <h4>Authentic Formulations</h4>
            <p>Traditional 65-year-old Mughlai & Lucknavi spice heritage.</p>
          </div>
          <div className="brand-feat">
            <div className="b-icon-wrapper"><Award size={26} /></div>
            <h4>Triple-Sealed Freshness</h4>
            <p>Hygienically packed to lock in rich aroma & essential oils.</p>
          </div>
          <div className="brand-feat">
            <div className="b-icon-wrapper"><Heart size={26} /></div>
            <h4>Loved Across India</h4>
            <p>Trusted by thousands of passionate home chefs.</p>
          </div>
          <div className="brand-feat">
            <div className="b-icon-wrapper">
              <img src={makeInIndiaLogo} alt="Make in India" className="make-in-india-img" />
            </div>
            <h4>Proudly Made in India</h4>
            <p>100% natural, locally sourced premium spices.</p>
          </div>
        </div>

        {/* Recommended Products */}
        <div className="pdp-related-section">
          <div className="related-header">
            <span className="section-subtitle-badge">EXPLORE MORE FLAVOURS</span>
            <h2>Recommended Spices & Masalas</h2>
            <p>Complete your Lucknavi spice collection with our signature blends.</p>
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
