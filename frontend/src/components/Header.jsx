import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">Shopping Bhai</Link>

        <form className="search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search for products, brands and more"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        <div className="header-actions">
          <Link to="/wishlist" className="icon-btn">
            ♡ <span>Wishlist</span>
          </Link>

          <Link to="/cart" className="icon-btn">
            🛒 <span>Cart</span>
            {itemCount > 0 && <span className="badge-count">{itemCount}</span>}
          </Link>

          {isAuthenticated ? (
            <div style={{ position: 'relative' }}>
              <div className="icon-btn" onClick={() => setMenuOpen((o) => !o)}>
                👤 <span>{user.name || 'Account'}</span>
              </div>
              {menuOpen && (
                <div className="card" style={{ position: 'absolute', right: 0, top: 40, width: 160, padding: 8, zIndex: 60 }}>
                  <Link to="/account" style={{ display: 'block', padding: 8 }} onClick={() => setMenuOpen(false)}>Profile</Link>
                  <Link to="/orders" style={{ display: 'block', padding: 8 }} onClick={() => setMenuOpen(false)}>My Orders</Link>
                  <Link to="/wishlist" style={{ display: 'block', padding: 8 }} onClick={() => setMenuOpen(false)}>Wishlist</Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" style={{ display: 'block', padding: 8 }} onClick={() => setMenuOpen(false)}>Admin</Link>
                  )}
                  <a href="#" style={{ display: 'block', padding: 8 }} onClick={() => { logout(); setMenuOpen(false); navigate('/'); }}>Logout</a>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline">Login</Link>
              <Link to="/signup" className="btn btn-primary">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
