import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import ProductCard from '../components/ProductCard.jsx';
import api from '../lib/api';

const CATEGORY_ICONS = {
  electronics: '💻', mobiles: '📱', laptops: '💻', 'mens-fashion': '👔',
  'womens-fashion': '👗', shoes: '👟', 'home-kitchen': '🍳', beauty: '💄',
  sports: '🏋️', books: '📚'
};

function ProductSection({ title, products, seeAllHref }) {
  if (products.length === 0) return null;
  return (
    <div className="section">
      <div className="section-header">
        <h2>{title}</h2>
        {seeAllHref && <Link to={seeAllHref} className="see-all">See all →</Link>}
      </div>
      <div className="product-grid">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [flashDeals, setFlashDeals] = useState([]);
  const [trending, setTrending] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [cats, flash, trend, feat] = await Promise.all([
        api.get('/api/categories'),
        api.get('/api/products/flash-deals'),
        api.get('/api/products/trending'),
        api.get('/api/products/featured')
      ]);
      setCategories(cats.data);
      setFlashDeals(flash.data);
      setTrending(trend.data);
      setFeatured(feat.data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <Header />
      <div className="container">
        <div className="hero">
          <div>
            <h1>Big Shopping Days</h1>
            <p>Up to 70% off on electronics, fashion, and home essentials</p>
            <Link to="/products" className="btn btn-primary">Shop Now</Link>
          </div>
        </div>

        <div className="category-scroll">
          {categories.map((c) => (
            <Link key={c.id} to={`/products?category=${c.slug}`} className="category-pill">
              <div className="circle">{CATEGORY_ICONS[c.slug] || '🛍️'}</div>
              <span>{c.name}</span>
            </Link>
          ))}
        </div>

        {loading ? (
          <div className="product-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 260 }} />
            ))}
          </div>
        ) : (
          <>
            <ProductSection title="⚡ Flash Deals" products={flashDeals} seeAllHref="/products?sort=discount" />
            <ProductSection title="Trending Now" products={trending} seeAllHref="/products?sort=relevance" />
            <ProductSection title="Featured Products" products={featured} seeAllHref="/products" />
          </>
        )}
      </div>
    </div>
  );
}
