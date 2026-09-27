import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import api from '../lib/api';

export default function Orders() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    api.get('/api/orders').then((res) => setOrders(res.data));
  }, []);

  if (!orders) return <div><Header /><div className="container"><div className="skeleton" style={{ height: 200, marginTop: 20 }} /></div></div>;

  return (
    <div>
      <Header />
      <div className="container" style={{ paddingTop: 20, maxWidth: 700 }}>
        <h2>My Orders</h2>
        {orders.length === 0 ? (
          <div className="empty-state">You haven't placed any orders yet. <Link to="/products" className="see-all">Start shopping →</Link></div>
        ) : (
          orders.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`} className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>Order #{o.id.slice(0, 8)}</strong>
                <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--gray-500)' }}>
                  {o.item_count} item(s) · {new Date(o.created_at).toLocaleDateString()}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 700 }}>₹{Number(o.total).toLocaleString('en-IN')}</p>
                <span className={`badge badge-${o.status}`}>{o.status.replace(/_/g, ' ')}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
