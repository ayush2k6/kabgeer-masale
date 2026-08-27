import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { PRODUCTS } from '../data/products';
import ProductCard from '../components/ProductCard';
import './HomePage.css';

import newBannerImg from '../assets/banner.png';
import rawIngredientsImg from '../assets/raw-ingredients.png';
import buildBundleBannerImg from '../assets/build your bundle banner.png';
import whyChooseUsImg from '../assets/why choose us.png';

const HomePage = () => {
  const navigate = useNavigate();

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

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section" style={{ padding: 0, margin: 0, width: '100%' }}>
        <img src={newBannerImg} alt="Kabgeer Masale Banner" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </section>

      {/* Build Your Bundle Banner */}
      <section className="build-bundle-banner-section" style={{ padding: 0, margin: 0, width: '100%', marginTop: '2rem' }}>
        <Link to="/bundle" style={{ display: 'block', width: '100%' }}>
          <img src={buildBundleBannerImg} alt="Build Your Bundle" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </Link>
      </section>

      {/* Why Choose Us Section */}
      <section className="why-choose-us-section" style={{ padding: 0, margin: '2rem 0', width: '100%' }}>
        <div className="container" style={{ padding: 0, maxWidth: '100%' }}>
          <img src={whyChooseUsImg} alt="Why choose us" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      </section>

      {/* Our Quick Non-Veg Masala */}
      <section className="quick-masala-section non-veg-bg">
        <div className="container">
          <h2 className="section-title text-white">Our Quick Non-Veg Masala</h2>
          <div className="product-grid">
            {quickNonVegProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Middle Info Banner */}
      <section className="middle-info-section">
        <div className="container">
          <div className="middle-info-grid">
            <div className="middle-info-image">
              <div className="image-decorator"></div>
              <img src={rawIngredientsImg} alt="Spices Bowls" />
            </div>
            <div className="middle-info-text">
              <span className="info-badge">Our Promise</span>
              <h2 className="info-heading">Cooking Made Easy</h2>
              <p className="info-description">
                We make cooking easy and accessible, so that even a beginner or <span className="highlight-green">non-cook</span> can prepare delicious <span className="highlight-green">meals in minutes</span> using our ready-to-cook masalas.
              </p>
              <Link to="/bundle" className="btn-order-combo">
                Order Combo <ShoppingCart size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Our Quick Veg Masala */}
      <section className="quick-masala-section veg-bg">
        <div className="container">
          <h2 className="section-title text-white">Our Quick Veg Masala</h2>
          <div className="product-grid">
            {quickVegProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section className="customer-reviews-section">
        <div className="container">
          <div className="reviews-header text-center">
            <span className="reviews-subtitle">CUSTOMER REVIEWS</span>
            <h2 className="reviews-title">What Our Customers Say</h2>
            <p className="reviews-desc">
              Don't just take our word for it.<br />
              Here is what home chefs and food lovers have to say about our authentic blends.
            </p>
          </div>

          <div className="reviews-grid">
            {/* Review 1 */}
            <div className="review-card">
              <div className="review-product">
                <img src="/assets/products/chicken korma masala cover.png" alt="Chicken Korma Masala" />
              </div>
              <div className="review-content">
                <div className="quote-mark">”</div>
                <p className="review-text">
                  "The Chicken Korma Masala is absolutely incredible. It tastes exactly like the one my grandmother used to make. Highly recommended for anyone missing authentic flavors!"
                </p>
                <div className="reviewer-info">
                  <span className="reviewer-name">Aarti Sharma</span>
                  <span className="reviewer-role">Verified Buyer • Delhi</span>
                </div>
              </div>
            </div>

            {/* Review 2 */}
            <div className="review-card">
              <div className="review-product">
                <img src="/assets/products/mutton stew masala cover.png" alt="Mutton Stew Masala" />
              </div>
              <div className="review-content">
                <div className="quote-mark">”</div>
                <p className="review-text">
                  "Mutton Stew was always tricky for me until I tried Kabgeer. The spice ratio is spot on. My family loved it!"
                </p>
                <div className="reviewer-info">
                  <span className="reviewer-name">Rohan Gupta</span>
                  <span className="reviewer-role">Verified Buyer • Lucknow</span>
                </div>
              </div>
            </div>

            {/* Review 3 */}
            <div className="review-card">
              <div className="review-product">
                <img src="/assets/products/veg biryani masala cover.png" alt="Veg Biryani Masala" />
              </div>
              <div className="review-content">
                <div className="quote-mark">”</div>
                <p className="review-text">
                  "Super convenient and packed with flavor. Elevates simple home-cooked meals into restaurant quality."
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
