const { getBrevoClient, getBrevoSender, validateBrevoConfig } = require('../config/brevoConfig');

/**
 * Normalizes movie poster path into a fully-qualified public URL.
 */
const normalizePosterUrl = (posterPath) => {
  if (!posterPath) {
    return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80';
  }
  if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
    return posterPath;
  }
  const cleanPath = posterPath.startsWith('/') ? posterPath : `/${posterPath}`;
  return `https://image.tmdb.org/t/p/w500${cleanPath}`;
};

/**
 * Normalize recipient into array of { email, name } objects
 */
const formatRecipients = (recipients) => {
  if (!recipients) return [];
  if (typeof recipients === 'string') {
    return [{ email: recipients.trim() }];
  }
  if (Array.isArray(recipients)) {
    return recipients.map((r) => (typeof r === 'string' ? { email: r.trim() } : r));
  }
  if (typeof recipients === 'object' && recipients.email) {
    return [recipients];
  }
  return [];
};

/**
 * Base Method 1: sendEmail
 * Low-level robust sender using Brevo TransactionalEmails API with automatic retries for rate limits.
 */
const sendEmail = async ({
  to,
  subject,
  htmlContent,
  textContent,
  params = {},
  tags = [],
  attachment = null,
  replyTo = null
}) => {
  const formattedTo = formatRecipients(to);
  if (formattedTo.length === 0) {
    throw new Error('[Brevo EmailService] No valid recipient email provided.');
  }

  const client = getBrevoClient();
  const sender = getBrevoSender();

  const payload = {
    sender,
    to: formattedTo,
    subject,
    htmlContent: htmlContent || textContent || '',
    ...(textContent && { textContent })
  };

  if (params && Object.keys(params).length > 0) {
    payload.params = params;
  }
  if (Array.isArray(tags) && tags.length > 0) {
    payload.tags = tags;
  }
  if (attachment) {
    payload.attachment = Array.isArray(attachment) ? attachment : [attachment];
  }
  if (replyTo) {
    payload.replyTo = typeof replyTo === 'string' ? { email: replyTo } : replyTo;
  }

  // Retry with exponential backoff on HTTP 429 rate limits or transient network failures
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.transactionalEmails.sendTransacEmail(payload);
      console.log(`[Brevo Email Sent] Recipient: ${formattedTo[0].email} | Subject: "${subject}" | MessageId: ${response?.messageId}`);
      return {
        success: true,
        messageId: response?.messageId,
        provider: 'brevo'
      };
    } catch (err) {
      const statusCode = err.statusCode || err.status || err.response?.status;
      const errorMessage = err.body?.message || err.message || 'Unknown Brevo API error';

      if (statusCode === 429 && attempt < maxRetries) {
        console.warn(`[Brevo Rate Limit 429] Retrying attempt ${attempt + 1}/${maxRetries} after delay...`);
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }

      console.error(`[Brevo Send Error] Failed to send email to ${formattedTo[0].email}:`, errorMessage);
      return {
        success: false,
        error: errorMessage,
        statusCode
      };
    }
  }
};

/**
 * Base Method 2: sendTemplateEmail
 * Sends a transactional email using a pre-configured Brevo template ID.
 */
const sendTemplateEmail = async ({ to, templateId, params = {} }) => {
  const formattedTo = formatRecipients(to);
  if (formattedTo.length === 0) {
    throw new Error('[Brevo EmailService] No recipient provided for template email.');
  }

  const client = getBrevoClient();
  const sender = getBrevoSender();

  try {
    const payload = {
      sender,
      to: formattedTo,
      templateId: Number(templateId),
      params
    };
    const response = await client.transactionalEmails.sendTransacEmail(payload);
    console.log(`[Brevo Template Email Sent] Template ID: ${templateId} to ${formattedTo[0].email}`);
    return {
      success: true,
      messageId: response?.messageId,
      provider: 'brevo'
    };
  } catch (err) {
    console.error(`[Brevo Template Error] Template ${templateId}:`, err.body?.message || err.message);
    return {
      success: false,
      error: err.body?.message || err.message
    };
  }
};

/* ==========================================================================
   HIGH-LEVEL FEATURE WRAPPERS
   ========================================================================== */

/**
 * Feature 1: sendVerificationEmail
 * Sends account activation email containing BOTH:
 * - 6-Digit One-Time Password (OTP) for in-app verification window
 * - Direct 1-Click Verification Link button
 */
