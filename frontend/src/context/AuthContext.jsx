import { createContext, useContext, useState, useCallback } from 'react';
import api from '../lib/api';
import { getGuestCart, clearGuestCart } from '../lib/guestCart';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);

    // Merge whatever the guest had in localStorage into their real account cart
    const guestItems = getGuestCart();
    if (guestItems.length > 0) {
      await api.post('/api/cart/merge', { items: guestItems });
      clearGuestCart();
    }
  }, []);

  const signup = useCallback(async (email, password, name) => {
    const { data } = await api.post('/api/auth/signup', { email, password, name });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
