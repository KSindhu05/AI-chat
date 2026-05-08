/**
 * AI Chat Application — Express Server Entry Point
 * 
 * Sets up Express with CORS, JSON parsing, and routes.
 * Connects to MongoDB via Mongoose.
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;

// Track database connection status globally
let dbConnected = false;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Database connectivity guard — returns 503 early if DB is down
app.use('/api/auth', (req, res, next) => {
  if (!dbConnected && mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database is temporarily unavailable. Please try again in a moment.',
    });
  }
  next();
}, authRoutes);
app.use('/api', chatRoutes);

// Health check — reports DB connection status
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: dbState === 1 ? 'ok' : 'degraded',
    database: dbStatus[dbState] || 'unknown',
    timestamp: new Date().toISOString(),
  });
});

// Connect to MongoDB with retry logic
async function connectDB(retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
      });
      dbConnected = true;
      console.log('✅ Connected to MongoDB');
      return true;
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${attempt}/${retries} failed:`, err.message);
      if (err.message.includes('bad auth') || err.message.includes('authentication failed')) {
        console.error('   ⚠️  Check your MONGODB_URI in .env — the username or password is incorrect.');
        break; // Don't retry auth failures
      }
      if (attempt < retries) {
        const delay = Math.min(3000 * attempt, 15000); // Exponential backoff capped at 15s
        console.log(`   ⏳ Retrying in ${delay / 1000} seconds...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  return false;
}

// Monitor connection state changes
mongoose.connection.on('connected', () => {
  dbConnected = true;
  console.log('✅ MongoDB reconnected');
});
mongoose.connection.on('disconnected', () => {
  dbConnected = false;
  console.log('⚠️  MongoDB disconnected');
});
mongoose.connection.on('error', (err) => {
  dbConnected = false;
  console.error('❌ MongoDB connection error:', err.message);
});

// Start server
connectDB().then((connected) => {
  app.listen(PORT, () => {
    if (connected) {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    } else {
      console.log(`⚠️  Server running WITHOUT database on http://localhost:${PORT}`);
      console.log(`   Registration and login will NOT work until the database is connected.`);
    }
  });
});