const sendVerificationEmail = async (email, details = {}) => {
  const {
    username = 'Movie Buff',
    verificationToken,
    verificationLink,
    otp,
    expiresIn = '15 minutes'
  } = details;

  const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const directLink = verificationLink || `${clientBaseUrl}/verify-email?token=${verificationToken || ''}&email=${encodeURIComponent(email)}`;

  const subject = `🎬 Verify Your iMovies Account (Code: ${otp || 'Welcome'})`;

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your iMovies Account</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;padding:30px 15px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:580px;background-color:#141414;border-radius:16px;border:1px solid #262626;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.8);">
            
            <!-- Cinema Header Banner -->
            <tr>
              <td style="background:linear-gradient(135deg, #e50914 0%, #8b0000 100%);padding:36px 30px;text-align:center;">
                <h1 style="margin:0;font-size:32px;font-weight:900;letter-spacing:3px;color:#ffffff;text-shadow:0 2px 8px rgba(0,0,0,0.4);">
                  🎬 iMovies
                </h1>
                <p style="margin:8px 0 0;font-size:14px;color:#fce4e4;letter-spacing:1px;font-weight:600;text-transform:uppercase;">
                  Email Verification & Account Activation
                </p>
              </td>
            </tr>

            <!-- Body Content -->
            <tr>
              <td style="padding:36px 30px;">
                <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#ffffff;">
                  Welcome to iMovies, ${username}! 👋
                </h2>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#a3a3a3;">
                  Thank you for creating an account. To complete your registration and secure your profile for booking cinema tickets, please verify your email address.
                </p>

                <!-- OTP Display Window -->
                ${otp ? `
                <div style="background-color:#0a0a0a;border:2px dashed #e50914;border-radius:14px;padding:24px 20px;text-align:center;margin-bottom:28px;">
                  <span style="display:block;font-size:12px;font-weight:800;color:#e50914;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">
                    Your One-Time Password (OTP)
                  </span>
                  <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#ffffff;font-family:monospace;margin:6px 0;">
                    ${otp}
                  </div>
                  <span style="display:block;font-size:12px;color:#737373;margin-top:6px;">
                    ⏱️ Code expires in <strong>${expiresIn}</strong>. Do not share this OTP with anyone.
                  </span>
                </div>
                ` : ''}

                <!-- Direct Verification Button -->
                <div style="text-align:center;margin:30px 0;">
                  <a href="${directLink}" target="_blank" style="display:inline-block;background-color:#e50914;color:#ffffff;font-size:15px;font-weight:800;padding:14px 34px;border-radius:10px;text-decoration:none;letter-spacing:0.5px;box-shadow:0 4px 15px rgba(229,9,20,0.4);">
                    ✓ Verify & Activate Account
                  </a>
                </div>

                <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#737373;text-align:center;">
                  Or paste this verification URL into your browser:<br>
                  <a href="${directLink}" style="color:#e50914;word-break:break-all;font-size:12px;">${directLink}</a>
                </p>

                <div style="border-top:1px solid #262626;margin-top:30px;padding-top:20px;">
                  <p style="margin:0;font-size:12px;color:#525252;line-height:1.5;">
                    If you did not request this registration, please disregard this email. Your email address will remain unactivated.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color:#0a0a0a;padding:20px 30px;text-align:center;border-top:1px solid #1f1f1f;">
                <p style="margin:0;font-size:12px;color:#525252;">
                  © ${new Date().getFullYear()} iMovies Entertainment Ltd. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  return sendEmail({
    to: email,
    subject,
    htmlContent,
    tags: ['account-verification', 'otp']
  });
};

/**
 * Feature 2: sendPasswordResetEmail
 * Sends secure password recovery email containing BOTH:
 * - 6-Digit Password Reset OTP
 * - 1-Click Password Recovery Link
 */
