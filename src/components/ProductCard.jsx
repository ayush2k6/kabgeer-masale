import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './ProductCard.css';

const ProductCard = ({ product, actionLabel, onActionClick }) => {
  const { addToCart, cartItems } = useCart();

  if (!product) return null;

  const originalPrice = product.mrp || Math.round(product.price * 1.15);
  const discountPercent = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 15;
  const weightDisplay = product.weight || (product.weightInGrams ? `${product.weightInGrams}g` : '50g');
  const isInCart = cartItems.some(item => item.id === product.id);

  const handleAction = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onActionClick) {
      onActionClick(product);
    } else {
      addToCart(product, 1);
    }
  };

  return (
    <Link to={`/product/${product.id}`} className="unified-product-card">
      <div className="unified-card-image-container">
        {discountPercent > 0 && (
          <span className="unified-discount-badge">-{discountPercent}%</span>
        )}
        <img
          src={product.image || product.images?.[0]}
          alt={product.name}
          className="unified-product-image"
          loading="lazy"
        />
      </div>

      <div className="unified-card-info">
        <h3 className="unified-product-title">{product.name}</h3>
        <p className="unified-product-meta">{weightDisplay}</p>

        <div className="unified-product-rating">
          <div className="rating-stars">
            <Star size={12} fill="#d99026" color="#d99026" />
            <Star size={12} fill="#d99026" color="#d99026" />
            <Star size={12} fill="#d99026" color="#d99026" />
            <Star size={12} fill="#d99026" color="#d99026" />
            <Star size={12} fill="#d99026" color="#d99026" />
          </div>
          <span className="rating-text">(5.0)</span>
        </div>

        <div className="unified-price-row">
          <span className="unified-sale-price">₹{product.price}.00</span>
          {originalPrice > product.price && (
            <span className="unified-mrp-price">₹{originalPrice}.00</span>
          )}
        </div>

        <button
          className={`unified-card-btn ${isInCart ? 'in-cart' : ''}`}
          onClick={handleAction}
        >
          {isInCart ? (
            <>
              <Check size={16} /> Added to Cart
            </>
          ) : (
            <>
              <ShoppingCart size={16} /> {actionLabel || 'Add to Cart'}
            </>
          )}
        </button>
      </div>
    </Link>
  );
};

export default ProductCard;
