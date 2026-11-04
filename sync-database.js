/**
 * CreativeHub Database Sync Utility
 * Transfers users, creations, challenges, and community records
 * from your source database (local or backup) to your new Render PostgreSQL database.
 * 
 * Usage:
 *   node sync-database.js "<RENDER_EXTERNAL_DATABASE_URL>"
 */

const pgp = require('pg-promise')({ capSQL: true });
require('dotenv').config();

const targetUrl = process.argv[2] || process.env.TARGET_DATABASE_URL;

if (!targetUrl) {
  console.error('\n======================================================');
  console.error('ERROR: Please provide your Render External Database URL!');
  console.error('Usage:');
  console.error('  node sync-database.js "<RENDER_EXTERNAL_DATABASE_URL>"');
  console.error('\nWhere to find it:');
  console.error('  1. Open dashboard.render.com -> Click your PostgreSQL database (creative-hub-db)');
  console.error('  2. Scroll to "External Database URL" and copy it');
  console.error('======================================================\n');
  process.exit(1);
}

const sourceConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'creative_hub_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'dekitshomo'
};

const sourceDb = pgp(sourceConfig);

// Render external connections require SSL
let cleanTarget = targetUrl.replace(/[?&]sslmode=[^&]+/g, '');
const targetDb = pgp({
  connectionString: cleanTarget,
  ssl: { rejectUnauthorized: false }
});

async function syncTable(tableName, pkey = 'id') {
  try {
    const sourceRows = await sourceDb.any(`SELECT * FROM ${tableName} ORDER BY ${pkey} ASC`);
    if (!sourceRows || sourceRows.length === 0) {
      console.log(`[Sync] Table "${tableName}": 0 rows to copy.`);
      return;
    }

    console.log(`[Sync] Table "${tableName}": Found ${sourceRows.length} rows in source. Syncing...`);
    
    // Get column names from first row
    const cols = Object.keys(sourceRows[0]);
    const colList = cols.join(', ');
    const valPlaceholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const updateClauses = cols.filter(c => c !== pkey).map(c => `${c} = EXCLUDED.${c}`).join(', ');

    let inserted = 0;
    for (const row of sourceRows) {
      const values = cols.map(c => row[c]);
      const conflictSql = updateClauses 
        ? `ON CONFLICT (${pkey}) DO UPDATE SET ${updateClauses}`
        : `ON CONFLICT (${pkey}) DO NOTHING`;

      const insertSql = `
        INSERT INTO ${tableName} (${colList})
        VALUES (${valPlaceholders})
        ${conflictSql}
      `;

      await targetDb.none(insertSql, values);
      inserted++;
    }

    // Reset sequence if table has a serial id
    try {
      await targetDb.none(`SELECT setval(pg_get_serial_sequence('${tableName}', '${pkey}'), COALESCE((SELECT MAX(${pkey}) FROM ${tableName}), 1), true)`);
    } catch (seqErr) {
      // ignore sequence reset for tables without auto-increment
    }

    console.log(`[Sync] Table "${tableName}": Successfully synced ${inserted} rows.`);
  } catch (err) {
    console.warn(`[Sync Warning] Failed to sync table "${tableName}":`, err.message);
  }
}

async function runSync() {
  console.log('\n======================================================');
  console.log('CREATIVEHUB DATABASE SYNC TO RENDER');
  console.log('======================================================');

  try {
    // 1. Verify connections
    console.log('[1/4] Connecting to source database...');
    const srcTest = await sourceDb.one('SELECT count(*) FROM users');
    console.log(`✓ Connected to source database. Found ${srcTest.count} users.`);

    console.log('[2/4] Connecting to Render PostgreSQL database...');
    await targetDb.connect();
    console.log('✓ Connected to Render PostgreSQL database.');

    // 2. Sync core tables in order of foreign key relationships
    console.log('\n[3/4] Syncing user and community records...');
    await syncTable('users', 'id');
    await syncTable('categories', 'id');
    await syncTable('creations', 'id');
    await syncTable('likes', 'id');
    await syncTable('comments', 'id');
    await syncTable('challenges', 'id');
    await syncTable('challenge_participants', 'id');
    await syncTable('collaborations', 'id');
    await syncTable('collaboration_requests', 'id');
    await syncTable('follows', 'id');
    await syncTable('messages', 'id');
    await syncTable('notifications', 'id');

    console.log('\n[4/4] Verifying target database...');
    const targetCount = await targetDb.one('SELECT count(*) FROM users');
    console.log(`\n🎉 SYNC COMPLETED SUCCESSFULLY!`);
    console.log(`Your Render PostgreSQL database now has ${targetCount.count} users!`);
    console.log('Refresh your live app URL to see all your signed-in users.');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n[Sync Failed]:', err.message);
    process.exit(1);
  }
}

runSync();