const sendPasswordResetEmail = async (email, details = {}) => {
  const {
    username = 'Customer',
    resetToken,
    resetLink,
    otp,
    expiresIn = '15 minutes'
  } = details;

  const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const directLink = resetLink || `${clientBaseUrl}/reset-password?token=${resetToken || ''}&email=${encodeURIComponent(email)}`;

  const subject = `🔒 Reset Your iMovies Password (Code: ${otp || 'Security Alert'})`;

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your iMovies Password</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;padding:30px 15px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:580px;background-color:#141414;border-radius:16px;border:1px solid #262626;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.8);">
            
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg, #1f1f1f 0%, #141414 100%);border-bottom:3px solid #e50914;padding:30px;text-align:center;">
                <h1 style="margin:0;font-size:28px;font-weight:900;letter-spacing:2px;color:#e50914;">
                  🎬 iMovies
                </h1>
                <p style="margin:6px 0 0;font-size:13px;color:#a3a3a3;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
                  Security • Password Reset Request
                </p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding:36px 30px;">
                <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#ffffff;">
                  Password Reset Request for ${username}
                </h2>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#a3a3a3;">
                  We received a request to reset the password for your iMovies account. Use the one-time verification code below or click the reset link to choose a new password.
                </p>

                <!-- OTP Box -->
                ${otp ? `
                <div style="background-color:#0a0a0a;border:2px dashed #f59e0b;border-radius:14px;padding:24px 20px;text-align:center;margin-bottom:28px;">
                  <span style="display:block;font-size:12px;font-weight:800;color:#f59e0b;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">
                    Your Password Reset Code (OTP)
                  </span>
                  <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#ffffff;font-family:monospace;margin:6px 0;">
                    ${otp}
                  </div>
                  <span style="display:block;font-size:12px;color:#737373;margin-top:6px;">
                    ⏱️ This security code is valid for <strong>${expiresIn}</strong>.
                  </span>
                </div>
                ` : ''}

                <!-- Reset Button -->
                <div style="text-align:center;margin:30px 0;">
                  <a href="${directLink}" target="_blank" style="display:inline-block;background-color:#e50914;color:#ffffff;font-size:15px;font-weight:800;padding:14px 34px;border-radius:10px;text-decoration:none;letter-spacing:0.5px;box-shadow:0 4px 15px rgba(229,9,20,0.4);">
                    Set New Password
                  </a>
                </div>

                <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#737373;text-align:center;">
                  Direct link: <a href="${directLink}" style="color:#e50914;word-break:break-all;font-size:12px;">${directLink}</a>
                </p>

                <div style="border-top:1px solid #262626;margin-top:30px;padding-top:20px;">
                  <p style="margin:0;font-size:12px;color:#737373;line-height:1.5;">
                    🔒 <strong>Did not request this change?</strong> You can safely ignore this email. Your current password remains secure, and no changes will be made to your account.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color:#0a0a0a;padding:20px 30px;text-align:center;border-top:1px solid #1f1f1f;">
                <p style="margin:0;font-size:12px;color:#525252;">
                  © ${new Date().getFullYear()} iMovies Entertainment Ltd. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  return sendEmail({
    to: email,
    subject,
    htmlContent,
    tags: ['password-reset', 'security']
  });
};

/**
 * Feature 3: sendBookingConfirmationEmail
 * Sends a rich, cinematic ticket confirmation receipt with:
 * - Movie poster & title
 * - Auditorium / Theater name
 * - Showtime date & time
 * - Selected seats with section badges
 * - Booking reference ID & payment total
 * - Live QR admission code & direct PDF pass download link
 * - Guidance on logging in to view/manage ticket at /login
 */
