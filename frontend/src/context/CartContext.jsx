import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';
import * as guestCart from '../lib/guestCart';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]); // normalized: [{ productId, name, price, thumbnail, quantity }]
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    if (isAuthenticated) {
      const { data } = await api.get('/api/cart');
      setItems(data.filter((i) => !i.saved_for_later).map((i) => ({
        id: i.id, productId: i.product_id, name: i.name, price: i.price,
        thumbnail: i.thumbnail, quantity: i.quantity, stock: i.stock
      })));
    } else {
      // Guest cart only has productId/quantity -- product details are fetched
      // per-item where displayed (e.g. cart page), kept lightweight here.
      setItems(guestCart.getGuestCart().map((i) => ({ productId: i.productId, quantity: i.quantity })));
    }
    setLoading(false);
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);

  const addItem = useCallback(async (productId, quantity = 1) => {
    if (isAuthenticated) {
      await api.post('/api/cart', { productId, quantity });
    } else {
      guestCart.addToGuestCart(productId, quantity);
    }
    await refresh();
  }, [isAuthenticated, refresh]);

  const removeItem = useCallback(async (item) => {
    if (isAuthenticated) {
      await api.delete(`/api/cart/${item.id}`);
    } else {
      guestCart.removeFromGuestCart(item.productId);
    }
    await refresh();
  }, [isAuthenticated, refresh]);

  const updateQuantity = useCallback(async (item, quantity) => {
    if (quantity < 1) return;
    if (isAuthenticated) {
      await api.put(`/api/cart/${item.id}`, { quantity });
    } else {
      guestCart.updateGuestCartQuantity(item.productId, quantity);
    }
    await refresh();
  }, [isAuthenticated, refresh]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, loading, itemCount, addItem, removeItem, updateQuantity, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
