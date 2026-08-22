import React, { useState, useEffect } from 'react';
import { ShoppingBag, Star, Heart, Check, Minus, Plus, ChevronRight, ChevronLeft, ShieldCheck, Truck, RefreshCcw, Leaf, BookOpen, Droplets, Clock, Layers, Utensils, Quote, AlertCircle, Award, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { PRODUCTS } from '../data/products';
import './ProductPage.css';

// Mutton Stew Specific Images
import img1 from '../assets/products/mutton-stew/1.png';
import img2 from '../assets/products/mutton-stew/2.jpg';
import img3 from '../assets/products/mutton-stew/3.jpg';
import img4 from '../assets/products/mutton-stew/4.jpg';
import img41 from '../assets/products/mutton-stew/41.png';
import makeInIndiaLogo from '../assets/make in india logo.png';

const MOCK_PRODUCT = {
  id: 'p1',
  name: 'Mutton Stew Masala',
  price: 69,
  originalPrice: 80,
  discount: '15% OFF',
  description: 'A signature 9-spice blend crafted specially for rich and authentic Mughlai-style mutton stew. Ready to cook with Ginger & Garlic added.',
  weight: 'For 1Kg Mutton',
  images: [img41, img1, img2, img3, img4],
  features: [
    { icon: <Leaf size={16} />, label: '100% Pure Natural' },
    { icon: <BookOpen size={16} />, label: '65 Year Old Recipe' },
    { icon: <ShieldCheck size={16} />, label: 'No Preservatives' },
    { icon: <Droplets size={16} />, label: 'No Artificial Color' },
    { icon: <Clock size={16} />, label: 'Less Time Consuming' },
    { icon: <Layers size={16} />, label: 'Versatile' }
  ],
  ingredients: 'Coriander Seeds, Cumin, Peppercorns, Black Cardamom, Iodized salt, Chilies, Green Cardamom, Cinnamon, Nutmeg, Mace and Cloves.',
  howToUse: 'To be cooked. 750g Vegetables / Meat - (full box). Without Garlic and Onion. Store in Dry and Cool place.',
  chefTip: 'A must - let Kabgeer biryani or stew set for 40-50 mins before serving.'
};

const RELATED_PRODUCTS = [
  { id: 'chicken-korma', name: 'Chicken Korma Masala', price: 69, desc: 'Creamy, mild & perfect for traditional korma.', image: '/assets/products/2. Chicken Korma/1.jpg', tags: ['Bestseller'] },
  { id: 'shami-kebab', name: 'Shami Kebab Masala', price: 79, desc: 'Authentic blend for soft, juicy shami kebabs.', image: '/assets/products/4. Shami Kebab Masala/1.png', tags: [] },
  { id: 'sambhar', name: 'Sambar Masala', price: 69, desc: 'No Onion & No Garlic, perfect for delicious sambar.', image: '/assets/products/21. Sambar Masala/1.png', tags: [] },
  { id: 'veg-biryani', name: 'Veg Biryani Masala', price: 79, desc: 'Aromatic spices for the perfect Veg Biryani.', image: '/assets/products/25. Veg Biryani/1.png', tags: ['Bestseller'] }
];

const ProductPage = () => {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(2);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const { addToCart } = useCart();
  const { user, toggleWishlist } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const product = PRODUCTS.find(p => p.id === id);

  if (!product && id !== 'p1') {
    return (
      <div className="container error-container">
        <AlertCircle size={64} className="error-icon" />
        <h1>Product Not Found</h1>
        <p>Sorry, the masala you're looking for doesn't exist or has been removed.</p>
        <Link to="/products" className="btn-primary">Browse Catalogue</Link>
      </div>
    );
  }

  const displayProduct = {
    ...MOCK_PRODUCT,
    ...product,
    originalPrice: (product?.price || 69) + 15,
    discount: '15% OFF'
  };

  const images = displayProduct.images && displayProduct.images.length > 0
    ? displayProduct.images
    : [displayProduct.image];

  const handleAddToCart = () => addToCart(displayProduct, quantity);
  const handleBuyNow = () => { addToCart(displayProduct, quantity); navigate('/checkout'); };

  return (
    <div className="pdp-wrapper">
      <div className="container">

        {/* Breadcrumbs */}
        <div className="pdp-breadcrumbs">
          <Link to="/">Home</Link> <ChevronRight size={14} />
          <Link to="/products">Products</Link> <ChevronRight size={14} />
          <span className="current">{displayProduct.name}</span>
        </div>

        {/* Main Product Section */}
        <div className="pdp-main-grid">

          {/* Left: Images */}
          <div className="pdp-gallery">
            <div className="pdp-main-image-wrapper">
              <button className="wishlist-btn" onClick={() => toggleWishlist(displayProduct)}>
                <Heart size={20} className={user?.wishlist?.some(p => p.id === displayProduct.id) ? 'active' : ''} />
              </button>
              <span className="pdp-discount-badge">-{parseInt(displayProduct.discount, 10)}%</span>

              <img
                src={images[activeImageIdx]}
                alt={displayProduct.name}
                className="pdp-main-img"
              />
            </div>
            {images.length > 1 && (
              <div className="pdp-thumbnails">
                {images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Thumb ${idx}`}
                    className={`pdp-thumb ${idx === activeImageIdx ? 'active' : ''}`}
                    onClick={() => setActiveImageIdx(idx)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="pdp-details">
            <h1 className="pdp-title">{displayProduct.name}</h1>
            <p className="pdp-subtitle">Premium Masala • {displayProduct.weight || '50g'}</p>
            <p className="pdp-description">{displayProduct.description}</p>

            {/* Pricing */}
            <div className="pdp-pricing-row">
              <span className="pdp-price">₹{displayProduct.price}.00</span>
              <span className="pdp-mrp">M.R.P.: <s>₹{displayProduct.originalPrice}.00</s></span>
              <span className="pdp-taxes">Inclusive of all taxes</span>
            </div>

            {/* Feature Badges Grid */}
            <div className="pdp-features-grid">
              {displayProduct.features.map((feat, idx) => (
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
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={18} /></button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}><Plus size={18} /></button>
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
                  <span>2-4 working days</span>
                </div>
              </div>
              <div className="trust-item">
                <ShieldCheck size={20} />
                <div>
                  <strong>Secure Payment</strong>
                  <span>100% safe & secure</span>
                </div>
              </div>
              <div className="trust-item">
                <RefreshCcw size={20} />
                <div>
                  <strong>Easy Returns</strong>
                  <span>7 days return policy</span>
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
              <h3>Chef's Tip behind every box</h3>
            </div>
            <p>{displayProduct.chefTip}</p>
          </div>

          <div className="info-block ingredients-block">
            <div className="info-header">
              <div className="info-icon">🌿</div>
              <h3>Authentic Blend</h3>
            </div>
            <p>{displayProduct.ingredients}</p>
          </div>

          <div className="info-block usage-block">
            <div className="info-header">
              <div className="info-icon">🍲</div>
              <h3>How To Use</h3>
            </div>
            <p>Discover the perfect recipe for this masala.</p>
            <Link
              to="/recipes"
              state={{ openRecipeFor: displayProduct.name }}
              className="btn-recipe"
            >
              <BookOpen size={18} /> View Recipe
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
            <p>Traditional recipes crafted to perfection.</p>
          </div>
          <div className="brand-feat">
            <div className="b-icon-wrapper">
              <Award size={28} />
            </div>
            <h4>Premium Quality</h4>
            <p>Hygienically packed to lock in freshness.</p>
          </div>
          <div className="brand-feat">
            <div className="b-icon-wrapper">
              <Heart size={28} />
            </div>
            <h4>Loved by Thousands</h4>
            <p>Trusted by home cooks across the country.</p>
          </div>
          <div className="brand-feat">
            <div className="b-icon-wrapper">
              <img src={makeInIndiaLogo} alt="Make in India" className="make-in-india-img" />
            </div>
            <h4>Proudly Indian</h4>
            <p>Made for Indian kitchens.</p>
          </div>
        </div>

        {/* Recommended Products */}
        <div className="pdp-related-section">
          <div className="related-header">
            <h2> Recommended Products </h2>
            <p>Explore More Flavourful Blends</p>
          </div>
          <div className="related-grid">
            {RELATED_PRODUCTS.map(product => (
              <div key={product.id} className="related-card">
                <div className="related-img-wrapper">
                  <img src={product.image} alt={product.name} />
                </div>
                <div className="related-info">
                  <h4>{product.name}</h4>
                  <p className="r-weight">• 50g</p>
                  <p className="r-type">Single Pack</p>
                  <p className="r-price">₹{product.price}</p>
                  <button className="r-btn" onClick={() => addToCart(product, 1)}>
                    Add To Box
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProductPage;
