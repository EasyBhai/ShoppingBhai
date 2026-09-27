import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import ProductCard from '../components/ProductCard.jsx';
import api from '../lib/api';

export default function Wishlist() {
  const [products, setProducts] = useState(null);

  useEffect(() => {
    api.get('/api/wishlist').then((res) => setProducts(res.data));
  }, []);

  if (!products) return <div><Header /><div className="container"><div className="skeleton" style={{ height: 300, marginTop: 20 }} /></div></div>;

  return (
    <div>
      <Header />
      <div className="container" style={{ paddingTop: 20 }}>
        <h2>My Wishlist</h2>
        {products.length === 0 ? (
          <div className="empty-state">Your wishlist is empty. <Link to="/products" className="see-all">Browse products →</Link></div>
        ) : (
          <div className="product-grid">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
