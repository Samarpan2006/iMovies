const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const assert = require('assert');
const axios = require('axios');
const dayjs = require('dayjs');

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'imovies_jwt_secret_2024_secure_key';

async function runPastShowtimeTests() {
  console.log('🧪 Starting Past Showtime Booking Integration Tests...\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/imovies');

  const Show = require('../models/showModel');
  const User = require('../models/userModel');

  let user = await User.findOne({ email: 'demo@imovies.com' });
  if (!user) {
    user = await User.create({
      username: 'demouser',
      email: 'demo@imovies.com',
      password: 'demopassword123',
      role: 'user'
    });
  }

  const userToken = jwt.sign(
    { id: user._id, email: user.email, username: user.username, isAdmin: false },
    JWT_SECRET
  );

  const todayStr = dayjs().format('YYYY-MM-DD');
  const tomorrowStr = dayjs().add(1, 'day').format('YYYY-MM-DD');

  // Create an explicitly expired show for Today (morning 08:00 AM)
  const expiredShow = await Show.create({
    adminEmail: 'admin@imovies.com',
    showId: `test-expired-${Date.now()}`,
    movieId: 'test-movie-past',
    theatreId: 'theatre-pvr-01',
    theatreName: "PVR Director's Cut Multiplex",
    theatreLocation: 'Downtown Cineplex',
    showDate: todayStr,
    showTime: '08:00 AM', // 8:00 AM has already passed
    format: '2D Atmos',
    screenType: 'Audi 1',
    pricing: { balcony: 400, middle: 280, lower: 180 },
    tickets: {
      lower: { A: { '1': 'available', '2': 'available' } }
    }
  });

  // Create a future show for Tomorrow (morning 08:00 AM)
  const futureShow = await Show.create({
    adminEmail: 'admin@imovies.com',
    showId: `test-future-${Date.now()}`,
    movieId: 'test-movie-past',
    theatreId: 'theatre-pvr-01',
    theatreName: "PVR Director's Cut Multiplex",
    theatreLocation: 'Downtown Cineplex',
    showDate: tomorrowStr,
    showTime: '08:00 AM', // Tomorrow morning is in the future
    format: '2D Atmos',
    screenType: 'Audi 1',
    pricing: { balcony: 400, middle: 280, lower: 180 },
    tickets: {
      lower: { A: { '1': 'available', '2': 'available' } }
    }
  });

  // Test 1: GET /api/shows marks today's past show as isPast = true
  console.log('--- Test 1: Verify API returns isPast=true for expired show ---');
  const showsRes = await axios.get(`${API_BASE}/shows?movieId=test-movie-past&date=${todayStr}`);
  assert.strictEqual(showsRes.status, 200);
  const foundExpired = showsRes.data.shows.find(s => s.showId === expiredShow.showId);
  assert.ok(foundExpired, 'Expired show should be returned');
  assert.strictEqual(foundExpired.isPast, true, 'isPast must be true for 08:00 AM today');
  console.log('✅ PASS: Expired show on Today is accurately marked isPast = true.');

  // Test 2: GET /api/shows marks tomorrow's show as isPast = false
  console.log('\n--- Test 2: Verify future date show has isPast=false ---');
  const futureShowsRes = await axios.get(`${API_BASE}/shows?movieId=test-movie-past&date=${tomorrowStr}`);
  assert.strictEqual(futureShowsRes.status, 200);
  const foundFuture = futureShowsRes.data.shows.find(s => s.showId === futureShow.showId);
  assert.ok(foundFuture, 'Future show should be returned');
  assert.strictEqual(foundFuture.isPast, false, 'isPast must be false for tomorrow morning 08:00 AM');
  console.log('✅ PASS: Future date show is available with isPast = false.');

  // Test 3: Attempting to lock seats for expired show must be rejected with 400
  console.log('\n--- Test 3: Backend blocks seat lock for expired showtime ---');
  try {
    await axios.post(
      `${API_BASE}/bookings/lock-seats`,
      {
        showId: expiredShow.showId,
        selectedSeats: ['lower-A-1'],
        userEmail: user.email
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    assert.fail('Seat locking for expired show should have been rejected');
  } catch (err) {
    assert.strictEqual(err.response?.status, 400, 'Expired show locking must return 400');
    assert.ok(err.response?.data?.message?.includes('already started or concluded'));
    console.log(`✅ PASS: Server blocked expired show lock with 400: "${err.response?.data?.message}"`);
  }

  // Test 4: Locking seats for future show succeeds
  console.log('\n--- Test 4: Locking seats for valid future showtime succeeds ---');
  const lockRes = await axios.post(
    `${API_BASE}/bookings/lock-seats`,
    {
      showId: futureShow.showId,
      selectedSeats: ['lower-A-1'],
      userEmail: user.email
    },
    { headers: { Authorization: `Bearer ${userToken}` } }
  );
  assert.strictEqual(lockRes.status, 200);
  assert.ok(lockRes.data.success);
  console.log('✅ PASS: Future showtime seats locked successfully.');

  // Cleanup test documents
  await Show.deleteMany({ movieId: 'test-movie-past' });

  console.log('\n🎉 ALL PAST SHOWTIME BOOKING INTEGRATION TESTS PASSED PERFECTLY!');
  process.exit(0);
}

runPastShowtimeTests().catch((err) => {
  console.error('❌ Test failed:', err.message, err.response?.data);
  process.exit(1);
});
