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

const isNeon = Boolean(
  (process.env.DB_HOST && process.env.DB_HOST.includes('neon.tech')) ||
  (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech'))
);

const isSsl = process.env.DB_SSL === 'true' ||
  process.env.DB_SSL === '1' ||
  isNeon ||
  Boolean(process.env.RENDER) ||
  (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1')) ||
  (process.env.DB_HOST && !['localhost', '127.0.0.1'].includes(process.env.DB_HOST));

// Neon databases are named 'neondb' by default. If connecting to Neon and DB_NAME is missing or still set to the local default, use 'neondb'.
const requestedDbName = process.env.DB_NAME;
const resolvedDbName = (isNeon && (!requestedDbName || requestedDbName === 'creative_hub_db'))
  ? 'neondb'
  : (requestedDbName || 'creative_hub_db');

const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: resolvedDbName,
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
