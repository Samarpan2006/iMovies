const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'imovies_jwt_secret_2024_secure_key';

async function runSecurityTests() {
  console.log('🛡️  Starting iMovies Security & Architecture Integration Tests...\n');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/imovies');

  const Booking = require('../models/bookingModel');
  const Show = require('../models/showModel');
  const Theatre = require('../models/theatreModel');
  const User = require('../models/userModel');
  const Admin = require('../models/adminModel');
  const SeatLock = require('../models/seatLockModel');

  // Ensure demo user exists
  let user = await User.findOne({ email: 'demo@imovies.com' });
  if (!user) {
    user = await User.create({
      username: 'demouser',
      email: 'demo@imovies.com',
      password: 'demopassword123',
      role: 'user'
    });
  }

  // Ensure second demo user exists for concurrency test
  let competitor = await User.findOne({ email: 'competitor@imovies.com' });
  if (!competitor) {
    competitor = await User.create({
      username: 'competitor',
      email: 'competitor@imovies.com',
      password: 'competitorpassword123',
      role: 'user'
    });
  }

  // Ensure admin exists
  let admin = await Admin.findOne({ email: 'admin@imovies.com' });
  if (!admin) {
    admin = await Admin.create({
      username: 'adminuser',
      email: 'admin@imovies.com',
      password: 'adminpassword123'
    });
  }

  const userToken = jwt.sign(
    { id: user._id, email: user.email, username: user.username, isAdmin: false },
    JWT_SECRET
  );

  const competitorToken = jwt.sign(
    { id: competitor._id, email: competitor.email, username: competitor.username, isAdmin: false },
    JWT_SECRET
  );

  const adminToken = jwt.sign(
    { id: admin._id, email: admin.email, username: admin.username, isAdmin: true },
    JWT_SECRET
  );

  let show = await Show.findOne();
  if (!show) {
    throw new Error('No show found in database to execute tests on.');
  }

  // Ensure show is in the future for testing
  show.showDate = dayjs().add(2, 'day').format('YYYY-MM-DD');
  show.showTime = '08:30 PM';
  await show.save();

  let theatre = await Theatre.findOne({ theatreId: show.theatreId });
  if (!theatre) {
    throw new Error(`Theatre ${show.theatreId} not found.`);
  }

  console.log(`Using Test Show: ${show.showId} at Theatre: ${theatre.theatreName}`);
  console.log(`Pricing: Balcony=₹${theatre.balconySeatPrice}, Middle=₹${theatre.middleSeatPrice}, Lower=₹${theatre.lowerSeatPrice}`);

  // =========================================================================
  // TEST 1: SHARED SEAT NAMES ACROSS TIERS (SEAT COLLISION PREVENTED)
  // =========================================================================
  console.log('\n============================================================');
  console.log('TEST 1: Shared Seat Names Across Tiers (No Seat Collision)');
  console.log('============================================================');

  // Clean any existing test locks and previous test bookings for clean state
  await SeatLock.deleteMany({ showId: show.showId });
  await Booking.deleteMany({ showId: show.showId });

  // Reset show tickets state for seat A1 across tiers
  if (show.tickets && show.tickets.lower && show.tickets.lower.A) show.tickets.lower.A['1'] = 'available';
  if (show.tickets && show.tickets.balcony && show.tickets.balcony.A) show.tickets.balcony.A['1'] = 'available';
  if (show.tickets && show.tickets.middle && show.tickets.middle.A) show.tickets.middle.A['1'] = 'available';
  show.markModified('tickets');
  await show.save();

  // Create booking specifically for LOWER tier A1: "lower-A-1"
  const seatCollisionBookingId = `collision-test-${Date.now()}`;
  const booking1Res = await fetch(`${API_BASE}/bookings/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'auth-token': userToken
    },
    body: JSON.stringify({
      showId: show.showId,
      movieName: 'Collision Test Movie',
      theatreName: theatre.theatreName,
      showDate: show.showDate,
      showTime: show.showTime,
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
          number: '1',
          col: '1',
          label: 'A1'
        }
      ],
      ticketsData: { 'lower-A-1': { tier: 'lower', row: 'A', col: 1 } },
      totalAmount: 99999 // intentionally client spoofed
    })
  }).then(r => r.json());

  if (!booking1Res.success) {
    throw new Error(`Booking creation failed: ${JSON.stringify(booking1Res)}`);
  }

  // Directly verify payment completion to mark as BOOKED in show
  const crypto = require('crypto');
  const secret = process.env.RAZORPAY_KEY_SECRET || '5OtY3b29pz3FK1KukmSiZqmS';
  const orderId = `order_col_${Date.now()}`;
  const paymentId = `pay_col_${Date.now()}`;
  const signature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

  const verifyRes = await fetch(`${API_BASE}/payment/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'auth-token': userToken
    },
    body: JSON.stringify({
      bookingId: booking1Res.bookingId,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    })
  }).then(r => r.json());

  if (!verifyRes.success) {
    throw new Error(`Payment verification failed: ${JSON.stringify(verifyRes)}`);
  }

  // Refetch show layout from API
  const showLayoutRes = await fetch(`${API_BASE}/shows/${show.showId}`, {
    headers: { 'auth-token': userToken }
  }).then(r => r.json());

  const refreshedTickets = showLayoutRes.show.tickets;
  const lowerA1Status = refreshedTickets?.lower?.A?.['1'];
  const balconyA1Status = refreshedTickets?.balcony?.A?.['1'];
  const middleA1Status = refreshedTickets?.middle?.A?.['1'];

  console.log(`Status of lower-A-1   -> ${JSON.stringify(lowerA1Status)}`);
  console.log(`Status of balcony-A-1 -> ${JSON.stringify(balconyA1Status)}`);
  console.log(`Status of middle-A-1  -> ${JSON.stringify(middleA1Status)}`);

  if (lowerA1Status !== 'booked') {
    throw new Error(`FAIL: Lower A1 was not marked booked! Status is: ${lowerA1Status}`);
  }

  if (balconyA1Status !== 'available') {
    throw new Error(`FAIL: Balcony A1 was incorrectly marked booked when Lower A1 was booked!`);
  }
  if (middleA1Status !== 'available') {
    throw new Error(`FAIL: Middle A1 was incorrectly marked booked when Lower A1 was booked!`);
  }
  console.log('✅ PASS: Composite seat identification strictly isolates tiers. No seat collision occurred.');

  // =========================================================================
  // TEST 2: PRICE TAMPERING PREVENTION (₹1 TICKET EXPLOIT BLOCKED)
  // =========================================================================
  console.log('\n============================================================');
  console.log('TEST 2: Price Tampering Prevention (Server-Authoritative Pricing)');
  console.log('============================================================');

  // Attempt to book 2 Balcony seats with client claiming totalAmount: 1
  const tamperBookingRes = await fetch(`${API_BASE}/bookings/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'auth-token': userToken
    },
    body: JSON.stringify({
      showId: show.showId,
      movieName: 'Price Tamper Movie',
      theatreName: theatre.theatreName,
      showDate: show.showDate,
      showTime: show.showTime,
      selectedSeats: ['balcony-B-2', 'balcony-B-3'],
      ticketsData: {
        'balcony-B-2': { tier: 'balcony', row: 'B', col: 2 },
        'balcony-B-3': { tier: 'balcony', row: 'B', col: 3 }
      },
      totalAmount: 1 // Attempting ₹1 exploit!
    })
  }).then(r => r.json());

  const expectedBalconyTotal = theatre.balconySeatPrice * 2;
  console.log(`Client sent tampered amount: ₹1`);
  console.log(`Server stored amount in booking: ₹${tamperBookingRes.booking.totalAmount}`);
  console.log(`Expected DB calculated amount: ₹${expectedBalconyTotal}`);

  if (tamperBookingRes.booking.totalAmount === 1) {
    throw new Error('FAIL: Backend trusted client totalAmount ₹1!');
  }
  if (tamperBookingRes.booking.totalAmount !== expectedBalconyTotal) {
    throw new Error(`FAIL: Expected ₹${expectedBalconyTotal}, but server stored ₹${tamperBookingRes.booking.totalAmount}`);
  }

  // Now test Razorpay order creation to ensure server charges booking.totalAmount, NOT client amount
  const orderRes = await fetch(`${API_BASE}/payment/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'auth-token': userToken
    },
    body: JSON.stringify({
      bookingId: tamperBookingRes.bookingId,
      amount: 1 // Malicious client sends 1 again
    })
  }).then(r => r.json());

  console.log(`Razorpay order amount generated: ₹${orderRes.order.amount / 100}`);
  if (orderRes.order.amount / 100 !== expectedBalconyTotal) {
    throw new Error(`FAIL: Razorpay order charged ₹${orderRes.order.amount / 100} instead of authoritative ₹${expectedBalconyTotal}`);
  }
  console.log('✅ PASS: Server authoritative pricing enforces correct database tier prices and completely ignores client-supplied amounts.');

  // =========================================================================
  // TEST 3: DOUBLE BOOKING RACE CONDITION PREVENTION (CONCURRENCY CONTROL)
  // =========================================================================
  console.log('\n============================================================');
  console.log('TEST 3: Double Booking Race Condition (ACID Concurrency Control)');
  console.log('============================================================');

  // Seat to contend for: "middle-C-5"
  const contestedSeat = 'middle-C-5';
  await SeatLock.deleteMany({ showId: show.showId, seatId: contestedSeat });

  console.log(`Launching 2 concurrent simultaneous lock requests for ${contestedSeat}...`);

  const [req1, req2] = await Promise.all([
    fetch(`${API_BASE}/bookings/lock-seats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'auth-token': userToken
      },
      body: JSON.stringify({
        showId: show.showId,
        selectedSeats: [contestedSeat],
        tier: 'middle',
        userEmail: user.email
      })
    }),
    fetch(`${API_BASE}/bookings/lock-seats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'auth-token': competitorToken
      },
      body: JSON.stringify({
        showId: show.showId,
        selectedSeats: [contestedSeat],
        tier: 'middle',
        userEmail: competitor.email
      })
    })
  ]);

  const status1 = req1.status;
  const status2 = req2.status;
  const data1 = await req1.json();
  const data2 = await req2.json();

  console.log(`Request 1 (User A) status: ${status1} -> ${JSON.stringify(data1)}`);
  console.log(`Request 2 (User B) status: ${status2} -> ${JSON.stringify(data2)}`);

  const successCount = (status1 === 200 ? 1 : 0) + (status2 === 200 ? 1 : 0);
  const conflictCount = (status1 === 409 ? 1 : 0) + (status2 === 409 ? 1 : 0);

  if (successCount !== 1 || conflictCount !== 1) {
    throw new Error(`FAIL: Concurrency race condition permitted duplicate seat lock! (Successes: ${successCount}, Conflicts: ${conflictCount})`);
  }
  console.log('✅ PASS: Exactly 1 request acquired atomic lock; second request received 409 Conflict. Zero race condition!');

  // =========================================================================
  // TEST 4: ADMIN PAGE BYPASS PREVENTION (SERVER-SIDE AUTHORIZATION)
  // =========================================================================
  console.log('\n============================================================');
  console.log('TEST 4: Admin Page Bypass Prevention (Server-Side RBAC)');
  console.log('============================================================');

  // Regular user attempts to access /api/auth/validate-admin
  const userAdminCheck = await fetch(`${API_BASE}/auth/validate-admin`, {
    headers: { 'auth-token': userToken }
  });
  console.log(`User attempting admin validation endpoint -> Status: ${userAdminCheck.status}`);
  if (userAdminCheck.status !== 403) {
    throw new Error(`FAIL: Regular user was not rejected with 403 Forbidden! Got status: ${userAdminCheck.status}`);
  }

  // Regular user attempts to access admin dashboard stats
  const userStatsCheck = await fetch(`${API_BASE}/admin/stats`, {
    headers: { 'auth-token': userToken }
  });
  console.log(`User attempting /api/admin/stats -> Status: ${userStatsCheck.status}`);
  if (userStatsCheck.status !== 403) {
    throw new Error(`FAIL: Regular user accessed /api/admin/stats! Got status: ${userStatsCheck.status}`);
  }

  // Admin attempts to access /api/auth/validate-admin
  const adminCheck = await fetch(`${API_BASE}/auth/validate-admin`, {
    headers: { 'auth-token': adminToken }
  });
  const adminCheckData = await adminCheck.json();
  console.log(`Admin user accessing admin validation endpoint -> Status: ${adminCheck.status}, isAdmin: ${adminCheckData.isAdmin}`);
  if (adminCheck.status !== 200 || !adminCheckData.isAdmin) {
    throw new Error('FAIL: Valid admin user failed admin validation endpoint.');
  }

  // Admin access to dashboard stats
  const adminStatsCheck = await fetch(`${API_BASE}/admin/stats`, {
    headers: { 'auth-token': adminToken }
  });
  console.log(`Admin accessing /api/admin/stats -> Status: ${adminStatsCheck.status}`);
  if (adminStatsCheck.status !== 200) {
    throw new Error('FAIL: Valid admin could not access admin stats.');
  }

  console.log('✅ PASS: Server-side database RBAC blocks regular users with 403 Forbidden and only admits verified database admins.');

  console.log('\n🎉 ALL 4 SECURITY AND ARCHITECTURE TESTS PASSED SUCCESSFULLY! 🚀');
  await mongoose.disconnect();
  process.exit(0);
}

runSecurityTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
