import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Leaf, BookOpen, Award, ArrowRight, Star, ChevronLeft, ChevronRight, Package, Flame, Heart, ShoppingCart, ShoppingBag } from 'lucide-react';
import { PRODUCTS } from '../data/products';
import ProductCard from '../components/ProductCard';
import MontageProductCard from '../components/MontageProductCard';
import { useCart } from '../context/CartContext';
import './HomePage.css';

import newBannerImg from '../assets/banner.png';
import rawIngredientsImg from '../assets/raw-ingredients.png';
import whyChooseUsImg from '../assets/why choose us.png';

const HomePage = () => {
  const sliderRef = useRef(null);
  const { addToCart } = useCart();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const getProduct = (id) => PRODUCTS.find(p => p.id === id);

  const quickNonVegProducts = [
    getProduct('mutton-stew'),
    getProduct('chicken-korma'),
    getProduct('non-veg-tandoori'),
    getProduct('mutton-nihari')
  ].filter(Boolean);

  const quickVegProducts = [
    getProduct('garam-masala'),
    getProduct('veg-biryani'),
    getProduct('kadhai-paneer'),
    getProduct('veg-tandoori')
  ].filter(Boolean);

  const dailyEssentialProducts = [
    getProduct('turmeric-powder'),
    getProduct('red-chilli'),
    getProduct('coriander-powder'),
    getProduct('kashmiri-lal-mirch')
  ].filter(Boolean);

  // Signature catalogue selection for horizontal showcase
  const signatureProducts = PRODUCTS.slice(0, 8);

  const scrollSlider = (direction) => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="home-page">
      {/* Hero Banner Section */}
      <section className="hero-section" style={{ padding: 0, margin: 0, width: '100%' }}>
        <img src={newBannerImg} alt="Kabgeer Masale Banner" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </section>







      {/* Why Choose Us Section — Image Banner */}
      <section className="why-choose-us-image-section" style={{ padding: 0, margin: 0, width: '100%' }}>
        <img src={whyChooseUsImg} alt="Why Choose Kabgeer Masale" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </section>

      {/* Our Quick Non-Veg Masala */}
      <section className="quick-masala-section non-veg-bg">
        <div className="container">
          <div className="section-header-row mb-4">
            <h2 className="section-title text-white">Our Quick Non-Veg Masala</h2>
          </div>
          <div className="montage-product-grid-4">
            {quickNonVegProducts.map(product => (
              <MontageProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="section-cta-row text-center">
            <Link to="/products?search=non-veg" className="btn-explore-category">
              View All Non-Veg Masalas <ShoppingBag size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Middle Info Banner — Cooking Made Easy */}
      <section className="middle-info-section">
        <div className="container">
          <div className="middle-info-grid">
            <div className="middle-info-image">
              <img src={rawIngredientsImg} alt="Authentic Lucknavi Spices" />
            </div>
            <div className="middle-info-text">
              <span className="info-badge">Our Promise</span>
              <h2 className="info-heading">Cooking Made Easy</h2>
              <p className="info-description">
                We make cooking effortless, so that even a beginner or <span className="highlight-green">non-cook</span> can prepare delicious <span className="highlight-green">authentic royal dishes in minutes</span> using our secret ready-to-cook spice blends.
              </p>
              <Link to="/bundle" className="btn-order-combo">
                Craft Your Custom Box <ShoppingBag size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Our Quick Veg Masala */}
      <section className="quick-masala-section veg-bg">
        <div className="container">
          <div className="section-header-row mb-4">
            <h2 className="section-title text-white">Our Quick Veg Masalas</h2>
          </div>
          <div className="montage-product-grid-4">
            {quickVegProducts.map(product => (
              <MontageProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="section-cta-row text-center">
            <Link to="/products?search=veg" className="btn-explore-category">
              View All Veg Masalas <ShoppingBag size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Star Product Section */}
      <section className="star-product-section">
        <div className="container">
          <div className="star-product-grid">
            <div className="star-product-image-col">
              <img src={getProduct('meat-tenderizer')?.image} alt="Meat Tenderizer" className="star-product-img" />
            </div>
            <div className="star-product-content-col">
              <div className="star-subtitle">
                <Star size={16} fill="#d4af37" color="#d4af37" /> OUR STAR PRODUCT
              </div>
              <h2 className="star-title">Meat<br />Tenderizer</h2>
              <p className="star-desc">
                Kabgeer Meat Tenderizer Powder is a 100% natural solution to make your meat soft and juicy in minutes. Made from carefully selected natural ingredients, it works quickly without altering the original taste. Completely tasteless, it enhances texture while preserving authentic flavors. Perfect for home cooks and professionals alike, it ensures consistently tender results every time.
              </p>
              <button className="star-shop-btn" onClick={(e) => {
                e.preventDefault();
                const prod = getProduct('meat-tenderizer');
                if (prod) addToCart(prod, 1);
              }}>
                Shop Now <ShoppingCart size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Daily Essential Masala Section */}
      <section className="quick-masala-section daily-bg">
        <div className="container">
          <div className="section-header-row mb-4">
            <h2 className="section-title">Our Daily Essential Masala</h2>
          </div>
          <div className="montage-product-grid-4">
            {dailyEssentialProducts.map(product => (
              <MontageProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="section-cta-row text-center">
            <Link to="/products?search=powder" className="btn-explore-category">
              View All Daily Essentials <ShoppingBag size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Signature Catalogue Slider Section */}
      <section className="home-catalogue-slider-section">
        <div className="container">
          <div className="slider-header-row">
            <div>
              <span className="section-subtitle-badge">SIGNATURE COLLECTION</span>
              <h2 className="home-slider-title">Explore Our Masala Catalogue</h2>
              <p className="home-slider-desc">Handcrafted 65-year-old Lucknavi spice formulations loved by thousands of home chefs.</p>
            </div>
            <div className="slider-arrows-group">
              <button onClick={() => scrollSlider('left')} className="slider-arrow-btn" aria-label="Previous products">
                <ChevronLeft size={20} />
              </button>
              <button onClick={() => scrollSlider('right')} className="slider-arrow-btn" aria-label="Next products">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="home-product-slider" ref={sliderRef}>
            {signatureProducts.map(product => (
              <div key={product.id} className="home-slider-card-item">
                <ProductCard product={product} />
              </div>
            ))}
          </div>

          <div className="slider-bottom-cta text-center">
            <Link to="/products" className="btn-royal-catalogue">
              <Package size={18} /> Browse Full Catalogue
            </Link>
          </div>
        </div>
      </section>

      {/* Customer Reviews Section (2 Even Reviews) */}
      <section className="customer-reviews-section">
        <div className="container">
          <div className="reviews-header text-center">
            <h2 className="reviews-title">What Our Customers Say</h2>
            <p className="reviews-desc">
              Here is what home chefs and food enthusiasts across India share about our authentic Lucknavi spice blends.
            </p>
          </div>

          <div className="reviews-grid">
            {/* Review 1 */}
            <div className="review-card">
              <div className="review-rating">
                <Star size={14} fill="#d99026" color="#d99026" />
                <Star size={14} fill="#d99026" color="#d99026" />
                <Star size={14} fill="#d99026" color="#d99026" />
                <Star size={14} fill="#d99026" color="#d99026" />
                <Star size={14} fill="#d99026" color="#d99026" />
              </div>
              <div className="review-product">
                <img src="/assets/products/chicken korma masala cover.png" alt="Chicken Korma Masala" />
              </div>
              <div className="review-content">
                <div className="quote-mark">”</div>
                <p className="review-text">
                  "The Chicken Korma Masala is absolutely incredible. It tastes exactly like the one my grandmother used to make. Highly recommended for anyone missing authentic Lucknow flavors!"
                </p>
                <div className="reviewer-info">
                  <span className="reviewer-name">Aarti Sharma</span>
                  <span className="reviewer-role">Verified Buyer • Delhi</span>
                </div>
              </div>
            </div>

            {/* Review 2 */}
            <div className="review-card">
              <div className="review-rating">
                <Star size={14} fill="#d99026" color="#d99026" />
                <Star size={14} fill="#d99026" color="#d99026" />
                <Star size={14} fill="#d99026" color="#d99026" />
                <Star size={14} fill="#d99026" color="#d99026" />
                <Star size={14} fill="#d99026" color="#d99026" />
              </div>
              <div className="review-product">
                <img src="/assets/products/mutton stew masala cover.png" alt="Mutton Stew Masala" />
              </div>
              <div className="review-content">
                <div className="quote-mark">”</div>
                <p className="review-text">
                  "Mutton Stew was always tricky for me until I tried Kabgeer. The spice ratio is spot on. My family and dinner guests loved every single bite!"
                </p>
                <div className="reviewer-info">
                  <span className="reviewer-name">Rohan Gupta</span>
                  <span className="reviewer-role">Verified Buyer • Lucknow</span>
                </div>
              </div>
            </div>

            {/* Review 3 */}
            <div className="review-card">
              <div className="review-rating">
                <Star size={14} fill="#d99026" color="#d99026" />
                <Star size={14} fill="#d99026" color="#d99026" />
                <Star size={14} fill="#d99026" color="#d99026" />
                <Star size={14} fill="#d99026" color="#d99026" />
                <Star size={14} fill="#d99026" color="#d99026" />
              </div>
              <div className="review-product">
                <img src="/assets/products/shahi garam masala cover.png" alt="Shahi Garam Masala" />
              </div>
              <div className="review-content">
                <div className="quote-mark">”</div>
                <p className="review-text">
                  "The Shahi Garam Masala adds such a beautiful royal aroma to my everyday cooking. Just a pinch transforms the entire dish. Highly recommended!"
                </p>
                <div className="reviewer-info">
                  <span className="reviewer-name">Priya Singh</span>
                  <span className="reviewer-role">Verified Buyer • Mumbai</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
