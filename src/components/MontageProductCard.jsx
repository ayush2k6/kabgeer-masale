import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './MontageProductCard.css';

const MontageProductCard = ({ product }) => {
  const { addToCart, cartItems } = useCart();

  if (!product) return null;

  const isInCart = cartItems.some(item => item.id === product.id);

  const handleAction = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
  };

  const displayImage = product.image || product.images?.[0];

  return (
    <Link to={`/product/${product.id}`} className="montage-product-card">
      <div className="montage-card-image-container">
        <img
          src={displayImage}
          alt={product.name}
          className="montage-product-image"
          loading="lazy"
        />
      </div>

      <div className="montage-card-info">
        <h3 className="montage-product-title">{product.name}</h3>
        <span className="montage-sale-price">₹{product.price}.00</span>

        <button
          className={`montage-card-btn ${isInCart ? 'in-cart' : ''}`}
          onClick={handleAction}
        >
          {isInCart ? (
            <>
              <Check size={16} /> Added
            </>
          ) : (
            <>
              Buy Now <ShoppingCart size={16} />
            </>
          )}
        </button>
      </div>
    </Link>
  );
};

export default MontageProductCard;
