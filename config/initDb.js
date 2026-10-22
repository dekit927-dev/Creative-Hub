const fs = require('fs');
const path = require('path');
const { db } = require('./db');

async function syncUploadsToDb() {
  try {
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) return;

    // Sync any users whose file exists on disk but profile_picture_data is missing
    const usersWithoutData = await db.any(
      'SELECT id, profile_picture FROM users WHERE profile_picture IS NOT NULL AND profile_picture_data IS NULL'
    );

    for (const u of usersWithoutData) {
      const filename = path.basename(u.profile_picture);
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) {
        try {
          const buf = fs.readFileSync(filePath);
          const ext = path.extname(filename).toLowerCase();
          const mime = ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : (ext === '.svg' ? 'image/svg+xml' : 'image/jpeg'));
          const dataUri = `data:${mime};base64,${buf.toString('base64')}`;
          await db.none('UPDATE users SET profile_picture_data = $1 WHERE id = $2', [dataUri, u.id]);
          console.log(`[Backup] Synced profile picture to DB for user #${u.id} (${filename})`);
        } catch (e) {
          // ignore read error
        }
      }
    }

    // Sync creations
    const creationsWithoutData = await db.any(
      'SELECT id, image FROM creations WHERE image IS NOT NULL AND image_data IS NULL'
    );
    for (const c of creationsWithoutData) {
      const filename = path.basename(c.image);
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) {
        try {
          const buf = fs.readFileSync(filePath);
          if (buf.length <= 15 * 1024 * 1024) {
            const ext = path.extname(filename).toLowerCase();
            const mime = ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : (ext === '.svg' ? 'image/svg+xml' : 'image/jpeg'));
            const dataUri = `data:${mime};base64,${buf.toString('base64')}`;
            await db.none('UPDATE creations SET image_data = $1 WHERE id = $2', [dataUri, c.id]);
          }
        } catch (e) {
          // ignore
        }
      }
    }
  } catch (err) {
    console.warn('[Backup] Sync error:', err.message);
  }
}

async function initDb() {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, '../models/schema.sql'), 'utf-8');
    await db.none(schemaSql);
    console.log('PostgreSQL database tables initialized successfully.');
    await syncUploadsToDb();
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
