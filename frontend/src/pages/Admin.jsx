import { useEffect, useState } from 'react';
import Header from '../components/Header.jsx';
import api from '../lib/api';

export default function Admin() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('products');
  const [form, setForm] = useState({ name: '', price: '', stock: '', brand: '' });

  useEffect(() => {
    api.get('/api/products?limit=100').then((res) => setProducts(res.data.products));
  }, []);

  async function addProduct(e) {
    e.preventDefault();
    const { data } = await api.post('/api/products', {
      name: form.name, price: Number(form.price), stock: Number(form.stock), brand: form.brand,
      thumbnail: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#4f46e5"/></svg>`)}`
    });
    setProducts((prev) => [data, ...prev]);
    setForm({ name: '', price: '', stock: '', brand: '' });
  }

  async function deleteProduct(id) {
    if (!window.confirm('Delete this product?')) return;
    await api.delete(`/api/products/${id}`);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <Header />
      <div className="container" style={{ paddingTop: 20 }}>
        <h2>Admin Dashboard</h2>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <button className={`btn ${tab === 'products' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('products')}>Products</button>
        </div>

        {tab === 'products' && (
          <>
            <form onSubmit={addProduct} className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <input style={{ marginBottom: 0, width: 180 }} placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input style={{ marginBottom: 0, width: 120 }} placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              <input style={{ marginBottom: 0, width: 100 }} type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              <input style={{ marginBottom: 0, width: 100 }} type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
              <button className="btn btn-primary" type="submit">Add Product</button>
            </form>

            {products.map((p) => (
              <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{p.name}</strong>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-500)' }}>₹{p.price} · Stock: {p.stock}</p>
                </div>
                <button className="btn btn-outline" onClick={() => deleteProduct(p.id)}>Delete</button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
