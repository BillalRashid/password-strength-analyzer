const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  passwordHistory: [{
    password: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Add error handling middleware
userSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('User already exists with this Google account'));
  } else {
    next(error);
  }
});

module.exports = mongoose.model('User', userSchema);
