import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Account() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [addresses, setAddresses] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/api/users/profile').then((res) => setProfile({ name: res.data.name || '', phone: res.data.phone || '' }));
    api.get('/api/addresses').then((res) => setAddresses(res.data));
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    await api.put('/api/users/profile', profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <Header />
      <div className="container" style={{ paddingTop: 20, maxWidth: 600 }}>
        <h2>My Account</h2>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Profile</h3>
          <form onSubmit={saveProfile}>
            <input type="text" value={user?.email} disabled style={{ background: 'var(--gray-100)' }} />
            <input type="text" placeholder="Name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <input type="tel" placeholder="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            <button className="btn btn-primary" type="submit">Save Changes</button>
            {saved && <span style={{ marginLeft: 10, color: 'var(--success)', fontSize: 13 }}>Saved!</span>}
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Saved Addresses</h3>
          {addresses.length === 0 && <p className="empty-state" style={{ padding: 20 }}>No addresses saved yet.</p>}
          {addresses.map((a) => (
            <div key={a.id} style={{ padding: 10, borderBottom: '1px solid var(--gray-100)' }}>
              <strong>{a.full_name}</strong> {a.is_default && <span className="badge badge-confirmed">Default</span>}
              <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--gray-500)' }}>{a.line1}, {a.city}, {a.state} {a.pincode}</p>
            </div>
          ))}
        </div>

        <div className="card">
          <Link to="/orders" className="see-all">View My Orders →</Link>
        </div>
      </div>
    </div>
  );
}
