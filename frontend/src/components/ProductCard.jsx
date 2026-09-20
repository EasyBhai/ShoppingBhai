import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();
  const [wishlisted, setWishlisted] = useState(false);

  async function handleAddToCart(e) {
    e.preventDefault();
    await addItem(product.id, 1);
    showToast(`${product.name} added to cart`);
  }

  async function toggleWishlist(e) {
    e.preventDefault();
    if (!isAuthenticated) {
      showToast('Please log in to save items to your wishlist');
      return;
    }
    if (wishlisted) {
      await api.delete(`/api/wishlist/${product.id}`);
    } else {
      await api.post('/api/wishlist', { productId: product.id });
    }
    setWishlisted(!wishlisted);
  }

  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <img src={product.thumbnail} alt={product.name} />
      <div className="info">
        <span className="brand">{product.brand}</span>
        <span className="name">{product.name}</span>
        {product.rating > 0 && <span className="rating-pill">{product.rating} ★ ({product.review_count})</span>}
        <div className="price-row">
          <span className="price">₹{Number(product.price).toLocaleString('en-IN')}</span>
          {product.discount_percent > 0 && (
            <>
              <span className="original-price">₹{Number(product.original_price).toLocaleString('en-IN')}</span>
              <span className="discount">{product.discount_percent}% off</span>
            </>
          )}
        </div>
      </div>
      <div className="card-actions">
        <button className="btn btn-primary" onClick={handleAddToCart}>Add to Cart</button>
        <button className={`wishlist-toggle ${wishlisted ? 'active' : ''}`} onClick={toggleWishlist}>♡</button>
      </div>
    </Link>
  );
}
