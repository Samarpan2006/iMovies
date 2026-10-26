require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
const { releaseExpiredLocks } = require('./utils/cleanupService');
const { sendShowReminders } = require('./utils/reminderService');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'https://i-movies-swart.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

app.set('io', io);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// REST API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/movie', require('./routes/movieRoutes'));
app.use('/api/theatre', require('./routes/theatreRoutes'));
app.use('/api/shows', require('./routes/showRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/tickets', require('./routes/bookingRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/favorite', require('./routes/favoriteRoutes'));
app.use('/api/review', require('./routes/reviewRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/email', require('./routes/emailRoutes'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'iMovies API Server',
    time: new Date().toISOString()
  });
});

// Socket.io Real-time seat updates
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.on('join-show', (showId) => {
    socket.join(`show-${showId}`);
    console.log(`[Socket.io] ${socket.id} joined room show-${showId}`);
  });

  socket.on('seat-locked', (data) => {
    if (data && data.showId) {
      socket.to(`show-${data.showId}`).emit('seat-status-update', data);
    }
  });

  socket.on('seat-booked', (data) => {
    if (data && data.showId) {
      socket.to(`show-${data.showId}`).emit('seat-status-update', data);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Automated background cron jobs
cron.schedule('*/5 * * * *', () => {
  releaseExpiredLocks();
});

cron.schedule('0 9 * * *', () => {
  sendShowReminders();
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/imovies';

// Auto-sync default administrator credentials in any environment (Render / Vercel / Local)
const ensureDefaultAdmin = async () => {
  try {
    const Admin = require('./models/adminModel');
    const User = require('./models/userModel');
    const bcrypt = require('bcryptjs');

    const adminEmail = 'admin@imovies.com';
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await Admin.findOneAndUpdate(
      { email: adminEmail },
      { username: 'admin', email: adminEmail, password: hashedPassword },
      { upsert: true, returnDocument: 'after' }
    );

    await User.findOneAndUpdate(
      { email: adminEmail },
      { username: 'admin', email: adminEmail, password: hashedPassword, role: 'admin', isVerified: true },
      { upsert: true, returnDocument: 'after' }
    );

    console.log('🛡️ Default Admin successfully synchronized on server startup: admin@imovies.com / admin123');
  } catch (err) {
    console.error('Notice on admin startup sync:', err.message);
  }
};

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB successfully connected.');
    await ensureDefaultAdmin();
    server.listen(PORT, () => {
      console.log(`🎬 iMovies Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.log('Starting HTTP & WebSocket server in standalone/demo mode...');
    server.listen(PORT, () => {
      console.log(`🎬 iMovies Server listening on port ${PORT} (Standalone)`);
    });
  });

module.exports = { app, server, io };
