const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const session = require('express-session');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

dotenv.config();

const { initDb } = require('./config/initDb');
const { seedDatabase } = require('./config/seed');
const { errorHandler } = require('./middleware/errorMiddleware');
const MessageController = require('./controllers/messageController');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Configure Socket.IO for real-time private messaging
MessageController.setSocketIO(io);

io.on('connection', (socket) => {
  socket.on('join_user', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
    }
  });

  socket.on('disconnect', () => {
    // Client disconnected
  });
});

const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// CORS & Body parsing
app.use(cors());

// Global anti-cache headers so browsers never serve stale HTML, views, or scripts
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));
const VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.mkv', '.ogv', '.avi'];
const AUDIO_EXTS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];

function getMediaMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.mp4' || ext === '.mov') return 'video/mp4';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.ogv') return 'video/ogg';
  if (ext === '.mkv') return 'video/x-matroska';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.ogg') return 'audio/ogg';
  if (ext === '.m4a') return 'audio/mp4';
  if (ext === '.aac') return 'audio/aac';
  if (ext === '.flac') return 'audio/flac';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.doc') return 'application/msword';
  if (ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === '.txt') return 'text/plain';
  if (ext === '.rtf') return 'application/rtf';
  if (ext === '.odt') return 'application/vnd.oasis.opendocument.text';
  if (ext === '.ppt') return 'application/vnd.ms-powerpoint';
  if (ext === '.pptx') return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (ext === '.xls') return 'application/vnd.ms-excel';
  if (ext === '.xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (ext === '.zip') return 'application/zip';
  if (ext === '.csv') return 'text/csv';
  return null;
}

function streamFileWithRange(req, res, filePath, mimeType) {
  try {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader('Accept-Ranges', 'bytes');
    if (mimeType) {
      res.setHeader('Content-Type', mimeType);
    }

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType || 'video/mp4'
      });
      return file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType || 'video/mp4',
        'Accept-Ranges': 'bytes'
      });
      return fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).send('Error streaming media');
    }
  }
}

// Self-healing & streaming /uploads route:
// 1. Streams videos/audio with HTTP 206 Range requests for scrubbing, seeking, and cross-browser playback.
// 2. If wiped from ephemeral container disk after restart, restores the user's exact uploaded file from PostgreSQL image_data / profile_picture_data.
app.get('/uploads/:filename', async (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(__dirname, 'public/uploads', filename);
    const ext = path.extname(filename).toLowerCase();
    const isVideo = VIDEO_EXTS.includes(ext);
    const isAudio = AUDIO_EXTS.includes(ext);
    const mediaMime = getMediaMimeType(filename);

    // Case 1: File already exists on disk
    if (fs.existsSync(filePath)) {
      if (isVideo || isAudio) {
        return streamFileWithRange(req, res, filePath, mediaMime);
      }
      if (mediaMime) {
        res.type(mediaMime);
      }
      return res.sendFile(filePath);
    }

    // Case 2: File wiped from disk after restart - query PostgreSQL for persistent backup
    const { db } = require('./config/db');

    // 1. Try finding in users profile_picture
    const userRow = await db.oneOrNone(
      'SELECT profile_picture_data FROM users WHERE profile_picture = $1',
      [filename]
    );

    let dataUri = userRow ? userRow.profile_picture_data : null;

    // 2. Try finding in creations image
    let creationRow = null;
    if (!dataUri) {
      creationRow = await db.oneOrNone(
        'SELECT id, category, image_data FROM creations WHERE image = $1',
        [filename]
      );
      dataUri = creationRow ? creationRow.image_data : null;
    }

    // 3. Try finding in collaboration_requests attachment
    if (!dataUri) {
      const reqRow = await db.oneOrNone(
        'SELECT attachment_data FROM collaboration_requests WHERE attachment_file = $1',
        [filename]
      );
      dataUri = reqRow ? reqRow.attachment_data : null;
    }

    if (dataUri && dataUri.startsWith('data:')) {
      const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        try {
          fs.writeFileSync(filePath, buffer);
        } catch (e) {
          // ignore disk write errors
        }
        if (isVideo || isAudio) {
          return streamFileWithRange(req, res, filePath, mediaMime || contentType);
        }
        res.type(contentType);
        return res.sendFile(filePath);
      }
    }
  } catch (err) {
    console.warn(`[SelfHealing] Failed to restore /uploads/${req.params.filename}:`, err.message);
  }

  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Express Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'creativehub_sherubtse_secret_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true if using HTTPS
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  }
}));

// Make user available to views
app.use((req, res, next) => {
  res.locals.user = req.session && req.session.user ? req.session.user : null;
  next();
});

// Routes
const indexRoutes = require('./routes/index');
const apiRoutes = require('./routes/api');

app.use('/', indexRoutes);
app.use('/api', apiRoutes);

// Centralized error handling
app.use(errorHandler);

// Database initialization and server startup
async function startServer() {
  try {
    await initDb();
    await seedDatabase();
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n[ERROR] Port ${PORT} is already in use by another process.`);
        console.error(`To free port ${PORT} on Windows, run this in PowerShell:`);
        console.error(`  Get-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess | Stop-Process -Force\n`);
      } else {
        console.error('Server error:', err);
      }
      process.exit(1);
    });

    server.listen(PORT, () => {
      console.log(`CreativeHub running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start CreativeHub server:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
