const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  const { productId, rating, comment } = req.body;
  if (!productId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'productId and a rating from 1-5 are required' });
  }

  try {
    await db.query(
      `INSERT INTO reviews (product_id, user_id, rating, comment)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (product_id, user_id) DO UPDATE SET rating = $3, comment = $4`,
      [productId, req.userId, rating, comment || null]
    );

    // Recalculate the product's aggregate rating from all its reviews
    const agg = await db.query(
      `SELECT AVG(rating)::numeric(2,1) AS avg_rating, COUNT(*) AS count
       FROM reviews WHERE product_id = $1`,
      [productId]
    );
    await db.query(
      'UPDATE products SET rating = $1, review_count = $2 WHERE id = $3',
      [agg.rows[0].avg_rating, agg.rows[0].count, productId]
    );

    res.status(201).json({ status: 'saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save review' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  const review = await db.query('SELECT product_id FROM reviews WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (review.rows.length === 0) return res.status(404).json({ error: 'Review not found' });

  await db.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);

  const productId = review.rows[0].product_id;
  const agg = await db.query(
    `SELECT COALESCE(AVG(rating)::numeric(2,1), 0) AS avg_rating, COUNT(*) AS count
     FROM reviews WHERE product_id = $1`, [productId]
  );
  await db.query('UPDATE products SET rating = $1, review_count = $2 WHERE id = $3',
    [agg.rows[0].avg_rating, agg.rows[0].count, productId]);

  res.json({ status: 'deleted' });
});

module.exports = router;
