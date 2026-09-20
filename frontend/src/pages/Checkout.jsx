import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import api from '../lib/api';
import { useCart } from '../context/CartContext';

const STEPS = ['Address', 'Review', 'Payment'];

export default function Checkout() {
  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', line1: '', city: '', state: '', pincode: '' });
  const [placing, setPlacing] = useState(false);
  const { items, refresh } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/addresses').then((res) => {
      setAddresses(res.data);
      const def = res.data.find((a) => a.is_default) || res.data[0];
      if (def) setSelectedAddress(def.id);
    });
  }, []);

  async function saveAddress(e) {
    e.preventDefault();
    const { data } = await api.post('/api/addresses', { ...form, isDefault: addresses.length === 0 });
    setAddresses((prev) => [...prev, data]);
    setSelectedAddress(data.id);
    setShowAddForm(false);
  }

  async function placeOrder() {
    setPlacing(true);
    try {
      const { data } = await api.post('/api/orders', { addressId: selectedAddress });
      await refresh();
      navigate(`/orders/${data.id}?justPlaced=true`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to place order');
      setPlacing(false);
    }
  }

  const subtotal = items.reduce((sum, i) => sum + Number(i.price || 0) * i.quantity, 0);
  const deliveryFee = subtotal >= 500 || subtotal === 0 ? 0 : 49;

  return (
    <div>
      <Header />
      <div className="container" style={{ paddingTop: 20, maxWidth: 700 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ fontWeight: i === step ? 700 : 400, color: i === step ? 'var(--primary)' : 'var(--gray-500)' }}>
              {i + 1}. {s}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Select delivery address</h3>
            {addresses.map((a) => (
              <label key={a.id} style={{ display: 'block', border: '1px solid var(--gray-100)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <input type="radio" checked={selectedAddress === a.id} onChange={() => setSelectedAddress(a.id)} style={{ width: 'auto', marginRight: 8 }} />
                <strong>{a.full_name}</strong> — {a.line1}, {a.city}, {a.state} {a.pincode} · {a.phone}
              </label>
            ))}

            {/* {showAddForm ? (
              <form onSubmit={saveAddress} className="card">
                <input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                <input placeholder="Address line" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} required />
                <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
                <input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
                <input placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} required />
                <button className="btn btn-primary" type="submit">Save Address</button>
              </form>
            ) : (
              <button className="btn btn-outline" onClick={() => setShowAddForm(true)}>+ Add new address</button>
            )}

            <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} disabled={!selectedAddress} onClick={() => setStep(1)}>
              Continue
            </button> */}
            {showAddForm ? (
              <form onSubmit={saveAddress} className="card address-card">
                <div className="address-card-header">
                  <h3>Delivery Address</h3>
                  <p>Add an address for your order</p>
                </div>

                <div className="address-card-body">
                  <div className="address-form-grid">
                    <div className="full-width">
                      <label className="field-label">Full Name</label>
                      <input placeholder="Easy Bhai" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                    </div>

                    <div>
                      <label className="field-label">Phone Number</label>
                      <input placeholder="9876543210" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                    </div>
                    <div>
                      <label className="field-label">Pincode</label>
                      <input placeholder="110044" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} required />
                    </div>

                    <div className="full-width">
                      <label className="field-label">Address</label>
                      <textarea
                        placeholder="House no., building, street, area"
                        rows={2}
                        value={form.line1}
                        onChange={(e) => setForm({ ...form, line1: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="field-label">City</label>
                      <input placeholder="New Delhi" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
                    </div>
                    <div>
                      <label className="field-label">State</label>
                      <input placeholder="Delhi" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
                    </div>
                  </div>
                </div>

                <div className="address-card-footer">
                  <button className="btn btn-primary" type="submit">Save Address</button>
                </div>
              </form>
            ) : (
              <button className="btn btn-outline" onClick={() => setShowAddForm(true)}>+ Add new address</button>
            )}
          </div>
        )}
            {step === 1 && (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Order Summary</h3>
                {items.map((item) => (
                  <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <span>{item.name || 'Item'} × {item.quantity}</span>
                    <span>₹{Number(item.price * item.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <hr style={{ border: 'none', borderTop: '1px solid var(--gray-100)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Delivery</span><span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>Total</span><span>₹{(subtotal + deliveryFee).toLocaleString('en-IN')}</span></div>
                <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={() => setStep(2)}>Continue to Payment</button>
              </div>
            )}

            {step === 2 && (
              <div className="card">
                <div className="card" style={{ background: '#fff4e5', border: '1px solid #f5c26b' }}>
                  ⚠️ <strong>Test Mode</strong> — this is a mock checkout. No real payment will be charged.
                </div>
                <h3>Confirm your order</h3>
                <p>Total payable: <strong>₹{(subtotal + deliveryFee).toLocaleString('en-IN')}</strong></p>
                <button className="btn btn-primary btn-block" disabled={placing} onClick={placeOrder}>
                  {placing ? 'Placing order…' : 'Place Order (Test Payment)'}
                </button>
              </div>
            )}
          </div>
    </div>
      );
}
