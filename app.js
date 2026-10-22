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
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Self-healing /uploads route: if an uploaded image was wiped from ephemeral container disk after restart,
// dynamically restore it from PostgreSQL cloud database and re-write to disk so it never disappears!
app.get('/uploads/:filename', async (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(__dirname, 'public/uploads', filename);

    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }

    const { db } = require('./config/db');

    // 1. Try finding in users profile_picture
    const userRow = await db.oneOrNone(
      'SELECT profile_picture_data FROM users WHERE profile_picture = $1',
      [filename]
    );

    let dataUri = userRow ? userRow.profile_picture_data : null;

    // 2. Try finding in creations image
    if (!dataUri) {
      const creationRow = await db.oneOrNone(
        'SELECT image_data FROM creations WHERE image = $1',
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
        res.type(contentType);
        return res.send(buffer);
      }
    }
  } catch (err) {
    console.warn(`[SelfHealing] Failed to restore /uploads/${req.params.filename}:`, err.message);
  }

  next();
});

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
