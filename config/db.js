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

function buildConnectionConfig() {
  let dbUrl = process.env.DATABASE_URL;
  // If user pasted a full postgresql:// URL into DB_HOST by accident
  if (!dbUrl && process.env.DB_HOST && (process.env.DB_HOST.startsWith('postgres://') || process.env.DB_HOST.startsWith('postgresql://'))) {
    dbUrl = process.env.DB_HOST;
  }

  const isNeon = Boolean(
    (process.env.DB_HOST && process.env.DB_HOST.includes('neon.tech')) ||
    (dbUrl && dbUrl.includes('neon.tech'))
  );

  const isSsl = process.env.DB_SSL === 'true' ||
    process.env.DB_SSL === '1' ||
    isNeon ||
    Boolean(process.env.RENDER) ||
    (dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) ||
    (process.env.DB_HOST && !['localhost', '127.0.0.1'].includes(process.env.DB_HOST));

  const sslConfig = isSsl ? { rejectUnauthorized: false } : false;

  if (dbUrl) {
    try {
      const u = new URL(dbUrl);
      const isNeonHost = u.hostname.includes('neon.tech');
      let database = u.pathname.replace(/^\//, '');
      if (!database || (isNeonHost && database === 'creative_hub_db')) {
        database = 'neondb';
      }
      return {
        host: u.hostname,
        port: parseInt(u.port || '5432', 10),
        database: database || 'creative_hub_db',
        user: decodeURIComponent(u.username || 'postgres'),
        password: decodeURIComponent(u.password || ''),
        ssl: sslConfig,
        connectionTimeoutMillis: 15000,
        query_timeout: 30000,
        max: 20
      };
    } catch (err) {
      console.warn('[DB] Could not parse DATABASE_URL with URL parser, using sanitized connectionString:', err.message);
      const cleanUrl = dbUrl.replace(/[?&]sslmode=[^&]+/g, '');
      return {
        connectionString: cleanUrl,
        ssl: sslConfig,
        connectionTimeoutMillis: 15000,
        query_timeout: 30000,
        max: 20
      };
    }
  }

  const requestedDbName = process.env.DB_NAME;
  const resolvedDbName = (isNeon && (!requestedDbName || requestedDbName === 'creative_hub_db'))
    ? 'neondb'
    : (requestedDbName || 'creative_hub_db');

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: resolvedDbName,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'dekitshomo',
    ssl: sslConfig,
    connectionTimeoutMillis: 15000,
    query_timeout: 30000,
    max: 20
  };
}

const connection = buildConnectionConfig();
const db = pgp(connection);

let isDbConnected = false;
let lastDbError = null;

async function checkConnection() {
  try {
    const obj = await db.connect();
    isDbConnected = true;
    lastDbError = null;
    obj.done();
    return { ok: true, host: connection.host || 'remote' };
  } catch (err) {
    isDbConnected = false;
    lastDbError = err.message || String(err);
    return { ok: false, error: lastDbError, host: connection.host || 'unknown' };
  }
}

function getDbState() {
  return {
    connected: isDbConnected,
    lastError: lastDbError,
    host: connection.host || 'database-server',
    database: connection.database || 'creative_hub_db',
    ssl: Boolean(connection.ssl)
  };
}

module.exports = { db, pgp, checkConnection, getDbState, connectionConfig: connection };
