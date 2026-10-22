const pgp = require('pg-promise')({
  // Initialization options
  capSQL: true,
  error(err, e) {
    if (e.cn) {
      console.error('Database connection error:', err.message || err);
    }
  }
});
require('dotenv').config();

const isSsl = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';

const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'creative_hub_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'dekitshomo',
  ...(isSsl ? { ssl: { rejectUnauthorized: false } } : {})
};

// Also support full DATABASE_URL if provided
const connection = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ...(isSsl ? { ssl: { rejectUnauthorized: false } } : {}) }
  : connectionConfig;

const db = pgp(connection);

module.exports = { db, pgp };