const sendBookingConfirmationEmail = async (email, bookingDetails = {}) => {
  const {
    bookingId = `IMOVE-${Date.now()}`,
    movieName = 'Movie Screening',
    moviePoster = null,
    theatreName = 'Antigravity Cinemas',
    showDate = 'Today',
    showTime = 'Evening Show',
    selectedSeats = [],
    totalAmount = 0,
    paymentStatus = 'Completed',
    userName = 'Movie Buff',
    userEmail = email,
    loginUrl = 'https://i-movies-theta.vercel.app/login'
  } = bookingDetails;

  const posterUrl = normalizePosterUrl(moviePoster);
  const seatsList = Array.isArray(selectedSeats) ? selectedSeats : [selectedSeats];
  const seatsBadges = seatsList
    .map(
      (s) =>
        `<span style="display:inline-block;background-color:#e50914;color:#ffffff;font-size:13px;font-weight:800;padding:5px 12px;border-radius:6px;margin:2px 4px 2px 0;letter-spacing:0.5px;">${s}</span>`
    )
    .join(' ');

  const qrData = encodeURIComponent(`iMovies-Pass:${bookingId}:${theatreName}:${seatsList.join(',')}`);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}`;

  const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const ticketViewUrl = `${clientBaseUrl}/ticket/${bookingId}`;
  const pdfDownloadUrl = `http://localhost:5000/api/bookings/${bookingId}/pdf`;

  const subject = `🎬 Booking Confirmed! Ticket #${bookingId.slice(0, 8)} - ${movieName}`;

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmed - ${movieName}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;padding:30px 15px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:600px;background-color:#141414;border-radius:18px;border:1px solid #262626;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,0.85);">
            
            <!-- Cinema Hero Banner -->
            <tr>
              <td style="background:linear-gradient(135deg, #e50914 0%, #7f0000 100%);padding:36px 30px;text-align:center;">
                <h1 style="margin:0;font-size:32px;font-weight:900;letter-spacing:3px;color:#ffffff;text-shadow:0 2px 10px rgba(0,0,0,0.5);">
                  🎬 iMovies
                </h1>
                <p style="margin:8px 0 0;font-size:14px;color:#ffe4e6;letter-spacing:1px;font-weight:700;text-transform:uppercase;">
                  ✓ Cinema Admission Confirmed
                </p>
              </td>
            </tr>

            <!-- Movie Poster & Details Banner -->
            <tr>
              <td style="padding:32px 30px;border-bottom:1px solid #222222;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="130" valign="top" style="padding-right:24px;">
                      <img src="${posterUrl}" alt="${movieName}" width="130" style="width:130px;border-radius:10px;display:block;box-shadow:0 6px 16px rgba(0,0,0,0.6);border:1px solid #333333;" />
                    </td>
                    <td valign="top">
                      <span style="display:inline-block;background-color:#059669;color:#ffffff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
                        ● Confirmed Pass
                      </span>
                      <h2 style="margin:0 0 10px;font-size:24px;font-weight:900;color:#ffffff;line-height:1.2;">
                        ${movieName}
                      </h2>
                      <p style="margin:0 0 6px;font-size:14px;color:#d4d4d4;">
                        🏟️ <strong>${theatreName}</strong>
                      </p>
                      <p style="margin:0 0 6px;font-size:14px;color:#a3a3a3;">
                        📅 <strong>${showDate}</strong>
                      </p>
                      <p style="margin:0;font-size:14px;color:#a3a3a3;">
                        🕐 <strong>${showTime}</strong>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Booking Ticket Particulars -->
            <tr>
              <td style="padding:28px 30px;background-color:#0d0d0d;">
                <table role="presentation" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:10px 0;font-size:14px;color:#888888;border-bottom:1px solid #1f1f1f;">
                      Reserved Seats:
                    </td>
                    <td align="right" style="padding:10px 0;border-bottom:1px solid #1f1f1f;">
                      ${seatsBadges}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;font-size:14px;color:#888888;border-bottom:1px solid #1f1f1f;">
                      Booking Reference ID:
                    </td>
                    <td align="right" style="padding:10px 0;font-size:14px;font-family:monospace;font-weight:700;color:#ffffff;border-bottom:1px solid #1f1f1f;">
                      #${bookingId}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;font-size:14px;color:#888888;border-bottom:1px solid #1f1f1f;">
                      Payment Status:
                    </td>
                    <td align="right" style="padding:10px 0;font-size:14px;font-weight:700;color:#10b981;border-bottom:1px solid #1f1f1f;">
                      ${paymentStatus} (Paid Online)
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0 0;font-size:16px;font-weight:800;color:#ffffff;">
                      Total Paid:
                    </td>
                    <td align="right" style="padding:12px 0 0;font-size:22px;font-weight:900;color:#e50914;">
                      ₹${totalAmount}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Digital Admission QR Code -->
            <tr>
              <td style="padding:30px;text-align:center;border-bottom:1px solid #222222;background-color:#141414;">
                <span style="display:block;font-size:12px;font-weight:800;color:#a3a3a3;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
                  Digital Admission Pass Barcode
                </span>
                <div style="display:inline-block;background-color:#ffffff;padding:12px;border-radius:14px;box-shadow:0 6px 20px rgba(0,0,0,0.6);">
                  <img src="${qrCodeUrl}" alt="Digital Admission QR Code" width="160" height="160" style="display:block;margin:0 auto;" />
                </div>
                <p style="margin:12px 0 0;font-size:13px;color:#888888;">
                  Scan this QR code at the multiplex entrance gate for immediate admission.
                </p>
                <div style="margin-top:20px;">
                  <a href="${pdfDownloadUrl}" target="_blank" style="display:inline-block;background-color:#1f1f1f;border:1px solid #333333;color:#ffffff;font-size:13px;font-weight:700;padding:10px 24px;border-radius:8px;text-decoration:none;margin-right:8px;">
                    📄 Download PDF Pass
                  </a>
                  <a href="${ticketViewUrl}" target="_blank" style="display:inline-block;background-color:#e50914;color:#ffffff;font-size:13px;font-weight:700;padding:10px 24px;border-radius:8px;text-decoration:none;">
                    🎟️ View Live Web Ticket
                  </a>
                </div>
              </td>
            </tr>

            <!-- Instructions to View & Manage Tickets -->
            <tr>
              <td style="padding:28px 30px;background-color:#0d0d0d;">
                <h3 style="margin:0 0 10px;font-size:15px;font-weight:700;color:#ffffff;">
                  🔐 Access Your Booked Tickets Anytime
                </h3>
                <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#888888;">
                  You can access, view QR codes, share passes to WhatsApp, or print your tickets whenever needed. Log in using your registered credentials (<strong>${userEmail}</strong>) at:
                </p>
                <div style="text-align:center;">
                  <a href="${loginUrl}" target="_blank" style="display:inline-block;background-color:#1e1e1e;border:1px solid #383838;color:#ffffff;font-size:13px;font-weight:700;padding:10px 24px;border-radius:8px;text-decoration:none;">
                    👉 Log in at iMovies / My Tickets
                  </a>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color:#080808;padding:24px 30px;text-align:center;border-top:1px solid #1a1a1a;">
                <p style="margin:0 0 6px;font-size:13px;color:#a3a3a3;">
                  🍿 Enjoy the show! Thank you for booking with <strong>iMovies</strong>.
                </p>
                <p style="margin:0;font-size:11px;color:#555555;">
                  © ${new Date().getFullYear()} iMovies Entertainment Ltd. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  return sendEmail({
    to: email,
    subject,
    htmlContent,
    tags: ['booking-confirmation', 'ticket-receipt']
  });
};

