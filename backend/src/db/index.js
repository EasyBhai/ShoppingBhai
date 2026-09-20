const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_USE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => console.error('Unexpected PostgreSQL error', err));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
