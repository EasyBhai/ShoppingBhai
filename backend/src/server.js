require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const cartRoutes = require('./routes/cart');
const wishlistRoutes = require('./routes/wishlist');
const addressRoutes = require('./routes/addresses');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const userRoutes = require('./routes/users');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Keep error details out of what the client sees, per security requirements
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
