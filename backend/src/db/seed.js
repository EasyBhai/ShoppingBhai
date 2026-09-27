require('dotenv').config();
const { pool } = require('./index');

// Simple colored placeholder "image" generated as an inline SVG data URI,
// so the storefront never depends on an external image URL that could 404 later.
function placeholder(label, bg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
    <rect width="400" height="400" fill="${bg}"/>
    <text x="50%" y="50%" font-family="sans-serif" font-size="22" fill="#ffffff"
      text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

const categories = [
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Mobiles', slug: 'mobiles' },
  { name: 'Laptops', slug: 'laptops' },
  { name: "Men's Fashion", slug: 'mens-fashion' },
  { name: "Women's Fashion", slug: 'womens-fashion' },
  { name: 'Shoes', slug: 'shoes' },
  { name: 'Home & Kitchen', slug: 'home-kitchen' },
  { name: 'Beauty', slug: 'beauty' },
  { name: 'Sports', slug: 'sports' },
  { name: 'Books', slug: 'books' }
];

const colors = ['#4f46e5', '#0891b2', '#c2410c', '#15803d', '#a21caf', '#334155'];

function makeProduct(name, brand, categorySlug, price, discountPercent, flags = {}) {
  const originalPrice = discountPercent > 0 ? Math.round(price / (1 - discountPercent / 100)) : price;
  const bg = colors[Math.floor(Math.random() * colors.length)];
  return {
    name, brand, categorySlug, price, originalPrice, discountPercent,
    rating: (3.5 + Math.random() * 1.5).toFixed(1),
    reviewCount: Math.floor(Math.random() * 2000) + 10,
    stock: Math.floor(Math.random() * 50) + 5,
    thumbnail: placeholder(name.slice(0, 18), bg),
    images: [placeholder(name.slice(0, 18), bg), placeholder(name.slice(0, 18), bg)],
    ...flags
  };
}

const productSeeds = [
  makeProduct('UltraView 55" 4K Smart TV', 'Voltek', 'electronics', 42999, 28, { is_featured: true, is_flash_deal: true }),
  makeProduct('Pulse Wireless Earbuds Pro', 'Aeronix', 'electronics', 2499, 35, { is_trending: true }),
  makeProduct('Nimbus 128GB Smartphone', 'Orbit', 'mobiles', 15999, 20, { is_featured: true, is_flash_deal: true }),
  makeProduct('Fusion 5G Smartphone', 'Orbit', 'mobiles', 24999, 15, { is_trending: true }),
  makeProduct('SwiftBook 14" Laptop, 16GB RAM', 'Corelia', 'laptops', 54999, 18, { is_featured: true }),
  makeProduct('EdgeBook Pro 16"', 'Corelia', 'laptops', 89999, 10, { is_trending: true }),
  makeProduct("Men's Slim Fit Cotton Shirt", 'Urban Thread', 'mens-fashion', 799, 40, { is_flash_deal: true }),
  makeProduct("Men's Denim Jacket", 'Urban Thread', 'mens-fashion', 1899, 25),
  makeProduct("Women's Floral Summer Dress", 'Aria', 'womens-fashion', 1299, 30, { is_trending: true }),
  makeProduct("Women's Formal Blazer", 'Aria', 'womens-fashion', 2299, 20),
  makeProduct('CloudStep Running Shoes', 'Veloz', 'shoes', 1999, 33, { is_flash_deal: true, is_featured: true }),
  makeProduct('Classic Leather Loafers', 'Veloz', 'shoes', 2799, 15),
  makeProduct('7-in-1 Multi Cooker', 'HomeCraft', 'home-kitchen', 3499, 22, { is_trending: true }),
  makeProduct('Non-Stick Cookware Set (5pc)', 'HomeCraft', 'home-kitchen', 2199, 18),
  makeProduct('Vitamin C Glow Serum', 'PureGlow', 'beauty', 499, 10),
  makeProduct('Matte Lipstick Combo (3pc)', 'PureGlow', 'beauty', 699, 25, { is_flash_deal: true }),
  makeProduct('Pro Yoga Mat with Strap', 'FitCore', 'sports', 899, 12),
  makeProduct('Adjustable Dumbbell Set 20kg', 'FitCore', 'sports', 3299, 15, { is_trending: true }),
  makeProduct('The Silent Orbit (Novel)', 'Penstone Press', 'books', 349, 0),
  makeProduct('Atomic Habits for Beginners', 'Penstone Press', 'books', 299, 20, { is_featured: true })
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const categoryIds = {};
    for (const cat of categories) {
      const result = await client.query(
        `INSERT INTO categories (name, slug) VALUES ($1, $2)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, slug`,
        [cat.name, cat.slug]
      );
      categoryIds[result.rows[0].slug] = result.rows[0].id;
    }

    for (const p of productSeeds) {
      await client.query(
        `INSERT INTO products
         (name, brand, category_id, price, original_price, discount_percent, rating, review_count,
          stock, thumbnail, images, is_featured, is_trending, is_flash_deal, description, specifications)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          p.name, p.brand, categoryIds[p.categorySlug], p.price, p.originalPrice, p.discountPercent,
          p.rating, p.reviewCount, p.stock, p.thumbnail, JSON.stringify(p.images),
          !!p.is_featured, !!p.is_trending, !!p.is_flash_deal,
          `${p.name} by ${p.brand}. Quality guaranteed, ready to ship.`,
          JSON.stringify({ Brand: p.brand, Warranty: '1 year' })
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded ${categories.length} categories and ${productSeeds.length} products.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
