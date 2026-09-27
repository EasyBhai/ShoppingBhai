const express = require('express');
const db = require('../db');
const { optionalAuth, requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const SORT_MAP = {
  price_low: 'price ASC',
  price_high: 'price DESC',
  rating: 'rating DESC',
  newest: 'created_at DESC',
  discount: 'discount_percent DESC',
  relevance: 'is_featured DESC, is_trending DESC, created_at DESC'
};

// GET /api/products?search=&category=&minPrice=&maxPrice=&minRating=&brand=&sort=&page=&limit=
router.get('/', async (req, res) => {
  const {
    search, category, minPrice, maxPrice, minRating, brand,
    sort = 'relevance', page = 1, limit = 20
  } = req.query;

  const conditions = [];
  const params = [];

  if (search) {
    params.push(search);
    conditions.push(`(to_tsvector('english', p.name) @@ plainto_tsquery('english', $${params.length})
                       OR p.name ILIKE '%' || $${params.length} || '%'
                       OR p.brand ILIKE '%' || $${params.length} || '%')`);
  }
  if (category) {
    params.push(category);
    conditions.push(`c.slug = $${params.length}`);
  }
  if (brand) {
    params.push(brand);
    conditions.push(`p.brand = $${params.length}`);
  }
  if (minPrice) {
    params.push(minPrice);
    conditions.push(`p.price >= $${params.length}`);
  }
  if (maxPrice) {
    params.push(maxPrice);
    conditions.push(`p.price <= $${params.length}`);
  }
  if (minRating) {
    params.push(minRating);
    conditions.push(`p.rating >= $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderClause = SORT_MAP[sort] || SORT_MAP.relevance;
  const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

  params.push(Number(limit));
  const limitParam = params.length;
  params.push(offset);
  const offsetParam = params.length;

  try {
    const result = await db.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${whereClause}
       ORDER BY ${orderClause}
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON c.id = p.category_id ${whereClause}`,
      params.slice(0, params.length - 2) // reuse filter params, drop limit/offset
    );

    res.json({
      products: result.rows,
      total: Number(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// Curated sections for the homepage
router.get('/featured', async (req, res) => {
  const result = await db.query(`SELECT * FROM products WHERE is_featured = true LIMIT 8`);
  res.json(result.rows);
});
router.get('/trending', async (req, res) => {
  const result = await db.query(`SELECT * FROM products WHERE is_trending = true LIMIT 8`);
  res.json(result.rows);
});
router.get('/flash-deals', async (req, res) => {
  const result = await db.query(`SELECT * FROM products WHERE is_flash_deal = true LIMIT 8`);
  res.json(result.rows);
});

router.get('/:id', async (req, res) => {
  const result = await db.query(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1`,
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

  const product = result.rows[0];

  const related = await db.query(
    `SELECT id, name, price, original_price, discount_percent, rating, thumbnail
     FROM products WHERE category_id = $1 AND id != $2 LIMIT 6`,
    [product.category_id, product.id]
  );

  const reviews = await db.query(
    `SELECT r.rating, r.comment, r.created_at, u.name AS user_name
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.product_id = $1 ORDER BY r.created_at DESC LIMIT 20`,
    [product.id]
  );

  res.json({ ...product, related: related.rows, reviews: reviews.rows });
});

// --- Admin only: manage the catalog ---
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, description, brand, categoryId, price, originalPrice, stock, thumbnail, images } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'name and price are required' });

  const discountPercent = originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  const result = await db.query(
    `INSERT INTO products (name, description, brand, category_id, price, original_price, discount_percent, stock, thumbnail, images)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [name, description, brand, categoryId, price, originalPrice || price, discountPercent, stock || 0, thumbnail, JSON.stringify(images || [])]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { name, description, brand, price, originalPrice, stock, thumbnail } = req.body;
  const result = await db.query(
    `UPDATE products SET
       name = COALESCE($1, name), description = COALESCE($2, description),
       brand = COALESCE($3, brand), price = COALESCE($4, price),
       original_price = COALESCE($5, original_price), stock = COALESCE($6, stock),
       thumbnail = COALESCE($7, thumbnail), updated_at = now()
     WHERE id = $8 RETURNING *`,
    [name, description, brand, price, originalPrice, stock, thumbnail, req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
  res.json(result.rows[0]);
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);
  res.json({ status: 'deleted' });
});

module.exports = router;
