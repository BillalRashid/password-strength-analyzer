require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const axios = require('axios');
const User = require('./models/User');

const app = express();

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// CORS configuration
const allowedOrigins = ['https://password-strength-analyzer-frontend.vercel.app', 'https://www.passwordstrengthanalyser.com', 'http://localhost:3000'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Handle preflight requests
app.options('*', cors());

// Basic middleware
app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// MongoDB connection with retry logic
const connectWithRetry = async () => {
  try {
    console.log('Attempting MongoDB connection...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Successfully connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    console.log('Retrying in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

// Token verification middleware
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Google OAuth token endpoint
app.post('/auth/google/token', async (req, res) => {
  try {
    const { access_token, user_info } = req.body;

    if (!access_token || !user_info) {
      return res.status(400).json({ error: 'Missing required information' });
    }

    console.log('Received Google token:', { access_token: '***', user_info });

    // Find or create user
    let user = await User.findOne({ googleId: user_info.sub });
    if (!user) {
      console.log('Creating new user for Google ID:', user_info.sub);
      user = await User.create({
        googleId: user_info.sub,
        email: user_info.email,
        name: user_info.name
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        name: user.name
      },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '24h' }
    );

    res.json({ token, user });
  } catch (error) {
    console.error('Google token handling error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Token verification endpoint
app.get('/auth/verify', verifyToken, (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Password Strength Analyzer API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Password analysis endpoint
app.post('/analyze-password', verifyToken, async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Basic password strength criteria
    const criteria = {
      length: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    // Calculate score (0-4)
    let score = Object.values(criteria).filter(Boolean).length - 1;
    score = Math.max(0, Math.min(4, score)); // Ensure score is between 0-4

    // Generate feedback
    const feedback = {
      warning: '',
      suggestions: []
    };

    if (!criteria.length) {
      feedback.warning = 'Password is too short';
      feedback.suggestions.push('Use at least 8 characters');
    }
    if (!criteria.hasUpperCase) {
      feedback.suggestions.push('Add uppercase letters');
    }
    if (!criteria.hasLowerCase) {
      feedback.suggestions.push('Add lowercase letters');
    }
    if (!criteria.hasNumbers) {
      feedback.suggestions.push('Add numbers');
    }
    if (!criteria.hasSpecialChar) {
      feedback.suggestions.push('Add special characters');
    }

    // Common patterns to check
    const commonPatterns = [
      /^123/, /password/i, /qwerty/i, /abc/i,
      /admin/i, /letmein/i, /welcome/i
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      score = Math.max(0, score - 1);
      feedback.warning = 'Password contains common patterns';
      feedback.suggestions.push('Avoid common words and patterns');
    }

    // Save password history for the user
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        passwordHistory: {
          password: password,
          createdAt: new Date()
        }
      }
    });

    res.json({
      score,
      feedback,
      criteria
    });
  } catch (error) {
    console.error('Password analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze password' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    message: 'Password Strength Analyzer Backend is running',
    timestamp: new Date().toISOString(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    env: {
      nodeEnv: process.env.NODE_ENV,
      mongoDbUri: !!process.env.MONGODB_URI,
      jwtSecret: !!process.env.JWT_SECRET
    }
  };
  
  console.log('Health check:', health);
  res.status(200).json(health);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    status: 'error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5004;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment:', {
    nodeEnv: process.env.NODE_ENV,
    port: PORT,
    mongoDbConnected: mongoose.connection.readyState === 1
  });
});
