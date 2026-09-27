import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { RequireAuth, RequireAdmin } from './context/RouteGuards.jsx';

import Home from './pages/Home.jsx';
import ProductListing from './pages/ProductListing.jsx';
import ProductDetails from './pages/ProductDetails.jsx';
import Cart from './pages/Cart.jsx';
import Wishlist from './pages/Wishlist.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetails from './pages/OrderDetails.jsx';
import Account from './pages/Account.jsx';
import Admin from './pages/Admin.jsx';

import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <Routes>
              {/* Public routes -- browsing never requires login */}
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<ProductListing />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Requires login */}
              <Route path="/wishlist" element={<RequireAuth><Wishlist /></RequireAuth>} />
              <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
              <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
              <Route path="/orders/:id" element={<RequireAuth><OrderDetails /></RequireAuth>} />
              <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />

              {/* Admin only */}
              <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
            </Routes>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
