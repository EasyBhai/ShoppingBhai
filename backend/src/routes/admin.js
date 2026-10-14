const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// Dashboard data is derived from the current schema; no synthetic metrics.
router.get('/overview', async (req, res) => {
  try {
    const [products, customers, orders, revenue, pending, lowStock, recent, bestSellers] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS count FROM products'),
      db.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'customer'"),
      db.query('SELECT COUNT(*)::int AS count FROM orders'),
      db.query("SELECT COALESCE(SUM(total), 0)::numeric(12,2) AS total FROM orders WHERE payment_status = 'paid' AND status <> 'cancelled'"),
      db.query("SELECT COUNT(*)::int AS count FROM orders WHERE status IN ('pending','confirmed','processing')"),
      db.query('SELECT COUNT(*)::int AS count FROM products WHERE stock <= 5'),
      db.query(`SELECT o.id, o.status, o.payment_status, o.total, o.created_at,
                       u.name AS customer_name, u.email AS customer_email,
                       COUNT(oi.id)::int AS item_count
                FROM orders o JOIN users u ON u.id = o.user_id
                LEFT JOIN order_items oi ON oi.order_id = o.id
                GROUP BY o.id, u.name, u.email ORDER BY o.created_at DESC LIMIT 8`),
      db.query(`SELECT oi.product_id, oi.product_name AS name, SUM(oi.quantity)::int AS units_sold,
                       COALESCE(MAX(p.stock), 0)::int AS stock
                FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
                JOIN orders o ON o.id = oi.order_id
                WHERE o.status <> 'cancelled'
                GROUP BY oi.product_id, oi.product_name
                ORDER BY units_sold DESC LIMIT 5`)
    ]);
    res.json({
      stats: {
        products: products.rows[0].count,
        customers: customers.rows[0].count,
        orders: orders.rows[0].count,
        revenue: Number(revenue.rows[0].total),
        pendingOrders: pending.rows[0].count,
        lowStock: lowStock.rows[0].count
      },
      recentOrders: recent.rows,
      bestSellers: bestSellers.rows
    });
  } catch (err) {
    console.error('Admin overview failed:', err);
    res.status(500).json({ error: 'Failed to load dashboard overview' });
  }
});

router.get('/orders', async (req, res) => {
  const { search = '', status = '', paymentStatus = '' } = req.query;
  const params = [];
  const conditions = [];
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(o.id::text ILIKE $${params.length} OR COALESCE(u.name,'') ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    conditions.push(`o.status = $${params.length}`);
  }
  if (paymentStatus) {
    params.push(paymentStatus);
    conditions.push(`o.payment_status = $${params.length}`);
  }
  try {
    const result = await db.query(
      `SELECT o.id, o.status, o.payment_status, o.subtotal, o.discount, o.delivery_fee, o.total, o.created_at,
              u.name AS customer_name, u.email AS customer_email, COUNT(oi.id)::int AS item_count
       FROM orders o JOIN users u ON u.id = o.user_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
       GROUP BY o.id, u.name, u.email ORDER BY o.created_at DESC LIMIT 500`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Admin orders failed:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const orderResult = await db.query(
      `SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
              a.full_name AS address_name, a.phone AS address_phone, a.line1, a.line2, a.city, a.state, a.pincode
       FROM orders o JOIN users u ON u.id = o.user_id
       LEFT JOIN addresses a ON a.id = o.address_id WHERE o.id = $1`,
      [req.params.id]
    );
    if (!orderResult.rows.length) return res.status(404).json({ error: 'Order not found' });
    const items = await db.query('SELECT id, product_id, product_name, price, quantity FROM order_items WHERE order_id = $1', [req.params.id]);
    res.json({ ...orderResult.rows[0], items: items.rows });
  } catch (err) {
    console.error('Admin order detail failed:', err);
    res.status(500).json({ error: 'Failed to load order details' });
  }
});

router.get('/customers', async (req, res) => {
  const search = String(req.query.search || '').trim();
  const params = [];
  let where = "WHERE u.role = 'customer'";
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (u.name ILIKE $1 OR u.email ILIKE $1)`;
  }
  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at,
              COUNT(DISTINCT o.id)::int AS order_count,
              COALESCE(SUM(o.total) FILTER (WHERE o.payment_status = 'paid' AND o.status <> 'cancelled'),0)::numeric(12,2) AS paid_total
       FROM users u LEFT JOIN orders o ON o.user_id = u.id
       ${where} GROUP BY u.id ORDER BY u.created_at DESC LIMIT 500`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Admin customers failed:', err);
    res.status(500).json({ error: 'Failed to load customers' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, COUNT(p.id)::int AS product_count
       FROM categories c LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id ORDER BY c.name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Admin categories failed:', err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

function slugify(value) {
  return String(value || '').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

router.post('/categories', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Category name is required' });
  const slug = slugify(req.body.slug || name);
  if (!slug) return res.status(400).json({ error: 'A valid category slug is required' });
  try {
    const result = await db.query('INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING *', [name, slug]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A category with this name or slug already exists' });
    console.error('Create category failed:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/categories/:id', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Category name is required' });
  const slug = slugify(req.body.slug || name);
  try {
    const result = await db.query('UPDATE categories SET name = $1, slug = $2 WHERE id = $3 RETURNING *', [name, slug, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Category not found' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A category with this name or slug already exists' });
    console.error('Update category failed:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM categories WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Category not found' });
    // Existing schema uses ON DELETE SET NULL, so products are retained.
    res.json({ status: 'deleted' });
  } catch (err) {
    console.error('Delete category failed:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
