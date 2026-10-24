const express = require('express');
const router = express.Router();
const {
  getBrevoStatus,
  sendTestEmail,
  triggerVerificationEmail,
  triggerPasswordResetEmail,
  triggerBookingConfirmationEmail
} = require('../controllers/emailController');

// Configuration Status
router.get('/status', getBrevoStatus);

// Test Sender Endpoint
router.post('/test', sendTestEmail);

// Direct Transactional Triggers
router.post('/verification', triggerVerificationEmail);
router.post('/password-reset', triggerPasswordResetEmail);
router.post('/booking-confirmation', triggerBookingConfirmationEmail);

module.exports = router;
