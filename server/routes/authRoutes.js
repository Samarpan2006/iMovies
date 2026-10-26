const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  verifyEmailOtp,
  verifyEmailToken,
  resendVerificationOtp,
  forgotPassword,
  resetPassword,
  createAdmin,
  loginAdmin,
  bootstrapAdmin,
  validateToken,
  validateAdmin,
  logout
} = require('../controllers/authController');
const fetchUser = require('../middlewares/fetchUser');
const isAdmin = require('../middlewares/isAdmin');

// Public User Auth
router.post('/register', registerUser);
router.post('/login', loginUser);

// Email Verification (OTP & Direct Link)
router.post('/verify-otp', verifyEmailOtp);
router.post('/verify-email', verifyEmailToken);
router.get('/verify-email/:token', verifyEmailToken);
router.post('/resend-otp', resendVerificationOtp);

// Password Recovery
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Admin Auth
router.post('/admin/login', loginAdmin);
router.get('/admin/bootstrap', bootstrapAdmin);
router.post('/admin/bootstrap', bootstrapAdmin);
// Secure: Only authenticated admins can register new sub-admins
router.post('/admin/register', fetchUser, isAdmin, createAdmin);

// Server-side session verification routes
router.get('/validate', fetchUser, validateToken);
router.get('/validate-admin', fetchUser, isAdmin, validateAdmin);
router.post('/logout', logout);

module.exports = router;
