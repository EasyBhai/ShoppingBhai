const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const result = await db.query(
    'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
    [req.userId]
  );
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { fullName, phone, line1, line2, city, state, pincode, isDefault } = req.body;
  if (!fullName || !phone || !line1 || !city || !state || !pincode) {
    return res.status(400).json({ error: 'Missing required address fields' });
  }

  if (isDefault) {
    await db.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [req.userId]);
  }

  const result = await db.query(
    `INSERT INTO addresses (user_id, full_name, phone, line1, line2, city, state, pincode, is_default)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [req.userId, fullName, phone, line1, line2 || null, city, state, pincode, !!isDefault]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', async (req, res) => {
  const { fullName, phone, line1, line2, city, state, pincode, isDefault } = req.body;

  if (isDefault) {
    await db.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [req.userId]);
  }

  const result = await db.query(
    `UPDATE addresses SET
       full_name = COALESCE($1, full_name), phone = COALESCE($2, phone),
       line1 = COALESCE($3, line1), line2 = $4, city = COALESCE($5, city),
       state = COALESCE($6, state), pincode = COALESCE($7, pincode),
       is_default = COALESCE($8, is_default)
     WHERE id = $9 AND user_id = $10 RETURNING *`,
    [fullName, phone, line1, line2, city, state, pincode, isDefault, req.params.id, req.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Address not found' });
  res.json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.json({ status: 'deleted' });
});

module.exports = router;
