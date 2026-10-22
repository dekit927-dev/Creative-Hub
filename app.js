const express = require('express');
const http = require('http');
const path = require('path');
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

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
