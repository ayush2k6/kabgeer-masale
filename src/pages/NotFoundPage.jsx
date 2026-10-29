import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Home, Sparkles } from 'lucide-react';
import './NotFoundPage.css';

const NotFoundPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="notfound-page-wrapper">
      <div className="notfound-container">
        {/* Heritage Emblem Badge */}
        <div className="notfound-badge">
          <Sparkles size={14} className="notfound-badge-icon" />
          <span>404 — Page Not Found</span>
        </div>

        {/* Large Luxury 404 Heading */}
        <h1 className="notfound-title">404</h1>
        <h2 className="notfound-subtitle">Aroma Lost in the Royal Kitchens</h2>

        <p className="notfound-description">
          The page or spice recipe you are searching for does not exist, has been moved, or is temporarily unavailable. Let us guide you back to our authentic Awadhi blends.
        </p>

        {/* Action Buttons */}
        <div className="notfound-actions">
          <Link to="/" className="btn-notfound-primary">
            <Home size={18} />
            <span>Return to Storefront</span>
          </Link>
          <Link to="/products" className="btn-notfound-secondary">
            <ShoppingBag size={18} />
            <span>Explore Spice Blends</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Helpful Quick Links */}
        <div className="notfound-quicklinks">
          <span>Popular destinations:</span>
          <div className="notfound-links-list">
            <Link to="/bundle">Build Your Bundle (10% Off)</Link>
            <span className="notfound-dot">•</span>
            <Link to="/recipes">Authentic Recipes</Link>
            <span className="notfound-dot">•</span>
            <Link to="/contact">Need Help? Contact Us</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
