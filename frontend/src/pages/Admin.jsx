import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import './Admin.css';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
const date = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const pretty = (value = '') => String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function Status({ value }) {
  return <span className={`admin-status status-${String(value || 'pending').toLowerCase()}`}>{pretty(value || 'pending')}</span>;
}

function StatCard({ label, value, detail, icon }) {
  return <div className="admin-stat"><div className="admin-stat-top"><span>{label}</span><span className="admin-stat-icon">{icon}</span></div><strong>{value}</strong><small>{detail}</small></div>;
}

export default function Admin() {
  const { user, logout } = useAuth();
  const [section, setSection] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [productModal, setProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryModal, setCategoryModal] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', description: '', brand: '', price: '', originalPrice: '', stock: '0', thumbnail: '' });

  const notify = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 3200); };
  const loadOverview = useCallback(async () => { const { data } = await api.get('/api/admin/overview'); setOverview(data); }, []);
  const loadProducts = useCallback(async () => { const { data } = await api.get('/api/products?limit=500'); setProducts(data.products || []); }, []);
  const loadOrders = useCallback(async () => {
    const { data } = await api.get('/api/admin/orders', { params: { search: search || undefined, status: statusFilter || undefined, paymentStatus: paymentFilter || undefined } });
    setOrders(data);
  }, [search, statusFilter, paymentFilter]);
  const loadCustomers = useCallback(async () => { const { data } = await api.get('/api/admin/customers', { params: { search: search || undefined } }); setCustomers(data); }, [search]);
  const loadCategories = useCallback(async () => { const { data } = await api.get('/api/admin/categories'); setCategories(data); }, []);

  const refreshCurrent = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (section === 'overview') { await Promise.all([loadOverview(), loadProducts()]); }
      else if (section === 'products' || section === 'inventory') await loadProducts();
      else if (section === 'orders' || section === 'payments' || section === 'shipping') await loadOrders();
      else if (section === 'customers') await loadCustomers();
      else if (section === 'categories') await loadCategories();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load this section. Check the backend connection and try again.');
    } finally { setLoading(false); }
  }, [section, loadOverview, loadProducts, loadOrders, loadCustomers, loadCategories]);

  useEffect(() => { refreshCurrent(); }, [refreshCurrent]);

  const visibleProducts = useMemo(() => {
    const filtered = products.filter((p) => {
      const matches = `${p.name || ''} ${p.brand || ''}`.toLowerCase().includes(search.toLowerCase());
      if (!matches) return false;
      if (section === 'inventory') return Number(p.stock) <= 5;
      return true;
    });
    return filtered;
  }, [products, search, section]);

  function openNewProduct() {
    setEditingProduct(null);
    setProductForm({ name: '', description: '', brand: '', price: '', originalPrice: '', stock: '0', thumbnail: '' });
    setProductModal(true);
  }
  function openEditProduct(product) {
    setEditingProduct(product);
    setProductForm({ name: product.name || '', description: product.description || '', brand: product.brand || '', price: String(product.price ?? ''), originalPrice: String(product.original_price ?? ''), stock: String(product.stock ?? 0), thumbnail: product.thumbnail || '' });
    setProductModal(true);
  }
  async function saveProduct(e) {
    e.preventDefault(); setBusy(true); setError('');
    const payload = {
      name: productForm.name.trim(), description: productForm.description, brand: productForm.brand,
      price: Number(productForm.price), originalPrice: productForm.originalPrice ? Number(productForm.originalPrice) : Number(productForm.price),
      stock: Number(productForm.stock), thumbnail: productForm.thumbnail || null
    };
    try {
      if (editingProduct) await api.put(`/api/products/${editingProduct.id}`, payload);
      else await api.post('/api/products', payload);
      setProductModal(false); await Promise.all([loadProducts(), loadOverview()]); notify(editingProduct ? 'Product updated.' : 'Product added.');
    } catch (e2) { setError(e2.response?.data?.error || 'Unable to save product.'); }
    finally { setBusy(false); }
  }
  async function deleteProduct(product) {
    if (!window.confirm(`Delete "${product.name}"? This action cannot be undone.`)) return;
    try { await api.delete(`/api/products/${product.id}`); await loadProducts(); await loadOverview(); notify('Product deleted.'); }
    catch (e) { setError(e.response?.data?.error || 'Unable to delete product.'); }
  }
  async function updateOrderStatus(order, status) {
    if (status === 'cancelled' && !window.confirm('Cancel this order? Check any required refund and inventory actions separately.')) return;
    try { await api.put(`/api/orders/${order.id}/status`, { status }); await loadOrders(); await loadOverview(); notify('Order status updated.'); }
    catch (e) { setError(e.response?.data?.error || 'Unable to update order.'); }
  }
  async function showOrder(order) {
    try { const { data } = await api.get(`/api/admin/orders/${order.id}`); setOrderDetail(data); }
    catch (e) { setError(e.response?.data?.error || 'Unable to load order details.'); }
  }
  async function saveCategory(e) {
    e.preventDefault(); setBusy(true);
    try {
      if (categoryModal?.id) await api.put(`/api/admin/categories/${categoryModal.id}`, { name: categoryName });
      else await api.post('/api/admin/categories', { name: categoryName });
      setCategoryModal(null); setCategoryName(''); await loadCategories(); notify('Category saved.');
    } catch (e2) { setError(e2.response?.data?.error || 'Unable to save category.'); }
    finally { setBusy(false); }
  }
  async function deleteCategory(category) {
    if (!window.confirm(`Delete category "${category.name}"? Products in this category will remain but become uncategorized.`)) return;
    try { await api.delete(`/api/admin/categories/${category.id}`); await loadCategories(); notify('Category deleted.'); }
    catch (e) { setError(e.response?.data?.error || 'Unable to delete category.'); }
  }

  const nav = [
    ['overview', 'Overview', '▦'], ['products', 'Products', '▣'], ['inventory', 'Inventory', '▤'],
    ['orders', 'Orders', '▧'], ['shipping', 'Fulfillment', '↗'], ['payments', 'Payments', '₹'],
    ['customers', 'Customers', '♙'], ['categories', 'Categories', '◇']
  ];

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <a className="admin-brand" href="/">easy<span>bhai</span><small>ADMIN</small></a>
      <div className="admin-store-label">STORE MANAGEMENT</div>
      <nav className="admin-nav">{nav.map(([id, label, icon]) => <button key={id} className={section === id ? 'active' : ''} onClick={() => { setSection(id); setSearch(''); setError(''); }}><span className="nav-icon">{icon}</span>{label}{id === 'inventory' && overview?.stats?.lowStock > 0 && <i>{overview.stats.lowStock}</i>}</button>)}</nav>
      <div className="admin-sidebar-bottom"><a href="/" className="admin-back-link">← View storefront</a><div className="admin-user"><div className="admin-avatar">{(user?.name || user?.email || 'A').slice(0, 1).toUpperCase()}</div><div><strong>{user?.name || 'Store Admin'}</strong><small>{user?.email || 'Administrator'}</small></div><button title="Log out" onClick={logout}>↪</button></div></div>
    </aside>

    <main className="admin-main">
      <header className="admin-topbar"><div><span className="admin-breadcrumb">Store /</span> <strong>{nav.find((item) => item[0] === section)?.[1]}</strong></div><div className="admin-top-actions"><span className="admin-live-dot"></span><span>Store is active</span><button onClick={refreshCurrent} title="Refresh data" className="admin-refresh">↻ Refresh</button></div></header>
      <div className="admin-content">
        <div className="admin-page-heading"><div><p className="admin-eyebrow">YOUR STORE AT A GLANCE</p><h1>{nav.find((item) => item[0] === section)?.[1]}</h1><p className="admin-subtitle">{section === 'overview' ? 'Monitor your store performance and keep things moving.' : `Manage your store ${section === 'shipping' ? 'fulfillment' : section} in one place.`}</p></div>
          {section === 'products' && <button className="admin-primary" onClick={openNewProduct}>＋ Add product</button>}
          {section === 'categories' && <button className="admin-primary" onClick={() => { setCategoryName(''); setCategoryModal({}); }}>＋ Add category</button>}
        </div>
        {error && <div className="admin-alert"><span>{error}</span><button onClick={() => setError('')}>Dismiss</button></div>}
        {notice && <div className="admin-notice">{notice}</div>}
        {loading ? <div className="admin-loading"><div className="admin-spinner"></div><span>Loading store data…</span></div> : <>
          {section === 'overview' && <>
            <div className="admin-stats-grid">
              <StatCard label="Total sales" value={money(overview?.stats?.revenue)} detail="Paid, non-cancelled orders" icon="₹"/>
              <StatCard label="Orders" value={overview?.stats?.orders ?? 0} detail={`${overview?.stats?.pendingOrders ?? 0} need attention`} icon="▧"/>
              <StatCard label="Products" value={overview?.stats?.products ?? 0} detail="Products in your catalog" icon="▣"/>
              <StatCard label="Customers" value={overview?.stats?.customers ?? 0} detail="Registered customer accounts" icon="♙"/>
            </div>
            <div className="admin-stats-grid admin-stats-secondary">
              <StatCard label="Pending orders" value={overview?.stats?.pendingOrders ?? 0} detail="Pending, confirmed or processing" icon="◷"/>
              <StatCard label="Low stock" value={overview?.stats?.lowStock ?? 0} detail="Products with 5 or fewer units" icon="⚠"/>
            </div>
            <div className="admin-panels-grid">
              <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Recent orders</h2><p>Latest activity from your customers</p></div><button className="admin-text-button" onClick={() => setSection('orders')}>View all →</button></div>
                {overview?.recentOrders?.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody>{overview.recentOrders.map((o) => <tr key={o.id}><td><button className="admin-id-button" onClick={() => showOrder(o)}>#{String(o.id).slice(0, 8)}</button></td><td><strong>{o.customer_name || 'Customer'}</strong><small>{o.customer_email}</small></td><td>{date(o.created_at)}</td><td>{money(o.total)}</td><td><Status value={o.status}/></td></tr>)}</tbody></table></div> : <div className="admin-empty">No orders yet. New orders will appear here.</div>}
              </section>
              <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Best sellers</h2><p>Based on non-cancelled order items</p></div></div>
                {overview?.bestSellers?.length ? <div className="admin-best-list">{overview.bestSellers.map((p, i) => <div className="admin-best-row" key={`${p.product_id}-${i}`}><span className="admin-rank">{i + 1}</span><div className="admin-best-info"><strong>{p.name}</strong><small>{p.stock} in stock</small></div><b>{p.units_sold} sold</b></div>)}</div> : <div className="admin-empty">Sales data will appear after orders are placed.</div>}
              </section>
            </div>
          </>}

          {(section === 'products' || section === 'inventory') && <>
            <div className="admin-toolbar"><input className="admin-search" placeholder="Search by product name or brand…" value={search} onChange={(e) => setSearch(e.target.value)}/><span>{visibleProducts.length} products</span></div>
            {section === 'inventory' && <div className="admin-info-banner">Showing products with 5 or fewer units in stock. Update stock from the product editor.</div>}
            <section className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Category</th><th>Availability</th><th>Actions</th></tr></thead><tbody>{visibleProducts.map((p) => <tr key={p.id}><td><div className="admin-product-cell">{p.thumbnail ? <img src={p.thumbnail} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }}/> : <span className="admin-product-placeholder">▣</span>}<div><strong>{p.name}</strong><small>{p.brand || 'No brand'}</small></div></div></td><td>{money(p.price)}{p.original_price && Number(p.original_price) > Number(p.price) && <small className="admin-muted"><s>{money(p.original_price)}</s></small>}</td><td><strong className={Number(p.stock) <= 5 ? 'admin-stock-low' : ''}>{p.stock}</strong></td><td>{p.category_name || '—'}</td><td><Status value={Number(p.stock) > 0 ? 'in_stock' : 'out_of_stock'}/></td><td><div className="admin-row-actions"><button onClick={() => openEditProduct(p)}>Edit</button><button className="danger" onClick={() => deleteProduct(p)}>Delete</button></div></td></tr>)}</tbody></table></div>{visibleProducts.length === 0 && <div className="admin-empty">No products match your search.</div>}</section>
          </>}

          {(section === 'orders' || section === 'shipping' || section === 'payments') && <>
            <div className="admin-toolbar admin-order-toolbar"><input className="admin-search" placeholder="Search order ID or customer…" value={search} onChange={(e) => setSearch(e.target.value)}/><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All order statuses</option>{['pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled'].map((s) => <option key={s} value={s}>{pretty(s)}</option>)}</select>{section === 'payments' && <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}><option value="">All payment statuses</option>{['pending','paid','failed'].map((s) => <option key={s} value={s}>{pretty(s)}</option>)}</select>}<span>{orders.length} orders</span></div>
            {section === 'payments' && <div className="admin-info-banner">Payment status is read-only here. Payments must only be marked paid after trusted server-side gateway verification or authorized manual bank-transfer verification.</div>}
            {section === 'shipping' && <div className="admin-info-banner">Update fulfillment status from each order. Carrier tracking is not connected in this version.</div>}
            <section className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th>{section !== 'payments' && <th>Update status</th>}</tr></thead><tbody>{orders.map((o) => <tr key={o.id}><td><button className="admin-id-button" onClick={() => showOrder(o)}>#{String(o.id).slice(0, 8)}</button></td><td><strong>{o.customer_name || 'Customer'}</strong><small>{o.customer_email}</small></td><td>{date(o.created_at)}</td><td>{o.item_count}</td><td>{money(o.total)}</td><td><Status value={o.payment_status}/></td><td><Status value={o.status}/></td>{section !== 'payments' && <td><select className="admin-status-select" value={o.status} onChange={(e) => updateOrderStatus(o, e.target.value)}>{['pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled'].map((s) => <option key={s} value={s}>{pretty(s)}</option>)}</select></td>}</tr>)}</tbody></table></div>{orders.length === 0 && <div className="admin-empty">No orders found for these filters.</div>}</section>
          </>}

          {section === 'customers' && <><div className="admin-toolbar"><input className="admin-search" placeholder="Search customer name or email…" value={search} onChange={(e) => setSearch(e.target.value)}/><span>{customers.length} customers</span></div><section className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Phone</th><th>Joined</th><th>Orders</th><th>Paid total</th></tr></thead><tbody>{customers.map((c) => <tr key={c.id}><td><div className="admin-customer-cell"><span className="admin-avatar">{(c.name || c.email || 'C').slice(0,1).toUpperCase()}</span><div><strong>{c.name || 'Unnamed customer'}</strong><small>{c.email}</small></div></div></td><td>{c.phone || '—'}</td><td>{date(c.created_at)}</td><td>{c.order_count}</td><td>{money(c.paid_total)}</td></tr>)}</tbody></table></div>{customers.length === 0 && <div className="admin-empty">No customers found.</div>}</section></>}

          {section === 'categories' && <section className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Category</th><th>Slug</th><th>Products</th><th>Actions</th></tr></thead><tbody>{categories.map((c) => <tr key={c.id}><td><strong>{c.name}</strong></td><td><code>{c.slug}</code></td><td>{c.product_count ?? 0}</td><td><div className="admin-row-actions"><button onClick={() => { setCategoryModal(c); setCategoryName(c.name); }}>Edit</button><button className="danger" onClick={() => deleteCategory(c)}>Delete</button></div></td></tr>)}</tbody></table></div>{categories.length === 0 && <div className="admin-empty">No categories yet. Add your first category.</div>}</section>}

        </>}
        <footer className="admin-footer">EasyBhai Admin · Store management</footer>
      </div>
    </main>

    {productModal && <div className="admin-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setProductModal(false); }}><form className="admin-modal" onSubmit={saveProduct}><div className="admin-modal-heading"><div><p className="admin-eyebrow">CATALOG</p><h2>{editingProduct ? 'Edit product' : 'Add product'}</h2></div><button type="button" className="admin-close" onClick={() => setProductModal(false)}>×</button></div><label>Product name<input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}/></label><label>Brand<input value={productForm.brand} onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}/></label><label>Description<textarea rows="3" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}/></label><div className="admin-form-grid"><label>Price (₹)<input required type="number" min="0" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}/></label><label>Original price (₹)<input type="number" min="0" step="0.01" value={productForm.originalPrice} onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value })}/></label><label>Stock<input required type="number" min="0" step="1" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}/></label></div><label>Image URL<input type="url" placeholder="https://…" value={productForm.thumbnail} onChange={(e) => setProductForm({ ...productForm, thumbnail: e.target.value })}/></label><div className="admin-modal-actions"><button type="button" className="admin-secondary" onClick={() => setProductModal(false)}>Cancel</button><button className="admin-primary" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button></div></form></div>}

    {categoryModal && <div className="admin-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setCategoryModal(null); }}><form className="admin-modal admin-modal-small" onSubmit={saveCategory}><div className="admin-modal-heading"><h2>{categoryModal.id ? 'Edit category' : 'Add category'}</h2><button type="button" className="admin-close" onClick={() => setCategoryModal(null)}>×</button></div><label>Category name<input required autoFocus value={categoryName} onChange={(e) => setCategoryName(e.target.value)}/></label><p className="admin-help">A URL-friendly slug will be generated from the name.</p><div className="admin-modal-actions"><button type="button" className="admin-secondary" onClick={() => setCategoryModal(null)}>Cancel</button><button className="admin-primary" disabled={busy}>{busy ? 'Saving…' : 'Save category'}</button></div></form></div>}

    {orderDetail && <div className="admin-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOrderDetail(null); }}><div className="admin-modal"><div className="admin-modal-heading"><div><p className="admin-eyebrow">ORDER DETAILS</p><h2>#{String(orderDetail.id).slice(0, 8)}</h2></div><button className="admin-close" onClick={() => setOrderDetail(null)}>×</button></div><div className="admin-detail-customer"><strong>{orderDetail.customer_name || 'Customer'}</strong><span>{orderDetail.customer_email}</span><span>{orderDetail.customer_phone || orderDetail.address_phone || ''}</span></div><div className="admin-detail-address"><strong>Delivery address</strong><p>{[orderDetail.address_name, orderDetail.line1, orderDetail.line2, orderDetail.city, orderDetail.state, orderDetail.pincode].filter(Boolean).join(', ') || 'No address available'}</p></div><div className="admin-detail-items">{(orderDetail.items || []).map((item) => <div key={item.id}><span>{item.product_name} × {item.quantity}</span><strong>{money(Number(item.price) * Number(item.quantity))}</strong></div>)}</div><div className="admin-detail-total"><span>Subtotal</span><b>{money(orderDetail.subtotal)}</b><span>Delivery fee</span><b>{money(orderDetail.delivery_fee)}</b><span>Total</span><strong>{money(orderDetail.total)}</strong></div><div className="admin-modal-actions"><Status value={orderDetail.status}/><Status value={orderDetail.payment_status}/><button className="admin-secondary" onClick={() => setOrderDetail(null)}>Close</button></div></div></div>}
  </div>;
}

// Below code is commented out because the admin page updated
// import { useEffect, useState } from 'react';
// import Header from '../components/Header.jsx';
// import api from '../lib/api';

// export default function Admin() {
//   const [products, setProducts] = useState([]);
//   const [orders, setOrders] = useState([]);
//   const [tab, setTab] = useState('products');
//   const [form, setForm] = useState({ name: '', price: '', stock: '', brand: '' });

//   useEffect(() => {
//     api.get('/api/products?limit=100').then((res) => setProducts(res.data.products));
//   }, []);

//   async function addProduct(e) {
//     e.preventDefault();
//     const { data } = await api.post('/api/products', {
//       name: form.name, price: Number(form.price), stock: Number(form.stock), brand: form.brand,
//       thumbnail: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#4f46e5"/></svg>`)}`
//     });
//     setProducts((prev) => [data, ...prev]);
//     setForm({ name: '', price: '', stock: '', brand: '' });
//   }

//   async function deleteProduct(id) {
//     if (!window.confirm('Delete this product?')) return;
//     await api.delete(`/api/products/${id}`);
//     setProducts((prev) => prev.filter((p) => p.id !== id));
//   }

//   return (
//     <div>
//       <Header />
//       <div className="container" style={{ paddingTop: 20 }}>
//         <h2>Admin Dashboard</h2>
//         <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
//           <button className={`btn ${tab === 'products' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('products')}>Products</button>
//         </div>

//         {tab === 'products' && (
//           <>
//             <form onSubmit={addProduct} className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
//               <input style={{ marginBottom: 0, width: 180 }} placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
//               <input style={{ marginBottom: 0, width: 120 }} placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
//               <input style={{ marginBottom: 0, width: 100 }} type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
//               <input style={{ marginBottom: 0, width: 100 }} type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
//               <button className="btn btn-primary" type="submit">Add Product</button>
//             </form>

//             {products.map((p) => (
//               <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                 <div>
//                   <strong>{p.name}</strong>
//                   <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-500)' }}>₹{p.price} · Stock: {p.stock}</p>
//                 </div>
//                 <button className="btn btn-outline" onClick={() => deleteProduct(p.id)}>Delete</button>
//               </div>
//             ))}
//           </>
//         )}
//       </div>
//     </div>
//   );
// }
