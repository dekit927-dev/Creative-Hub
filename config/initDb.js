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
    // Sync collaboration request attachments
    const requestsWithoutData = await db.any(
      'SELECT id, attachment_file FROM collaboration_requests WHERE attachment_file IS NOT NULL AND attachment_data IS NULL'
    );
    for (const r of requestsWithoutData) {
      const filename = path.basename(r.attachment_file);
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) {
        try {
          const buf = fs.readFileSync(filePath);
          if (buf.length <= 25 * 1024 * 1024) {
            const ext = path.extname(filename).toLowerCase();
            let mime = 'application/octet-stream';
            if (['.jpg', '.jpeg'].includes(ext)) mime = 'image/jpeg';
            else if (ext === '.png') mime = 'image/png';
            else if (ext === '.webp') mime = 'image/webp';
            else if (ext === '.mp3') mime = 'audio/mpeg';
            else if (ext === '.wav') mime = 'audio/wav';
            else if (ext === '.ogg') mime = 'audio/ogg';
            else if (ext === '.pdf') mime = 'application/pdf';
            else if (ext === '.txt') mime = 'text/plain';
            const dataUri = `data:${mime};base64,${buf.toString('base64')}`;
            await db.none('UPDATE collaboration_requests SET attachment_data = $1 WHERE id = $2', [dataUri, r.id]);
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

async function ensureMigrations() {
  try {
    await db.none(`
      -- Collaborations table migrations
      ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS skills VARCHAR(255) DEFAULT '';
      ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS roles VARCHAR(255) DEFAULT '';
      ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS short_summary TEXT DEFAULT '';
      ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Other';
      ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS positions VARCHAR(50) DEFAULT '1-2';
      ALTER TABLE collaborations ALTER COLUMN positions TYPE VARCHAR(50) USING positions::VARCHAR;
      ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS experience TEXT DEFAULT '';
      ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS participation_type VARCHAR(50) DEFAULT 'Individual';
      ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS location VARCHAR(200) DEFAULT '';
      ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS mode VARCHAR(50) DEFAULT 'Remote';
      ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE DEFAULT NULL;
      ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS duration VARCHAR(100) DEFAULT '';
      ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS deliverables TEXT DEFAULT '';
      ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS tools VARCHAR(255) DEFAULT '';
      ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS compensation VARCHAR(100) DEFAULT 'Volunteer';
      ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS application_instructions TEXT DEFAULT '';
      ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Open';

      -- Collaboration requests attachment migrations
      ALTER TABLE collaboration_requests ADD COLUMN IF NOT EXISTS attachment_file VARCHAR(255) DEFAULT NULL;
      ALTER TABLE collaboration_requests ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255) DEFAULT NULL;
      ALTER TABLE collaboration_requests ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50) DEFAULT NULL;
      ALTER TABLE collaboration_requests ADD COLUMN IF NOT EXISTS attachment_data TEXT DEFAULT NULL;

      -- Users table migrations
      ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_data TEXT DEFAULT NULL;
      ALTER TABLE users ALTER COLUMN profile_picture TYPE TEXT;

      -- Creations table migrations
      ALTER TABLE creations ADD COLUMN IF NOT EXISTS image_data TEXT DEFAULT NULL;
      ALTER TABLE creations ALTER COLUMN image TYPE TEXT;
      ALTER TABLE creations ALTER COLUMN image DROP NOT NULL;
      ALTER TABLE creations ADD COLUMN IF NOT EXISTS link_url TEXT DEFAULT NULL;
      ALTER TABLE creations ADD COLUMN IF NOT EXISTS media_type VARCHAR(50) DEFAULT 'image';
      ALTER TABLE creations ADD COLUMN IF NOT EXISTS file_name VARCHAR(255) DEFAULT NULL;
      ALTER TABLE creations ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT NULL;
    `);
    console.log('Database schema migrations verified successfully.');
  } catch (err) {
    console.warn('Migration warning:', err.message);
  }
}

async function initDb() {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, '../models/schema.sql'), 'utf-8');
    await db.none(schemaSql);
    console.log('PostgreSQL database tables initialized successfully.');
    await ensureMigrations();
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
