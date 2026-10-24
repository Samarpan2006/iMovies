const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, minlength: 3, maxlength: 20, unique: true, trim: true },
  email: { type: String, required: true, unique: true, maxlength: 50, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  // Email & OTP Authentication Fields
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String, default: null },
  verificationOtp: { type: String, default: null },
  verificationOtpExpires: { type: Date, default: null },
  // Password Reset Fields
  resetPasswordToken: { type: String, default: null },
  resetPasswordOtp: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
