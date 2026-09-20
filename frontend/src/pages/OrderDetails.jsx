import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import api from '../lib/api';

const TIMELINE = ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];

export default function OrderDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const justPlaced = searchParams.get('justPlaced');

  useEffect(() => {
    api.get(`/api/orders/${id}`).then((res) => setOrder(res.data));
  }, [id]);

  async function cancelOrder() {
    if (!window.confirm('Cancel this order?')) return;
    const { data } = await api.put(`/api/orders/${id}/cancel`);
    setOrder((prev) => ({ ...prev, status: data.status }));
  }

  if (!order) return <div><Header /><div className="container"><div className="skeleton" style={{ height: 200, marginTop: 20 }} /></div></div>;

  const currentStep = TIMELINE.indexOf(order.status);

  return (
    <div>
      <Header />
      <div className="container" style={{ paddingTop: 20, maxWidth: 700 }}>
        {justPlaced && (
          <div className="card" style={{ background: '#e6f4ea', border: '1px solid #b7e1c2' }}>
            ✅ Order placed successfully!
          </div>
        )}

        <h2>Order #{order.id.slice(0, 8)}</h2>
        <span className={`badge badge-${order.status}`}>{order.status.replace(/_/g, ' ')}</span>

        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
            {TIMELINE.map((s, i) => (
              <div key={s} style={{ flex: 1, height: 6, borderRadius: 4, background: i <= currentStep ? 'var(--primary)' : 'var(--gray-100)' }} />
            ))}
          </div>
        )}

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Items</h3>
          {order.items.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span>{item.product_name} × {item.quantity}</span>
              <span>₹{Number(item.price * item.quantity).toLocaleString('en-IN')}</span>
            </div>
          ))}
          <hr style={{ border: 'none', borderTop: '1px solid var(--gray-100)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>Total</span><span>₹{Number(order.total).toLocaleString('en-IN')}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Payment: {order.payment_status} (test mode)</p>
        </div>

        {['pending', 'confirmed'].includes(order.status) && (
          <button className="btn btn-outline" onClick={cancelOrder}>Cancel Order</button>
        )}
      </div>
    </div>
  );
}
