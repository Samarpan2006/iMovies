const Admin = require('../models/adminModel');
const User = require('../models/userModel');

/**
 * Server-Side Role-Based Access Control (RBAC) Middleware
 * Resolves Issue 4 (Admin Page Bypass):
 * Verifies with the database that the authenticated user is an active administrator.
 * Never relies solely on client state or unverified token claims.
 */
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No valid session token provided.'
      });
    }

    // 1. Authoritative lookup in Admin collection
    const mongoose = require('mongoose');
    const isValidId = mongoose.Types.ObjectId.isValid(req.user.id);

    if (isValidId) {
      const adminRecord = await Admin.findById(req.user.id);
      if (adminRecord) {
        req.admin = adminRecord;
        req.user.isAdmin = true;
        req.user.role = 'admin';
        return next();
      }

      // 2. Authoritative lookup in User collection with explicit role === 'admin'
      const userRecord = await User.findOne({ _id: req.user.id, role: 'admin' });
      if (userRecord) {
        req.admin = userRecord;
        req.user.isAdmin = true;
        req.user.role = 'admin';
        return next();
      }
    }

    // 3. Fallback lookup by verified email in Admin collection
    if (req.user.email) {
      const adminByEmail = await Admin.findOne({ email: req.user.email.toLowerCase().trim() });
      if (adminByEmail) {
        req.admin = adminByEmail;
        req.user.isAdmin = true;
        req.user.role = 'admin';
        return next();
      }
    }

    // Explicit rejection: User is not an administrator in the database
    return res.status(403).json({
      success: false,
      message: 'Access denied: Administrator privileges required. Database verification failed.'
    });
  } catch (err) {
    console.error('[isAdmin Middleware] Authorization verification error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while verifying administrative permissions.',
      error: err.message
    });
  }
};

module.exports = isAdmin;
