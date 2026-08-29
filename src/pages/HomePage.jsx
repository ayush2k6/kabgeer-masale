import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Leaf, BookOpen, Award, ArrowRight, Star, ChevronLeft, ChevronRight, Package, Flame, Heart } from 'lucide-react';
import { PRODUCTS, CATEGORIES } from '../data/products';
import ProductCard from '../components/ProductCard';
import './HomePage.css';

import newBannerImg from '../assets/banner.png';
import rawIngredientsImg from '../assets/raw-ingredients.png';
import buildBundleBannerImg from '../assets/build your bundle banner.png';
import whyChooseUsImg from '../assets/why choose us.png';

const HomePage = () => {
  const sliderRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const getProduct = (id) => PRODUCTS.find(p => p.id === id);

  const quickNonVegProducts = [
    getProduct('mutton-stew'),
    getProduct('chicken-korma'),
    getProduct('non-veg-tandoori')
  ].filter(Boolean);

  const quickVegProducts = [
    getProduct('garam-masala'),
    getProduct('veg-biryani'),
    getProduct('chole')
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

      {/* Quick Category Navigation Bar — Consistent with Catalogue */}
      <section className="quick-category-nav-section">
        <div className="container">
          <div className="home-category-tabs-wrapper">
            <div className="home-category-tabs">
              <Link to="/products" className="home-cat-pill active">
                <Sparkles size={14} />
                <span>All Masalas</span>
                <span className="home-count-badge">25</span>
              </Link>
              <Link to="/products?search=non-veg" className="home-cat-pill">
                <span>🍖 Quick Non-Veg</span>
                <span className="home-count-badge">8</span>
              </Link>
              <Link to="/products?search=veg" className="home-cat-pill">
                <span>🌱 Quick Veg</span>
                <span className="home-count-badge">8</span>
              </Link>
              <Link to="/products?search=biryani" className="home-cat-pill">
                <span>🍚 Mughlai Biryani</span>
                <span className="home-count-badge">3</span>
              </Link>
              <Link to="/bundle" className="home-cat-pill bundle-pill">
                <Award size={14} />
                <span>Build Custom Box</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Build Your Bundle Banner */}
      <section className="build-bundle-banner-section">
        <div className="container">
          <Link to="/bundle" className="bundle-banner-link">
            <img src={buildBundleBannerImg} alt="Build Your Custom Spice Bundle Box" className="bundle-banner-img" />
          </Link>
        </div>
      </section>

      {/* Trust & Quality Pillars */}
      <section className="home-trust-pillars">
        <div className="container">
          <div className="pillars-grid">
            <div className="pillar-card">
              <div className="pillar-icon"><Leaf size={22} /></div>
              <div>
                <h4>100% Pure & Natural</h4>
                <p>No added colors, fillers, or artificial preservatives</p>
              </div>
            </div>
            <div className="pillar-card">
              <div className="pillar-icon"><BookOpen size={22} /></div>
              <div>
                <h4>65-Year Secret Heritage</h4>
                <p>Authentic Mughlai & Lucknavi spice formulations</p>
              </div>
            </div>
            <div className="pillar-card">
              <div className="pillar-icon"><Award size={22} /></div>
              <div>
                <h4>Aroma Sealed Fresh</h4>
                <p>Triple-sealed packaging locks in volatile essential oils</p>
              </div>
            </div>
            <div className="pillar-card">
              <div className="pillar-icon"><ShieldCheck size={22} /></div>
              <div>
                <h4>Pan-India Express Delivery</h4>
                <p>Delivered fresh to your doorstep in 2–4 days</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="why-choose-us-section">
        <div className="container">
          <img src={whyChooseUsImg} alt="Why Choose Us — Kabgeer Masale" className="why-choose-us-img" />
        </div>
      </section>

      {/* Our Quick Non-Veg Masala */}
      <section className="quick-masala-section non-veg-bg">
        <div className="container">
          <div className="section-header-row text-center mb-4">
            <span className="section-subtitle-badge">ROYAL LUCKNAVI SPECIALS</span>
            <h2 className="section-title text-white">Our Quick Non-Veg Masalas</h2>
            <p className="section-desc text-white-80">Ready-to-cook spice blends crafted specially for rich stew, korma, and tandoori gravy.</p>
          </div>
          <div className="product-grid">
            {quickNonVegProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="section-cta-row text-center">
            <Link to="/products?search=non-veg" className="btn-explore-category">
              View All Non-Veg Masalas <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Middle Info Banner — Cooking Made Easy */}
      <section className="middle-info-section">
        <div className="container">
          <div className="middle-info-grid">
            <div className="middle-info-image">
              <div className="image-decorator"></div>
              <img src={rawIngredientsImg} alt="Authentic Lucknavi Spices" />
            </div>
            <div className="middle-info-text">
              <span className="info-badge">Our Heritage Promise</span>
              <h2 className="info-heading">Cooking Made Easy</h2>
              <p className="info-description">
                We make traditional Lucknavi cooking effortless, so that even a beginner or <span className="highlight-green">non-cook</span> can prepare delicious <span className="highlight-green">authentic royal dishes in minutes</span> using our secret ready-to-cook spice blends.
              </p>
              <Link to="/bundle" className="btn-order-combo">
                Craft Your Custom Box <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Our Quick Veg Masala */}
      <section className="quick-masala-section veg-bg">
        <div className="container">
          <div className="section-header-row text-center mb-4">
            <span className="section-subtitle-badge">EVERYDAY KITCHEN ESSENTIALS</span>
            <h2 className="section-title text-white">Our Quick Veg Masalas</h2>
            <p className="section-desc text-white-80">Aromatic, pure spice formulations for veg biryani, chole, paneer, and everyday curries.</p>
          </div>
          <div className="product-grid">
            {quickVegProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="section-cta-row text-center">
            <Link to="/products?search=veg" className="btn-explore-category">
              View All Veg Masalas <ArrowRight size={16} />
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
              <Package size={18} /> Browse Full Catalogue ({PRODUCTS.length} Masalas)
            </Link>
          </div>
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section className="customer-reviews-section">
        <div className="container">
          <div className="reviews-header text-center">
            <span className="reviews-subtitle">VERIFIED CUSTOMER LOVE</span>
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
                  "Mutton Stew was always tricky for me until I tried Kabgeer. The spice ratio is spot on. My family and dinner guests loved every bite!"
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
                <img src="/assets/products/veg biryani masala cover.png" alt="Veg Biryani Masala" />
              </div>
              <div className="review-content">
                <div className="quote-mark">”</div>
                <p className="review-text">
                  "Super convenient and packed with royal aroma. Elevates simple home-cooked meals into rich restaurant quality Lucknowi cuisine."
                </p>
                <div className="reviewer-info">
                  <span className="reviewer-name">Priya Patel</span>
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
