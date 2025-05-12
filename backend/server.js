require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const axios = require('axios');
const User = require('./models/User');

const app = express();

// === Global Error Handlers ===
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));

// === CORS Setup ===
const allowedOrigins = [
  'https://passwordstrengthanalyser.com',
  'https://www.passwordstrengthanalyser.com',
  'http://localhost:3000'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// === Logging ===
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// === Body Parser ===
app.use(express.json());

// === Session Setup ===
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 86400000
  }
}));

// === MongoDB Connection ===
const connectWithRetry = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected ✅');
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    setTimeout(connectWithRetry, 5000);
  }
};
connectWithRetry();

// === JWT Middleware ===
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    next();
  } catch (error) {
    console.error('Token error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// === Google Auth ===
app.post('/auth/google/token', async (req, res) => {
  try {
    const { access_token, user_info } = req.body;
    if (!access_token || !user_info) {
      return res.status(400).json({ error: 'Missing token or user info' });
    }

    let user = await User.findOne({ googleId: user_info.sub });
    if (!user) {
      user = await User.create({
        googleId: user_info.sub,
        email: user_info.email,
        name: user_info.name
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user });
  } catch (error) {
    console.error('Google token error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// === Verify Token ===
app.get('/auth/verify', verifyToken, (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email
  });
});

// === Password Analysis ===
app.post('/analyze-password', verifyToken, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required' });

    const criteria = {
      length: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    let score = Object.values(criteria).filter(Boolean).length - 1;
    score = Math.max(0, Math.min(4, score));

    const feedback = {
      warning: '',
      suggestions: []
    };

    if (!criteria.length) feedback.suggestions.push('Use at least 8 characters');
    if (!criteria.hasUpperCase) feedback.suggestions.push('Add uppercase letters');
    if (!criteria.hasLowerCase) feedback.suggestions.push('Add lowercase letters');
    if (!criteria.hasNumbers) feedback.suggestions.push('Add numbers');
    if (!criteria.hasSpecialChar) feedback.suggestions.push('Add special characters');

    const commonPatterns = [/^123/, /password/i, /qwerty/i, /abc/i, /admin/i, /letmein/i];
    if (commonPatterns.some(p => p.test(password))) {
      score = Math.max(0, score - 1);
      feedback.warning = 'Avoid common patterns like "123" or "password"';
    }

    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        passwordHistory: {
          password,
          createdAt: new Date()
        }
      }
    });

    res.json({ score, feedback, criteria });
  } catch (error) {
    console.error('Password analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// === Health Check ===
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// === Root Route ===
app.get('/', (req, res) => {
  res.json({
    message: 'Password Strength Analyzer API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// === Global Error Handler ===
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// === Start Server ===
const PORT = process.env.PORT || 5004;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