/**
 * Feature 4: sendBookingStatusUpdateEmail
 * Sends status change notification (e.g. Cancelled, Refunded, Rescheduled)
 */
const sendBookingStatusUpdateEmail = async (email, statusDetails = {}) => {
  const {
    bookingId = '',
    movieName = 'Movie',
    theatreName = 'Theatre',
    showDate = '',
    showTime = '',
    status = 'CANCELLED',
    actionMessage = 'Your ticket reservation has been updated.',
    refundAmount = null
  } = statusDetails;

  const isCancelled = status.toUpperCase() === 'CANCELLED';
  const isRefunded = status.toUpperCase() === 'REFUNDED';
  const statusColor = isCancelled ? '#ef4444' : isRefunded ? '#3b82f6' : '#10b981';

  const subject = `📢 Ticket Status Update: ${status.toUpperCase()} - ${movieName} (#${bookingId.slice(0, 8)})`;

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>Booking Status Update</title></head>
  <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;padding:30px 15px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:580px;background-color:#141414;border-radius:16px;border:1px solid #262626;overflow:hidden;">
            <tr>
              <td style="background-color:#181818;border-bottom:3px solid ${statusColor};padding:24px 30px;text-align:center;">
                <h1 style="margin:0;font-size:26px;color:#ffffff;letter-spacing:2px;">🎬 iMovies</h1>
                <p style="margin:6px 0 0;font-size:13px;font-weight:700;color:${statusColor};text-transform:uppercase;">
                  Booking Status: ${status.toUpperCase()}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 30px;">
                <h2 style="margin:0 0 12px;font-size:20px;color:#ffffff;">
                  ${movieName}
                </h2>
                <p style="margin:0 0 16px;font-size:14px;color:#a3a3a3;line-height:1.6;">
                  ${actionMessage}
                </p>
                <div style="background-color:#0a0a0a;border:1px solid #222222;border-radius:12px;padding:18px 20px;margin-bottom:24px;font-size:13px;line-height:1.8;">
                  <div>🏟️ <strong>Cinema:</strong> ${theatreName}</div>
                  <div>📅 <strong>Date:</strong> ${showDate} @ ${showTime}</div>
                  <div>🆔 <strong>Booking Ref:</strong> #${bookingId}</div>
                  ${refundAmount ? `<div style="color:#10b981;">💰 <strong>Refund Amount:</strong> ₹${refundAmount} (Credited to original payment source within 3-5 days)</div>` : ''}
                </div>
                <p style="margin:0;font-size:12px;color:#666666;">
                  For any support inquiries, feel free to reply to this email or visit our help center.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  return sendEmail({
    to: email,
    subject,
    htmlContent,
    tags: ['booking-status-update', status.toLowerCase()]
  });
};

/**
 * Alias for backwards compatibility with paymentController
 */
const sendBookingConfirmation = async (details) => {
  const recipient = details.to || details.userEmail || details.email;
  return sendBookingConfirmationEmail(recipient, details);
};

module.exports = {
  sendEmail,
  sendTemplateEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendBookingConfirmationEmail,
  sendBookingConfirmation,
  sendBookingStatusUpdateEmail
};
