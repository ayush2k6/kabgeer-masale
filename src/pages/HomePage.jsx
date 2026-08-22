import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, ChefHat, Award, Ban, Sprout, ChevronLeft, ChevronRight, ArrowRight, ShoppingCart } from 'lucide-react';
import './HomePage.css';

import newBannerImg from '../assets/banner.png';
import rawIngredientsImg from '../assets/raw-ingredients.png';
import buildBundleBannerImg from '../assets/build your bundle banner.png';
import logoImg from '../assets/logo.png';
import whyChooseUsImg from '../assets/why choose us.png';

const HomePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const scrollLeft = (ref) => {
    if (ref.current) {
      const { scrollLeft, scrollWidth } = ref.current;
      if (scrollLeft <= 0) {
        ref.current.scrollTo({ left: scrollWidth, behavior: 'smooth' });
      } else {
        ref.current.scrollBy({ left: -320, behavior: 'smooth' });
      }
    }
  };

  const scrollRight = (ref) => {
    if (ref.current) {
      const { scrollLeft, clientWidth, scrollWidth } = ref.current;
      if (Math.ceil(scrollLeft + clientWidth) >= scrollWidth - 1) {
        ref.current.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        ref.current.scrollBy({ left: 320, behavior: 'smooth' });
      }
    }
  };

  const dailyEssentialRef = useRef(null);
  const bestSellersRef = useRef(null);

  const quickVegProducts = [
    {
      id: "garam-masala",
      name: "Shahi Garam Masala",
      price: "₹69.00",
      image: "/assets/products/9. garam masala/shahi_garam_masala_cover.png"
    },
    {
      id: "veg-biryani",
      name: "Veg Biryani Masala",
      price: "₹89.00",
      image: "/assets/products/veg biryani masala cover.png"
    },
    {
      id: "chole",
      name: "Chole Masale",
      price: "₹69.00",
      image: "/assets/products/14. Chole Masala/chole_masale_cover.png"
    }
  ];

  const quickNonVegProducts = [
    {
      id: "mutton-stew",
      name: "Mutton Stew Masala",
      price: "₹79.00",
      image: "/assets/products/mutton stew masala cover.png"
    },
    {
      id: "chicken-korma",
      name: "Chicken Korma Masala",
      price: "₹79.00",
      image: "/assets/products/chicken korma masala cover.png"
    },
    {
      id: "non-veg-tandoori",
      name: "Non Veg Tandoori Masala",
      price: "₹79.00",
      image: "/assets/products/non veg tandoori masala cover.png"
    }
  ];

  const jarProducts = [
    { id: "turmeric-powder", name: "Turmeric Powder", price: "₹69.00", image: "/assets/products/turmeric powder cover.png" },
    { id: "red-chilli-powder", name: "Red Chilli Powder", price: "₹69.00", image: "/assets/products/red chilli powder cover.png" },
    { id: "coriander-powder", name: "Coriander Powder", price: "₹49.00", image: "/assets/products/17. Coriander Powder/coriander_powder_cover.png" },
    { id: "kashmiri-lal-mirch", name: "Kashmiri Lal Mirch", price: "₹98.00", image: "/assets/products/kashmiri lal mirch powder cover.png" },
    { id: "garlic-powder", name: "Garlic Powder", price: "₹79.00", image: "/assets/products/garlic powder cover.png" },
  ];

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
            {quickNonVegProducts.map((product, idx) => (
              <div className="product-card" key={idx} onClick={() => navigate(`/product/${product.id}`)} style={{ cursor: 'pointer' }}>
                <div className="product-image">
                  <img src={product.image} alt={product.name} />
                </div>
                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-price">{product.price}</p>
                  <button className="btn-buy">Buy Now</button>
                </div>
              </div>
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
            {quickVegProducts.map((product, idx) => (
              <div className="product-card" key={idx} onClick={() => navigate(`/product/${product.id}`)} style={{ cursor: 'pointer' }}>
                <div className="product-image">
                  <img src={product.image} alt={product.name} />
                </div>
                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-price">{product.price}</p>
                  <button className="btn-buy">Buy Now</button>
                </div>
              </div>
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
                  <div className="reviewer-avatar">S</div>
                  <div className="reviewer-details">
                    <h4>Sana K.</h4>
                    <span>Verified Buyer</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Review 2 */}
            <div className="review-card">
              <div className="review-product">
                <img src="/assets/products/9. garam masala/shahi_garam_masala_cover.png" alt="Shahi Garam Masala" />
              </div>
              <div className="review-content">
                <div className="quote-mark">”</div>
                <p className="review-text">
                  "I have tried many store-bought masalas, but Kabgeer's Shahi Garam Masala is on another level. The aroma hits you as soon as you open the packet."
                </p>
                <div className="reviewer-info">
                  <div className="reviewer-avatar">R</div>
                  <div className="reviewer-details">
                    <h4>Rahul S.</h4>
                    <span>Home Chef</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Review 3 */}
            <div className="review-card">
              <div className="review-product">
                <img src="/assets/products/sambar masala cover.png" alt="Sambar Masala" />
              </div>
              <div className="review-content">
                <div className="quote-mark">”</div>
                <p className="review-text">
                  "The Sambar Masala brings back memories of my trip to the South. Rich, perfectly balanced, and so easy to use. I'm definitely ordering more soon!"
                </p>
                <div className="reviewer-info">
                  <div className="reviewer-avatar">A</div>
                  <div className="reviewer-details">
                    <h4>Anita M.</h4>
                    <span>Verified Buyer</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Daily Essential Masala */}
      <section className="daily-essential-section bg-yellow">
        <div className="container">
          <h2 className="section-title text-black">Our Daily Essential Masala</h2>
          <div className="slider-container">
            <button className="slider-nav-btn left" onClick={() => scrollLeft(dailyEssentialRef)}>
              <ChevronLeft size={24} />
            </button>
            <div className="product-slider" ref={dailyEssentialRef}>
              {jarProducts.map((product, idx) => (
                <div className="slider-card" key={idx} onClick={() => navigate(`/product/${product.id}`)} style={{ cursor: 'pointer' }}>
                  <div className="slider-image">
                    <img src={product.image} alt={product.name} />
                  </div>
                  <div className="slider-info">
                    <h4 className="slider-name">{product.name}</h4>
                    <p className="slider-price">{product.price}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="slider-nav-btn right" onClick={() => scrollRight(dailyEssentialRef)}>
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </section>

      {/* Meat Tenderizer Section */}
      <section className="meat-tenderizer-section">
        <div className="container">
          <div className="tenderizer-grid">
            <div className="tenderizer-image">
              <img src="/assets/products/11. Meat Tenderizer/1.png" alt="Meat Tenderizer" />
            </div>
            <div className="tenderizer-text">
              <div className="star-badge">
                <span>★</span> Our Star Product
              </div>
              <h2 className="star-title">Meat<br/>Tenderizer</h2>
              <p className="star-desc">Kabgeer Meat Tenderizer Powder is a 100% natural solution to make your meat soft and juicy in minutes. Made from carefully selected natural ingredients, it works quickly without altering the original taste. Completely tasteless, it enhances texture while preserving authentic flavors. Perfect for home cooks and professionals alike, it ensures consistently tender results every time.</p>
              <Link to="/product/meat-tenderizer" className="btn btn-star mt-4">Shop Now</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Our Best Sellers */}
      <section className="daily-essential-section bg-purple">
        <div className="container">
          <h2 className="section-title text-black">Our Best Sellers</h2>
          <div className="slider-container">
            <button className="slider-nav-btn left" onClick={() => scrollLeft(bestSellersRef)}>
              <ChevronLeft size={24} />
            </button>
            <div className="product-slider" ref={bestSellersRef}>
              {jarProducts.map((product, idx) => (
                <div className="slider-card" key={idx} onClick={() => navigate(`/product/${product.id}`)} style={{ cursor: 'pointer' }}>
                  <div className="slider-image">
                    <img src={product.image} alt={product.name} />
                  </div>
                  <div className="slider-info">
                    <h4 className="slider-name">{product.name}</h4>
                    <p className="slider-price">{product.price}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="slider-nav-btn right" onClick={() => scrollRight(bestSellersRef)}>
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
