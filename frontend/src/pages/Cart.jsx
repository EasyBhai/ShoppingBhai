import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Header from '../components/Header.jsx';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function Cart() {
  const { items, loading, updateQuantity, removeItem, refresh } = useCart();
  const { isAuthenticated } = useAuth();
  const [guestProducts, setGuestProducts] = useState({});
  const navigate = useNavigate();

  // Guest cart only stores productId+quantity; fetch product details to display them.
  useEffect(() => {
    if (isAuthenticated) return;
    const ids = items.map((i) => i.productId);
    Promise.all(ids.map((id) => api.get(`/api/products/${id}`).then((r) => r.data).catch(() => null)))
      .then((products) => {
        const map = {};
        products.forEach((p) => { if (p) map[p.id] = p; });
        setGuestProducts(map);
      });
  }, [items, isAuthenticated]);

  function display(item) {
    if (isAuthenticated) return item;
    const p = guestProducts[item.productId];
    return p ? { ...item, name: p.name, price: p.price, thumbnail: p.thumbnail, stock: p.stock } : null;
  }

  const displayItems = items.map(display).filter(Boolean);
  const subtotal = displayItems.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const deliveryFee = subtotal >= 500 || subtotal === 0 ? 0 : 49;
  const total = subtotal + deliveryFee;

  function goToCheckout() {
    if (!isAuthenticated) {
      showLoginPrompt();
      return;
    }
    navigate('/checkout');
  }

  function showLoginPrompt() {
    if (window.confirm('Please log in to continue to checkout. Go to login now?')) {
      navigate('/login', { state: { redirectTo: '/checkout' } });
    }
  }

  if (loading) return <div><Header /><div className="container"><div className="skeleton" style={{ height: 300, marginTop: 20 }} /></div></div>;

  return (
    <div>
      <Header />
      <div className="container" style={{ paddingTop: 20 }}>
        <h2>Shopping Cart</h2>
        {displayItems.length === 0 ? (
          <div className="empty-state">
            Your cart is empty. <Link to="/products" className="see-all">Continue shopping →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: 320 }}>
              {displayItems.map((item) => (
                <div key={item.productId} className="card" style={{ display: 'flex', gap: 16 }}>
                  <img src={item.thumbnail} alt={item.name} style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <strong>{item.name}</strong>
                    <p style={{ margin: '4px 0' }}>₹{Number(item.price).toLocaleString('en-IN')}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button className="btn btn-outline" style={{ padding: '4px 10px' }} onClick={() => updateQuantity(item, item.quantity - 1)}>-</button>
                      <span>{item.quantity}</span>
                      <button className="btn btn-outline" style={{ padding: '4px 10px' }} onClick={() => updateQuantity(item, item.quantity + 1)}>+</button>
                      <a href="#" style={{ marginLeft: 16, fontSize: 13, color: 'var(--danger)' }}
                         onClick={(e) => { e.preventDefault(); removeItem(item); }}>Remove</a>
                    </div>
                  </div>
                  <strong>₹{(item.price * item.quantity).toLocaleString('en-IN')}</strong>
                </div>
              ))}
            </div>

            <div style={{ flex: 1, minWidth: 260 }}>
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Order Summary</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0' }}>
                  <span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0' }}>
                  <span>Delivery</span><span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--gray-100)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18 }}>
                  <span>Total</span><span>₹{total.toLocaleString('en-IN')}</span>
                </div>
                <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={goToCheckout}>
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
