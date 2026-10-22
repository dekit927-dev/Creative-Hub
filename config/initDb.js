const fs = require('fs');
const path = require('path');
const { db } = require('./db');

async function initDb() {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, '../models/schema.sql'), 'utf-8');
    await db.none(schemaSql);
    console.log('PostgreSQL database tables initialized successfully.');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
}

if (require.main === module) {
  initDb()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initDb };
