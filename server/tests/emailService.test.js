const assert = require('assert');
const {
  normalizePosterUrl,
  generateBookingEmailHtml,
  sendBookingConfirmation
} = require('../services/emailService');

console.log('🧪 Starting Email Notification Workflow Test Suite...\n');

// Test 1: Poster URL Normalization
console.log('Test 1: Verify Poster URL Normalization');
const tmdbRelative = '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg';
const normalizedTmdb = normalizePosterUrl(tmdbRelative);
assert.strictEqual(
  normalizedTmdb,
  'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
  'TMDB relative paths should have base URL prepended correctly'
);

const fullUrl = 'https://images.example.com/poster.jpg';
assert.strictEqual(normalizePosterUrl(fullUrl), fullUrl, 'Absolute URLs should be preserved');

const fallbackUrl = normalizePosterUrl(null);
assert.ok(fallbackUrl.startsWith('https://'), 'Null poster path should return fallback URL');
console.log('✅ Poster URL normalization passed.\n');

// Test 2: HTML Email Template Completeness & Security Verification
console.log('Test 2: Verify HTML Template Contents & Strict "No Random Password" Policy');
const testPayload = {
  userEmail: 'vip_customer@example.com',
  userName: 'Rahul Sharma',
  bookingId: 'BK-IMOV-2026-987654',
  movieName: 'Oppenheimer',
  moviePoster: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
  theatreName: 'Antigravity Cinemas Multiplex',
  showDate: '2026-10-25',
  showTime: '07:30 PM',
  selectedSeats: ['A1', 'A2'],
  seatDisplayList: ['A1 (Balcony)', 'A2 (Balcony)'],
  totalAmount: 850,
  paymentStatus: 'Completed',
  loginUrl: 'https://i-movies-theta.vercel.app/login'
};

const html = generateBookingEmailHtml(testPayload);

// Assertions on required fields
assert.ok(html.includes('vip_customer@example.com'), 'Email must contain registered user email ID');
assert.ok(html.includes('Oppenheimer'), 'Email must contain movie title');
assert.ok(html.includes('https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg'), 'Email must contain normalized poster URL');
assert.ok(html.includes('Antigravity Cinemas Multiplex'), 'Email must contain theater name');
assert.ok(html.includes('2026-10-25'), 'Email must contain show date');
assert.ok(html.includes('07:30 PM'), 'Email must contain show time');
assert.ok(html.includes('A1') && html.includes('A2'), 'Email must contain booked seats');
assert.ok(html.includes('BK-IMOV-2026-987654'), 'Email must contain booking reference ID');
assert.ok(html.includes('850'), 'Email must contain total amount');
assert.ok(html.includes('https://i-movies-theta.vercel.app/login'), 'Email must contain login URL');
assert.ok(html.includes('My Tickets'), 'Email must reference My Tickets navigation');
assert.ok(html.includes('Profile'), 'Email must reference Profile navigation');
assert.ok(html.includes('DO NOT') && html.includes('random passwords'), 'Email must clearly instruct that no random password was generated');
assert.ok(html.includes('existing password that you created at signup'), 'Email must instruct user to use password created during signup');

console.log('✅ HTML template verified with all required details and strict security policies.\n');

// Test 3: Automated Dispatch Execution
console.log('Test 3: Dispatch Confirmation Simulation');
(async () => {
  try {
    const result = await sendBookingConfirmation(testPayload);
    assert.ok(result, 'sendBookingConfirmation should return a status object');
    assert.ok(result.success, 'sendBookingConfirmation should succeed gracefully');
    console.log('✅ sendBookingConfirmation executed successfully (mode:', result.provider || result.mode, ')\n');
    console.log('🎉 ALL EMAIL NOTIFICATION TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
})();
