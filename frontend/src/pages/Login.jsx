import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      // Send the user back to wherever they were trying to go (e.g. checkout)
      navigate(location.state?.redirectTo || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  }

  return (
    <div className="container" style={{ maxWidth: 380, marginTop: 80 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Log in</h2>
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="name@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
          <button className="btn btn-primary btn-block" type="submit">Log in</button>
        </form>
        <p style={{ fontSize: 13, marginTop: 16 }}>
          Don't have an account? <Link to="/signup" style={{ color: 'var(--primary)' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
