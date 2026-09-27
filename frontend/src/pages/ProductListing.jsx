import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import ProductCard from '../components/ProductCard.jsx';
import api from '../lib/api';

export default function ProductListing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'relevance';
  const minRating = searchParams.get('minRating') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  useEffect(() => {
    api.get('/api/categories').then((res) => setCategories(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { search, category, sort, minRating, maxPrice, page, limit: 20 };
    Object.keys(params).forEach((k) => !params[k] && delete params[k]);

    api.get('/api/products', { params }).then((res) => {
      setProducts(res.data.products);
      setTotal(res.data.total);
      setLoading(false);
    });
  }, [search, category, sort, minRating, maxPrice, page]);

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next);
    setPage(1);
  }

  return (
    <div>
      <Header />
      <div className="container">
        <h2 style={{ marginTop: 20 }}>
          {search ? `Results for "${search}"` : category ? category.replace(/-/g, ' ') : 'All Products'}
          <span style={{ fontSize: 14, color: 'var(--gray-500)', fontWeight: 400, marginLeft: 10 }}>
            {total} products
          </span>
        </h2>

        <div className="listing-layout">
          <aside className="filters">
            <h4>Category</h4>
            <label>
              <input type="radio" name="category" checked={!category} onChange={() => updateParam('category', '')} />
              All
            </label>
            {categories.map((c) => (
              <label key={c.id}>
                <input type="radio" name="category" checked={category === c.slug} onChange={() => updateParam('category', c.slug)} />
                {c.name}
              </label>
            ))}

            <h4>Max Price</h4>
            {[1000, 5000, 20000, 50000].map((p) => (
              <label key={p}>
                <input type="radio" name="price" checked={maxPrice === String(p)} onChange={() => updateParam('maxPrice', p)} />
                Under ₹{p.toLocaleString('en-IN')}
              </label>
            ))}

            <h4>Rating</h4>
            {[4, 3, 2].map((r) => (
              <label key={r}>
                <input type="radio" name="rating" checked={minRating === String(r)} onChange={() => updateParam('minRating', r)} />
                {r}★ & above
              </label>
            ))}
          </aside>

          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 16 }}>
              <select value={sort} onChange={(e) => updateParam('sort', e.target.value)} style={{ width: 220 }}>
                <option value="relevance">Sort: Relevance</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest</option>
                <option value="discount">Discount</option>
              </select>
            </div>

            {loading ? (
              <div className="product-grid">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 260 }} />)}
              </div>
            ) : products.length === 0 ? (
              <div className="empty-state">No products found. Try adjusting your filters.</div>
            ) : (
              <>
                <div className="product-grid">
                  {products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, margin: '24px 0' }}>
                  <button className="btn btn-outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                  <span style={{ padding: 10 }}>Page {page}</span>
                  <button className="btn btn-outline" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
