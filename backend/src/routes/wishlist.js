const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const result = await db.query(
    `SELECT w.id AS wishlist_id, p.* FROM wishlist_items w
     JOIN products p ON p.id = w.product_id
     WHERE w.user_id = $1 ORDER BY w.created_at DESC`,
    [req.userId]
  );
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId is required' });

  await db.query(
    `INSERT INTO wishlist_items (user_id, product_id) VALUES ($1, $2)
     ON CONFLICT (user_id, product_id) DO NOTHING`,
    [req.userId, productId]
  );
  res.status(201).json({ status: 'added' });
});

router.delete('/:productId', async (req, res) => {
  await db.query(
    'DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2',
    [req.userId, req.params.productId]
  );
  res.json({ status: 'removed' });
});

module.exports = router;
