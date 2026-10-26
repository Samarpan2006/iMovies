const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Admin = require('../models/adminModel');
const {
  sendVerificationEmail,
  sendPasswordResetEmail
} = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'imovies_jwt_secret_2024_secure_key';

const generateToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

/**
 * Public User Registration with Email & OTP Verification:
 * Generates a 6-digit OTP and secure verification token.
 * Dispatches verification email via Brevo.
 * Account remains unverified (isVerified: false) until OTP or link is validated.
 */
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Username, email, and password are required.' });
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ success: false, message: 'Username must be between 3 and 20 characters.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.trim();

    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }]
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (existingUser) {
      // If user is already verified, reject duplicate
      if (existingUser.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email or username is already registered and verified. Please sign in.'
        });
      }

      // If user registered previously but never verified: update credentials and dispatch new OTP
      existingUser.username = cleanUsername;
      existingUser.password = hashedPassword;
      existingUser.verificationOtp = otp;
      existingUser.verificationToken = verificationToken;
      existingUser.verificationOtpExpires = otpExpiry;
      existingUser.isVerified = false;
      await existingUser.save();

      try {
        await sendVerificationEmail(cleanEmail, {
          username: cleanUsername,
          verificationToken,
          otp,
          expiresIn: '15 minutes'
        });
      } catch (mailErr) {
        console.warn('[registerUser] Brevo verification email dispatch failed:', mailErr.message);
      }

      return res.status(200).json({
        success: true,
        requireVerification: true,
        email: cleanEmail,
        message: 'A fresh 6-digit verification code has been sent to your email. Enter it below to activate your account.'
      });
    }

    // New unverified user creation
    const newUser = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      role: 'user',
      isVerified: false,
      verificationOtp: otp,
      verificationToken,
      verificationOtpExpires: otpExpiry
    });

    try {
      await sendVerificationEmail(cleanEmail, {
        username: newUser.username,
        verificationToken,
        otp,
        expiresIn: '15 minutes'
      });
    } catch (mailErr) {
      console.warn('[registerUser] Brevo verification email dispatch failed:', mailErr.message);
    }

    return res.status(201).json({
      success: true,
      requireVerification: true,
      email: cleanEmail,
      message: 'Account registration initiated! Please enter the 6-digit verification code sent to your email.'
    });
  } catch (err) {
    console.error('[registerUser] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Registration failed.', error: err.message });
  }
};

/**
 * Verify Email via 6-Digit OTP Window
 */
exports.verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email address and 6-digit OTP code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found. Please sign up first.' });
    }

    if (user.isVerified) {
      const token = generateToken({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        isAdmin: user.role === 'admin'
      });
      return res.json({
        success: true,
        message: 'Account is already verified. Signing you in...',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role || 'user',
          isAdmin: user.role === 'admin'
        }
      });
    }

    if (!user.verificationOtp || user.verificationOtp !== cleanOtp) {
      return res.status(400).json({ success: false, message: 'Invalid verification code. Please check your email or click Resend.' });
    }

    if (user.verificationOtpExpires && user.verificationOtpExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please click Resend Code.' });
    }

    // Mark as verified & clear OTP
    user.isVerified = true;
    user.verificationOtp = null;
    user.verificationToken = null;
    user.verificationOtpExpires = null;
    await user.save();

    const token = generateToken({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role || 'user',
      isAdmin: user.role === 'admin'
    });

    return res.json({
      success: true,
      message: 'Email verified successfully! Welcome to iMovies.',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        isAdmin: user.role === 'admin'
      }
    });
  } catch (err) {
    console.error('[verifyEmailOtp] Error:', err.message);
    return res.status(500).json({ success: false, message: 'OTP verification failed.', error: err.message });
  }
};

/**
 * Verify Email via 1-Click Verification Link
 */
exports.verifyEmailToken = async (req, res) => {
  try {
    const tokenParam = req.params.token || req.query.token || req.body.token;
    if (!tokenParam) {
      return res.status(400).json({ success: false, message: 'Verification token is required.' });
    }

    const user = await User.findOne({ verificationToken: tokenParam });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or already used verification link.' });
    }

    if (user.verificationOtpExpires && user.verificationOtpExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Verification link has expired. Please request a new code.' });
    }

    user.isVerified = true;
    user.verificationOtp = null;
    user.verificationToken = null;
    user.verificationOtpExpires = null;
    await user.save();

    const token = generateToken({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role || 'user',
      isAdmin: user.role === 'admin'
    });

    return res.json({
      success: true,
      message: 'Email verified successfully! You can now access your account.',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        isAdmin: user.role === 'admin'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Email token verification failed.', error: err.message });
  }
};

/**
 * Resend Verification Code
 */
exports.resendVerificationOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No registered account found with this email.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Your account is already verified. Please sign in.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationOtp = otp;
    user.verificationToken = verificationToken;
    user.verificationOtpExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await sendVerificationEmail(cleanEmail, {
      username: user.username,
      verificationToken,
      otp,
      expiresIn: '15 minutes'
    });

    return res.json({
      success: true,
      message: 'A fresh 6-digit verification code has been dispatched to your email.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to resend code.', error: err.message });
  }
};

