const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const FREE_DELIVERY_THRESHOLD = 500;
const DELIVERY_FEE = 49;

// Creates an order FROM the user's current cart.
// Every price/total here is computed from the database, never from the request body --
// the client only tells us WHICH address to ship to.
router.post('/', async (req, res) => {
  const { addressId } = req.body;
  if (!addressId) return res.status(400).json({ error: 'addressId is required' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const addressCheck = await client.query(
      'SELECT id FROM addresses WHERE id = $1 AND user_id = $2', [addressId, req.userId]
    );
    if (addressCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Address not found' });
    }

    const cartResult = await client.query(
      `SELECT ci.quantity, p.id AS product_id, p.name, p.price, p.stock
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1 AND ci.saved_for_later = false
       FOR UPDATE OF p`, // lock these product rows so stock can't race with another checkout
      [req.userId]
    );

    if (cartResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Your cart is empty' });
    }

    // Validate stock server-side -- never trust that the cart is still purchasable
    for (const item of cartResult.rows) {
      if (item.stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `${item.name} only has ${item.stock} left in stock` });
      }
    }

    const subtotal = cartResult.rows.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    const discount = 0; // placeholder for future coupon logic, computed server-side only
    const total = subtotal - discount + deliveryFee;

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, address_id, status, subtotal, discount, delivery_fee, total, payment_status)
       VALUES ($1,$2,'confirmed',$3,$4,$5,$6,'paid') RETURNING *`,
      [req.userId, addressId, subtotal, discount, deliveryFee, total]
    );
    const order = orderResult.rows[0];

    for (const item of cartResult.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
         VALUES ($1,$2,$3,$4,$5)`,
        [order.id, item.product_id, item.name, item.price, item.quantity]
      );
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    // Clear the purchased items out of the cart
    await client.query(
      `DELETE FROM cart_items WHERE user_id = $1 AND saved_for_later = false`,
      [req.userId]
    );

    await client.query('COMMIT');
    res.status(201).json(order);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to place order' });
  } finally {
    client.release();
  }
});

router.get('/', async (req, res) => {
  const result = await db.query(
    `SELECT o.*, COUNT(oi.id) AS item_count
     FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = $1 GROUP BY o.id ORDER BY o.created_at DESC`,
    [req.userId]
  );
  res.json(result.rows);
});

router.get('/:id', async (req, res) => {
  const orderResult = await db.query(
    'SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]
  );
  if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

  const items = await db.query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);
  res.json({ ...orderResult.rows[0], items: items.rows });
});

router.put('/:id/cancel', async (req, res) => {
  const result = await db.query(
    `UPDATE orders SET status = 'cancelled'
     WHERE id = $1 AND user_id = $2 AND status IN ('pending','confirmed')
     RETURNING *`,
    [req.params.id, req.userId]
  );
  if (result.rows.length === 0) {
    return res.status(400).json({ error: 'This order can no longer be cancelled' });
  }
  res.json(result.rows[0]);
});

// Admin: update order status (shipped, delivered, etc.)
router.put('/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  const valid = ['pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const result = await db.query(
    'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
  res.json(result.rows[0]);
});

module.exports = router;
