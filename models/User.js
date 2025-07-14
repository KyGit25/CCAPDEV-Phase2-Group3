const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'technician'],
    required: true
  },
  profilePic: {
    type: String,
    default: '/public/assets/default-profile.png'
  },
  description: {
    type: String
  },
  anonymous: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