/**
 * User Login:
 * Strictly checks isVerified status.
 * If user has not verified their email, login is rejected and fresh verification code is issued.
 */
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      // Fallback: Check Admin collection for unified seamless authentication
      const admin = await Admin.findOne({ email: cleanEmail });
      if (admin) {
        const isAdminMatch = await bcrypt.compare(password, admin.password);
        if (!isAdminMatch) {
          return res.status(400).json({ success: false, message: 'Invalid credentials.' });
        }
        const token = generateToken({
          id: admin._id,
          username: admin.username,
          email: admin.email,
          role: 'admin',
          isAdmin: true
        });
        return res.json({
          success: true,
          message: 'Login successful.',
          token,
          user: {
            id: admin._id,
            username: admin.username,
            email: admin.email,
            role: 'admin',
            isAdmin: true
          }
        });
      }
      return res.status(400).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials.' });
    }

    // Authentication Guard: Check if email is verified
    // If user.isVerified is explicitly false, reject and trigger new OTP
    if (user.isVerified === false) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationToken = crypto.randomBytes(32).toString('hex');
      user.verificationOtp = otp;
      user.verificationToken = verificationToken;
      user.verificationOtpExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();

      try {
        await sendVerificationEmail(cleanEmail, {
          username: user.username,
          verificationToken,
          otp,
          expiresIn: '15 minutes'
        });
      } catch (_) {}

      return res.status(403).json({
        success: false,
        requireVerification: true,
        email: cleanEmail,
        message: 'Your email address is not verified yet. A fresh verification code has been sent to your email.'
      });
    }

    const isAdminRole = user.role === 'admin';
    const token = generateToken({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role || 'user',
      isAdmin: isAdminRole
    });

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        isAdmin: isAdminRole
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Login failed.', error: err.message });
  }
};

/**
 * Forgot Password - Generates Reset OTP & Recovery Link
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide your registered email address.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      // Security: Do not reveal non-existence
      return res.json({
        success: true,
        message: 'If an account exists with this email address, a password recovery code has been sent.'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordOtp = otp;
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    try {
      await sendPasswordResetEmail(cleanEmail, {
        username: user.username,
        resetToken,
        otp,
        expiresIn: '15 minutes'
      });
    } catch (mailErr) {
      console.warn('[forgotPassword] Brevo email dispatch error:', mailErr.message);
    }

    return res.json({
      success: true,
      email: cleanEmail,
      message: 'Password recovery code and reset link sent to your email.'
    });
  } catch (err) {
    console.error('[forgotPassword] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Password recovery failed.', error: err.message });
  }
};

/**
 * Reset Password - Verifies OTP/Token & Sets New Password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, token, newPassword } = req.body;
    if (!email || (!otp && !token) || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, verification code (or reset token), and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp ? String(otp).trim() : null;

    const query = { email: cleanEmail };
    if (cleanOtp) {
      query.resetPasswordOtp = cleanOtp;
    } else if (token) {
      query.resetPasswordToken = token;
    }

    const user = await User.findOne(query);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid password recovery code or reset token.' });
    }

    if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Password recovery code has expired. Please request a new code.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordOtp = null;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    // Also mark verified if recovering password
    user.isVerified = true;
    await user.save();

    return res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (err) {
    console.error('[resetPassword] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to reset password.', error: err.message });
  }
};

/**
 * Protected Admin Creation:
 * Accessible ONLY by an authenticated super-admin through protected admin routes.
 */
exports.createAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All admin fields required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingAdmin = await Admin.findOne({ $or: [{ email: cleanEmail }, { username: username.trim() }] });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Admin username or email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = await Admin.create({
      username: username.trim(),
      email: cleanEmail,
      password: hashedPassword
    });

    // Also record in User collection with role: 'admin' and isVerified: true for unified auth
    await User.findOneAndUpdate(
      { email: cleanEmail },
      { username: username.trim(), email: cleanEmail, password: hashedPassword, role: 'admin', isVerified: true },
      { upsert: true, new: true }
    );

    const token = generateToken({
      id: newAdmin._id,
      username: newAdmin.username,
      email: newAdmin.email,
      role: 'admin',
      isAdmin: true
    });

    return res.status(201).json({
      success: true,
      message: 'Admin account created successfully.',
      token,
      admin: {
        id: newAdmin._id,
        username: newAdmin.username,
        email: newAdmin.email,
        role: 'admin',
        isAdmin: true
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Admin creation failed.', error: err.message });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(400).json({ success: false, message: 'Invalid admin credentials.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid admin credentials.' });
    }

    const token = generateToken({
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: 'admin',
      isAdmin: true
    });

    return res.json({
      success: true,
      message: 'Admin login successful.',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: 'admin',
        isAdmin: true
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Admin login failed.', error: err.message });
  }
};

exports.validateToken = async (req, res) => {
  try {
    const adminRecord = await Admin.findById(req.user.id);
    const userRecord = !adminRecord ? await User.findById(req.user.id) : null;
    const isDbAdmin = Boolean(adminRecord || userRecord?.role === 'admin');

    return res.json({
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: isDbAdmin ? 'admin' : (userRecord?.role || 'user'),
        isAdmin: isDbAdmin
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Token validation error.', error: err.message });
  }
};

exports.validateAdmin = async (req, res) => {
  try {
    return res.json({
      success: true,
      isAdmin: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: 'admin',
        isAdmin: true
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Admin validation error.', error: err.message });
  }
};

exports.logout = async (req, res) => {
  return res.json({ success: true, message: 'Logged out successfully.' });
};
