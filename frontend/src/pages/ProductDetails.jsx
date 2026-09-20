import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import ProductCard from '../components/ProductCard.jsx';
import api from '../lib/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState('description');
  const [pincode, setPincode] = useState('');
  const [deliveryMsg, setDeliveryMsg] = useState('');
  const [myRating, setMyRating] = useState(5);
  const [myComment, setMyComment] = useState('');

  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    api.get(`/api/products/${id}`).then((res) => setProduct(res.data));
  }, [id]);

  function checkPincode(e) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode)) {
      setDeliveryMsg('Enter a valid 6-digit pincode');
      return;
    }
    // Simple mock delivery estimate -- no real logistics backend here
    setDeliveryMsg(`Delivery by ${new Date(Date.now() + 4 * 86400000).toDateString()} to ${pincode}`);
  }

  async function handleAddToCart() {
    await addItem(product.id, quantity);
    showToast('Added to cart');
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!isAuthenticated) return showToast('Log in to leave a review');
    await api.post('/api/reviews', { productId: product.id, rating: myRating, comment: myComment });
    const refreshed = await api.get(`/api/products/${id}`);
    setProduct(refreshed.data);
    setMyComment('');
    showToast('Review submitted');
  }

  if (!product) {
    return <div><Header /><div className="container"><div className="skeleton" style={{ height: 400, marginTop: 20 }} /></div></div>;
  }

  return (
    <div>
      <Header />
      <div className="container" style={{ paddingTop: 20 }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ width: 380 }}>
            <img src={product.images?.[activeImage] || product.thumbnail} alt={product.name}
                 style={{ width: '100%', borderRadius: 12, aspectRatio: '1', objectFit: 'cover' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {(product.images || []).map((img, i) => (
                <img key={i} src={img} onClick={() => setActiveImage(i)}
                     style={{ width: 60, height: 60, borderRadius: 8, cursor: 'pointer', border: i === activeImage ? '2px solid var(--primary)' : '1px solid var(--gray-300)' }} />
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 280 }}>
            <span className="brand" style={{ textTransform: 'uppercase', fontSize: 12, color: 'var(--gray-500)' }}>{product.brand}</span>
            <h1 style={{ margin: '4px 0' }}>{product.name}</h1>
            {product.rating > 0 && <span className="rating-pill">{product.rating} ★ · {product.review_count} reviews</span>}

            <div className="price-row" style={{ margin: '16px 0' }}>
              <span className="price" style={{ fontSize: 28 }}>₹{Number(product.price).toLocaleString('en-IN')}</span>
              {product.discount_percent > 0 && (
                <>
                  <span className="original-price">₹{Number(product.original_price).toLocaleString('en-IN')}</span>
                  <span className="discount">{product.discount_percent}% off</span>
                </>
              )}
            </div>

            <p style={{ color: product.stock > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600, fontSize: 14 }}>
              {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
              <label style={{ fontSize: 14 }}>Qty:</label>
              <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} style={{ width: 70 }}>
                {Array.from({ length: Math.min(5, product.stock || 1) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" disabled={product.stock === 0} onClick={handleAddToCart}>Add to Cart</button>
              <button className="btn btn-dark" disabled={product.stock === 0} onClick={handleAddToCart}>Buy Now</button>
            </div>

            <form onSubmit={checkPincode} style={{ marginTop: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Check delivery availability</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" placeholder="Enter pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} style={{ marginBottom: 0 }} />
                <button className="btn btn-outline" type="submit">Check</button>
              </div>
              {deliveryMsg && <p style={{ fontSize: 13, marginTop: 6 }}>{deliveryMsg}</p>}
            </form>
          </div>
        </div>

        <div className="section">
          <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid var(--gray-100)' }}>
            {['description', 'specifications', 'reviews'].map((t) => (
              <div key={t} onClick={() => setTab(t)}
                   style={{ padding: '10px 4px', cursor: 'pointer', textTransform: 'capitalize',
                            borderBottom: tab === t ? '2px solid var(--primary)' : 'none', fontWeight: tab === t ? 600 : 400 }}>
                {t}
              </div>
            ))}
          </div>

          <div style={{ padding: '20px 0' }}>
            {tab === 'description' && <p>{product.description}</p>}
            {tab === 'specifications' && (
              <table style={{ width: '100%', maxWidth: 500 }}>
                <tbody>
                  {Object.entries(product.specifications || {}).map(([k, v]) => (
                    <tr key={k}><td style={{ padding: 6, color: 'var(--gray-500)' }}>{k}</td><td style={{ padding: 6 }}>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'reviews' && (
              <div>
                {isAuthenticated && (
                  <form onSubmit={submitReview} className="card" style={{ maxWidth: 400 }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>Rate this product</label>
                    <select value={myRating} onChange={(e) => setMyRating(Number(e.target.value))}>
                      {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} star</option>)}
                    </select>
                    <textarea placeholder="Write a review (optional)" rows={3} value={myComment} onChange={(e) => setMyComment(e.target.value)} />
                    <button className="btn btn-primary" type="submit">Submit Review</button>
                  </form>
                )}
                {(product.reviews || []).length === 0 && <p className="empty-state">No reviews yet.</p>}
                {(product.reviews || []).map((r, i) => (
                  <div key={i} className="card">
                    <strong>{r.user_name}</strong> <span className="rating-pill">{r.rating} ★</span>
                    <p style={{ marginTop: 6 }}>{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {product.related?.length > 0 && (
          <div className="section">
            <h2>Related Products</h2>
            <div className="product-grid">
              {product.related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
