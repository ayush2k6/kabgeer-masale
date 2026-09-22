import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './MontageProductCard.css';

const MontageProductCard = ({ product }) => {
  const { addToCart, cartItems } = useCart();

  if (!product) return null;

  const isInCart = cartItems.some(item => item.id === product.id);
  const originalPrice = product.mrp || Math.round(product.price * 1.15);
  const discountPercent = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 15;
  const weightDisplay = product.weight || (product.weightInGrams ? `${product.weightInGrams}g` : '50g');

  const handleAction = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
  };

  const displayImage = product.image || product.images?.[0];

  return (
    <Link to={`/product/${product.id}`} className="montage-product-card">
      <div className="montage-card-image-container">
        {discountPercent > 0 && (
          <span className="montage-discount-badge">-{discountPercent}%</span>
        )}
        <img
          src={displayImage}
          alt={product.name}
          className="montage-product-image"
          loading="lazy"
        />
      </div>

      <div className="montage-card-info">
        <div className="montage-meta-row">
          <span className="montage-product-weight">{weightDisplay}</span>
          <div className="montage-rating">
            <Star size={11} fill="#d99026" color="#d99026" />
            <span>5.0</span>
          </div>
        </div>

        <h3 className="montage-product-title" title={product.name}>{product.name}</h3>

        <div className="montage-price-row">
          <span className="montage-sale-price">₹{product.price}.00</span>
          {originalPrice > product.price && (
            <span className="montage-mrp-price">₹{originalPrice}.00</span>
          )}
        </div>

        <button
          className={`montage-card-btn ${isInCart ? 'in-cart' : ''}`}
          onClick={handleAction}
          aria-label={isInCart ? 'Added to cart' : `Buy ${product.name}`}
        >
          {isInCart ? (
            <>
              <Check size={15} /> Added
            </>
          ) : (
            <>
              Buy Now <ShoppingCart size={15} />
            </>
          )}
        </button>
      </div>
    </Link>
  );
};

export default MontageProductCard;
