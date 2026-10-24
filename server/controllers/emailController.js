const {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendBookingConfirmationEmail,
  sendBookingStatusUpdateEmail
} = require('../services/emailService');
const { getBrevoClient, getBrevoSender, validateBrevoConfig, BREVO_API_KEY, SENDER_EMAIL } = require('../config/brevoConfig');

/**
 * GET /api/email/status
 * Verifies Brevo configuration and connection status
 */
exports.getBrevoStatus = async (req, res) => {
  try {
    const isConfigValid = validateBrevoConfig();
    if (!isConfigValid) {
      return res.status(400).json({
        success: false,
        message: 'Brevo configuration is invalid or missing BREVO_API_KEY.',
        configured: false
      });
    }

    const client = getBrevoClient();
    const accountInfo = await client.account.getAccount();

    return res.json({
      success: true,
      configured: true,
      sender: getBrevoSender(),
      account: {
        email: accountInfo.email,
        companyName: accountInfo.companyName,
        plan: accountInfo.plan
      }
    });
  } catch (err) {
    console.error('[emailController] getBrevoStatus Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to authenticate with Brevo API.',
      error: err.message
    });
  }
};

/**
 * POST /api/email/test
 * Sends a test transactional email via Brevo
 */
exports.sendTestEmail = async (req, res) => {
  try {
    const { to = SENDER_EMAIL, subject = '🎬 iMovies Brevo Transactional Test', name = 'Customer' } = req.body;

    const result = await sendEmail({
      to: [{ email: to, name }],
      subject,
      htmlContent: `
        <div style="font-family:sans-serif;background:#141414;color:#fff;padding:24px;border-radius:12px;border:1px solid #333;">
          <h2 style="color:#e50914;margin:0 0 10px;">🎬 iMovies Brevo Integration Operational</h2>
          <p>This is a live transactional test confirming that your Brevo API key is sending successfully.</p>
          <div style="background:#0a0a0a;padding:12px;border-radius:8px;font-family:monospace;margin:16px 0;color:#10b981;">
            Status: HTTP 200 OK • SDK: @getbrevo/brevo v6
          </div>
          <p style="color:#888;font-size:12px;margin:0;">Delivered at ${new Date().toISOString()}</p>
        </div>
      `,
      tags: ['test-email', 'admin']
    });

    if (result.success) {
      return res.json({
        success: true,
        message: `Test email successfully dispatched to ${to}`,
        messageId: result.messageId
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to deliver test email.',
      error: result.error
    });
  } catch (err) {
    console.error('[emailController] sendTestEmail Error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Error executing test email.',
      error: err.message
    });
  }
};

/**
 * POST /api/email/verification
 * Triggers test verification email with OTP and direct link
 */
exports.triggerVerificationEmail = async (req, res) => {
  try {
    const { email, username = 'Movie Buff', otp = '789456' } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Recipient email is required.' });
    }

    const result = await sendVerificationEmail(email, {
      username,
      otp,
      verificationToken: 'sample-test-token-12345'
    });

    return res.json({
      success: result.success,
      message: result.success ? `Verification email sent to ${email}` : 'Failed to send verification email.',
      messageId: result.messageId,
      error: result.error
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal error.', error: err.message });
  }
};

/**
 * POST /api/email/password-reset
 * Triggers test password reset email with OTP
 */
exports.triggerPasswordResetEmail = async (req, res) => {
  try {
    const { email, username = 'Customer', otp = '654321' } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Recipient email is required.' });
    }

    const result = await sendPasswordResetEmail(email, {
      username,
      otp,
      resetToken: 'sample-reset-token-67890'
    });

    return res.json({
      success: result.success,
      message: result.success ? `Password recovery email sent to ${email}` : 'Failed to send reset email.',
      messageId: result.messageId,
      error: result.error
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal error.', error: err.message });
  }
};

/**
 * POST /api/email/booking-confirmation
 * Triggers booking confirmation email
 */
exports.triggerBookingConfirmationEmail = async (req, res) => {
  try {
    const { email, bookingDetails } = req.body;
    if (!email || !bookingDetails) {
      return res.status(400).json({ success: false, message: 'Email and bookingDetails are required.' });
    }

    const result = await sendBookingConfirmationEmail(email, bookingDetails);

    return res.json({
      success: result.success,
      message: result.success ? `Booking confirmation sent to ${email}` : 'Failed to deliver booking receipt.',
      messageId: result.messageId,
      error: result.error
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal error.', error: err.message });
  }
};
