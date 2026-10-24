const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'imovies_jwt_secret_2024_secure_key';

async function runSeatCollisionTests() {
  console.log('🧪 Running Dedicated Seat Collision & Tier Scoping Verification Tests...\n');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/imovies');

  const Booking = require('../models/bookingModel');
  const Show = require('../models/showModel');
  const Theatre = require('../models/theatreModel');
  const User = require('../models/userModel');
  const SeatLock = require('../models/seatLockModel');
  const { toCompositeSeatId, parseSeatIdentifier, formatSeatDisplay } = require('../utils/seatHelper');

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

  let show = await Show.findOne();
  if (!show) throw new Error('No show found in database.');

  // Ensure show date/time is in the future for testing
  show.showDate = dayjs().add(2, 'day').format('YYYY-MM-DD');
  show.showTime = '08:30 PM';
  await show.save();

  let theatre = await Theatre.findOne({ theatreId: show.theatreId });
  if (!theatre) throw new Error('Theatre not found.');

  console.log(`Using Show: ${show.showId} at ${theatre.theatreName}`);

  // Clean previous locks & test bookings for clean slate
  await SeatLock.deleteMany({ showId: show.showId });
  await Booking.deleteMany({ showId: show.showId });

  // Reset show tickets
  if (show.tickets) {
    for (const t of ['balcony', 'middle', 'lower']) {
      if (show.tickets[t] && show.tickets[t].A) {
        show.tickets[t].A['1'] = 'available';
      }
    }
    show.markModified('tickets');
    await show.save();
  }

  // =========================================================================
  // SCENARIO 1: BOOKING 'lower-A-1' MUST NOT TOUCH 'balcony-A-1' OR 'middle-A-1'
  // =========================================================================
  console.log('\n--- Scenario 1: Book seat A1 in LOWER tier ---');

  // 1. Lock lower-A-1
  const lockRes = await fetch(`${API_BASE}/bookings/lock-seats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'auth-token': userToken },
    body: JSON.stringify({
      showId: show.showId,
      selectedSeats: ['lower-A-1'],
      seats: [
        {
          id: 'lower-A-1',
          seatId: 'lower-A-1',
          tierId: 'lower',
          sectionId: 'lower',
          tier: 'lower',
          row: 'A',
          seatNumber: '1',
          col: '1',
          label: 'A1'
        }
      ],
      userEmail: user.email
    })
  }).then(r => r.json());

  console.log(`Lock response for lower-A-1: success=${lockRes.success}`);
  if (!lockRes.success) throw new Error(`Lock failed: ${JSON.stringify(lockRes)}`);

  // 2. Create and complete booking for lower-A-1
  const crypto = require('crypto');
  const secret = process.env.RAZORPAY_KEY_SECRET || '5OtY3b29pz3FK1KukmSiZqmS';

  const book1Res = await fetch(`${API_BASE}/bookings/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'auth-token': userToken },
    body: JSON.stringify({
      showId: show.showId,
      selectedSeats: ['lower-A-1'],
      seats: [
        {
          id: 'lower-A-1',
          seatId: 'lower-A-1',
          tierId: 'lower',
          sectionId: 'lower',
          tier: 'lower',
          row: 'A',
          seatNumber: '1',
          label: 'A1'
        }
      ],
      movieName: 'Collision Test',
      theatreName: theatre.theatreName,
      showDate: show.showDate,
      showTime: show.showTime,
      userEmail: user.email
    })
  }).then(r => r.json());

  const orderId1 = `order_test_${Date.now()}`;
  const payId1 = `pay_test_${Date.now()}`;
  const sig1 = crypto.createHmac('sha256', secret).update(`${orderId1}|${payId1}`).digest('hex');

  await fetch(`${API_BASE}/payment/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'auth-token': userToken },
    body: JSON.stringify({
      bookingId: book1Res.bookingId,
      razorpay_order_id: orderId1,
      razorpay_payment_id: payId1,
      razorpay_signature: sig1
    })
  });

  // Verify seat states from GET /api/shows/:showId
  let showData1 = await fetch(`${API_BASE}/shows/${show.showId}`, {
    headers: { 'auth-token': userToken }
  }).then(r => r.json());

  let lowerA1 = showData1.show.tickets.lower?.A?.['1'];
  let balconyA1 = showData1.show.tickets.balcony?.A?.['1'];
  let middleA1 = showData1.show.tickets.middle?.A?.['1'];

  console.log(`lower.A.1   status: "${lowerA1}" (Expected: "booked")`);
  console.log(`balcony.A.1 status: "${balconyA1}" (Expected: "available")`);
  console.log(`middle.A.1  status: "${middleA1}" (Expected: "available")`);

  if (lowerA1 !== 'booked') throw new Error(`Lower A1 should be booked, got: ${lowerA1}`);
  if (balconyA1 !== 'available') throw new Error(`Balcony A1 collided and became: ${balconyA1}`);
  if (middleA1 !== 'available') throw new Error(`Middle A1 collided and became: ${middleA1}`);
  console.log('✅ PASS: Booking Lower A1 left Balcony A1 and Middle A1 completely available!');

  // =========================================================================
  // SCENARIO 2: BOOKING 'balcony-A-1' SIMULTANEOUSLY WHILE 'lower-A-1' IS BOOKED
  // =========================================================================
  console.log('\n--- Scenario 2: Book seat A1 in BALCONY tier while Lower A1 is booked ---');

  const book2Res = await fetch(`${API_BASE}/bookings/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'auth-token': userToken },
    body: JSON.stringify({
      showId: show.showId,
      selectedSeats: ['balcony-A-1'],
      seats: [
        {
          id: 'balcony-A-1',
          seatId: 'balcony-A-1',
          tierId: 'balcony',
          sectionId: 'balcony',
          tier: 'balcony',
          row: 'A',
          seatNumber: '1',
          label: 'A1'
        }
      ],
      movieName: 'Collision Test',
      theatreName: theatre.theatreName,
      showDate: show.showDate,
      showTime: show.showTime,
      userEmail: user.email
    })
  }).then(r => r.json());

  const orderId2 = `order_test_${Date.now()}`;
  const payId2 = `pay_test_${Date.now()}`;
  const sig2 = crypto.createHmac('sha256', secret).update(`${orderId2}|${payId2}`).digest('hex');

  await fetch(`${API_BASE}/payment/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'auth-token': userToken },
    body: JSON.stringify({
      bookingId: book2Res.bookingId,
      razorpay_order_id: orderId2,
      razorpay_payment_id: payId2,
      razorpay_signature: sig2
    })
  });

  let showData2 = await fetch(`${API_BASE}/shows/${show.showId}`, {
    headers: { 'auth-token': userToken }
  }).then(r => r.json());

  lowerA1 = showData2.show.tickets.lower?.A?.['1'];
  balconyA1 = showData2.show.tickets.balcony?.A?.['1'];
  middleA1 = showData2.show.tickets.middle?.A?.['1'];

  console.log(`lower.A.1   status: "${lowerA1}" (Expected: "booked")`);
  console.log(`balcony.A.1 status: "${balconyA1}" (Expected: "booked")`);
  console.log(`middle.A.1  status: "${middleA1}" (Expected: "available")`);

  if (lowerA1 !== 'booked') throw new Error(`Lower A1 state changed unexpectedly`);
  if (balconyA1 !== 'booked') throw new Error(`Balcony A1 failed to book`);
  if (middleA1 !== 'available') throw new Error(`Middle A1 was corrupted`);
  console.log('✅ PASS: Both Lower A1 and Balcony A1 are independently booked. Middle A1 remains available!');

  // =========================================================================
  // SCENARIO 3: CANCELLING LOWER A1 RELEASES ONLY LOWER A1 (BALCONY REMAINS BOOKED)
  // =========================================================================
  console.log('\n--- Scenario 3: Cancel Lower A1 booking ---');

  const cancelRes = await fetch(`${API_BASE}/bookings/cancel/${book1Res.bookingId}`, {
    method: 'POST',
    headers: { 'auth-token': userToken }
  }).then(r => r.json());

  console.log(`Cancellation result: success=${cancelRes.success}`);
  if (!cancelRes.success) throw new Error('Cancellation failed');

  let showData3 = await fetch(`${API_BASE}/shows/${show.showId}`, {
    headers: { 'auth-token': userToken }
  }).then(r => r.json());

  lowerA1 = showData3.show.tickets.lower?.A?.['1'];
  balconyA1 = showData3.show.tickets.balcony?.A?.['1'];
  middleA1 = showData3.show.tickets.middle?.A?.['1'];

  console.log(`lower.A.1   status: "${lowerA1}" (Expected: "available")`);
  console.log(`balcony.A.1 status: "${balconyA1}" (Expected: "booked")`);
  console.log(`middle.A.1  status: "${middleA1}" (Expected: "available")`);

  if (lowerA1 !== 'available') throw new Error(`Lower A1 should be available after cancel, got: ${lowerA1}`);
  if (balconyA1 !== 'booked') throw new Error(`Balcony A1 was incorrectly released when Lower A1 was cancelled!`);
  if (middleA1 !== 'available') throw new Error(`Middle A1 corrupted`);
  console.log('✅ PASS: Cancelling Lower A1 freed ONLY Lower A1. Balcony A1 remained booked!');

  // =========================================================================
  // SCENARIO 4: VERIFY COMPOSITE DATABASE CONSTRAINTS
  // =========================================================================
  console.log('\n--- Scenario 4: Database Unique Constraint Validation ---');

  // Verify that two seats with row A, col 1 in different tiers can coexist in SeatLock
  const testLockLower = await SeatLock.create({
    showId: 'test-constraint-show',
    seatId: 'lower-A-1',
    tier: 'lower',
    tierId: 'lower',
    sectionId: 'lower',
    row: 'A',
    col: '1',
    seatNumber: '1',
    status: 'LOCKED',
    lockedBy: 'test@imovies.com',
    lockExpiry: new Date(Date.now() + 60000)
  });

  const testLockBalcony = await SeatLock.create({
    showId: 'test-constraint-show',
    seatId: 'balcony-A-1',
    tier: 'balcony',
    tierId: 'balcony',
    sectionId: 'balcony',
    row: 'A',
    col: '1',
    seatNumber: '1',
    status: 'LOCKED',
    lockedBy: 'test@imovies.com',
    lockExpiry: new Date(Date.now() + 60000)
  });

  console.log('Inserted lower-A-1 and balcony-A-1 into SeatLock successfully without collision.');

  // Now verify that attempting duplicate insertion within the SAME tier fails
  let duplicateThrew = false;
  try {
    await SeatLock.create({
      showId: 'test-constraint-show',
      seatId: 'lower-A-1',
      tier: 'lower',
      row: 'A',
      col: '1',
      status: 'LOCKED',
      lockedBy: 'intruder@imovies.com',
      lockExpiry: new Date(Date.now() + 60000)
    });
  } catch (err) {
    duplicateThrew = err.code === 11000;
  }

  await SeatLock.deleteMany({ showId: 'test-constraint-show' });

  if (!duplicateThrew) {
    throw new Error('FAIL: Database failed to reject duplicate seat lock within the same tier!');
  }
  console.log('✅ PASS: Composite unique constraint strictly blocks intra-tier duplicate while permitting identical rows across tiers!');

  console.log('\n🎉 ALL SEAT COLLISION AND TIER SCOPING TESTS PASSED PERFECTLY! 🚀');
  await mongoose.disconnect();
  process.exit(0);
}

runSeatCollisionTests().catch(err => {
  console.error('\n❌ Seat Collision Test Failed:', err);
  process.exit(1);
});
