const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth); // every cart route requires login

// Always return cart joined with LIVE product data (price, stock, name) --
// never trust anything the client might have cached about a product.
router.get('/', async (req, res) => {
  const result = await db.query(
    `SELECT ci.id, ci.quantity, ci.saved_for_later,
            p.id AS product_id, p.name, p.price, p.thumbnail, p.stock
     FROM cart_items ci JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = $1
     ORDER BY ci.created_at DESC`,
    [req.userId]
  );
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId || quantity < 1) return res.status(400).json({ error: 'Invalid productId or quantity' });

  const product = await db.query('SELECT stock FROM products WHERE id = $1', [productId]);
  if (product.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
  if (product.rows[0].stock < quantity) return res.status(400).json({ error: 'Not enough stock available' });

  const result = await db.query(
    `INSERT INTO cart_items (user_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = cart_items.quantity + $3
     RETURNING *`,
    [req.userId, productId, quantity]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:itemId', async (req, res) => {
  const { quantity, savedForLater } = req.body;
  const result = await db.query(
    `UPDATE cart_items SET quantity = COALESCE($1, quantity), saved_for_later = COALESCE($2, saved_for_later)
     WHERE id = $3 AND user_id = $4 RETURNING *`,
    [quantity, savedForLater, req.params.itemId, req.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Cart item not found' });
  res.json(result.rows[0]);
});

router.delete('/:itemId', async (req, res) => {
  await db.query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [req.params.itemId, req.userId]);
  res.json({ status: 'removed' });
});

// Merge a guest's localStorage cart into their account cart right after login.
router.post('/merge', async (req, res) => {
  const { items } = req.body; // [{ productId, quantity }]
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items[] required' });

  for (const item of items) {
    await db.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = cart_items.quantity + $3`,
      [req.userId, item.productId, item.quantity || 1]
    );
  }
  res.json({ status: 'merged' });
});

module.exports = router;
