const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/profile', async (req, res) => {
  const result = await db.query('SELECT id, email, name, phone, role FROM users WHERE id = $1', [req.userId]);
  res.json(result.rows[0]);
});

router.put('/profile', async (req, res) => {
  const { name, phone } = req.body;
  const result = await db.query(
    `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone)
     WHERE id = $3 RETURNING id, email, name, phone, role`,
    [name, phone, req.userId]
  );
  res.json(result.rows[0]);
});

module.exports = router;
