const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'imovies_jwt_secret_2024_secure_key';

async function runTicketLifecycleTests() {
  console.log('🚀 Starting iMovies Ticket Invalidation & Lifecycle Integration Tests...');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/imovies');

  const Booking = require('../models/bookingModel');
  const Show = require('../models/showModel');
  const User = require('../models/userModel');

  const user = await User.findOne({ email: 'demo@imovies.com' });
  if (!user) throw new Error('Demo user not found in database.');

  const token = jwt.sign(
    { id: user._id, email: user.email, username: user.username, isAdmin: false },
    JWT_SECRET
  );

  const Admin = require('../models/adminModel');
  let admin = await Admin.findOne({ email: 'admin@imovies.com' });
  if (!admin) {
    admin = await Admin.create({ username: 'admin', email: 'admin@imovies.com', password: 'adminpassword123' });
  }

  const adminToken = jwt.sign(
    { id: admin._id, email: admin.email, username: admin.username, isAdmin: true },
    JWT_SECRET
  );

  const show = await Show.findOne();
  if (!show) throw new Error('No showtime found to bind test bookings.');

  // ==========================================
  // TEST SUITE 1: USER CANCELLATION FLOW
  // ==========================================
  console.log('\n--- Running Test Suite 1: User Ticket Cancellation ---');
  const cancelTestBookingId = `test-cancel-${Date.now()}`;
  await Booking.create({
    bookingId: cancelTestBookingId,
    userEmail: user.email,
    showId: show.showId,
    movieName: 'Lifecycle Test Movie',
    theatreName: show.theatreName,
    showDate: show.showDate,
    showTime: show.showTime,
    ticketsData: { seats: ['A1', 'A2'] },
    selectedSeats: ['A1', 'A2'],
    totalAmount: 600,
    paymentStatus: 'Completed',
    status: 'ACTIVE',
    qrCodeData: `IMOVE-${cancelTestBookingId}`
  });

  // Verify it appears in active filter
  const activeRes1 = await fetch(`${API_BASE}/bookings/user?filter=active`, {
    headers: { 'auth-token': token }
  }).then((r) => r.json());
  const foundActive1 = activeRes1.bookings.some((b) => b.bookingId === cancelTestBookingId);
  console.log(`[PASS] Ticket appears in active tickets before cancellation: ${foundActive1}`);
  if (!foundActive1) throw new Error('Active ticket not listed in active filter.');

  // Cancel the ticket
  const cancelRes = await fetch(`${API_BASE}/bookings/cancel/${cancelTestBookingId}`, {
    method: 'POST',
    headers: { 'auth-token': token }
  }).then((r) => r.json());
  console.log(`[PASS] Cancellation endpoint succeeded: ${cancelRes.success}, status: ${cancelRes.booking?.status}`);
  if (!cancelRes.success || cancelRes.booking?.status !== 'CANCELLED') {
    throw new Error('Failed to cancel ticket properly.');
  }

  // Verify it is excluded from active tickets
  const activeRes2 = await fetch(`${API_BASE}/bookings/user?filter=active`, {
    headers: { 'auth-token': token }
  }).then((r) => r.json());
  const foundActive2 = activeRes2.bookings.some((b) => b.bookingId === cancelTestBookingId);
  console.log(`[PASS] Ticket excluded from active list post-cancellation: ${!foundActive2}`);
  if (foundActive2) throw new Error('Cancelled ticket still appears in active list.');

  // Verify direct view endpoint returns invalidated state and no live QR
  const directCancelRes = await fetch(`${API_BASE}/bookings/${cancelTestBookingId}`, {
    headers: { 'auth-token': token }
  }).then((r) => r.json());
  const bCancel = directCancelRes.booking;
  console.log(`[PASS] Direct access: isActive=${bCancel?.isActive}, qrCodeUrl=${bCancel?.qrCodeUrl}, validation=${bCancel?.validationStatus}`);
  if (bCancel?.isActive || bCancel?.qrCodeUrl !== null || bCancel?.validationStatus !== 'CANCELLED_VOID') {
    throw new Error('Cancelled ticket assets not invalidated.');
  }

  await Booking.deleteOne({ bookingId: cancelTestBookingId });

  // ==========================================
  // TEST SUITE 2: ADMIN REFUND FLOW
  // ==========================================
  console.log('\n--- Running Test Suite 2: Admin Ticket Refund ---');
  const refundTestBookingId = `test-refund-${Date.now()}`;
  await Booking.create({
    bookingId: refundTestBookingId,
    razorpayPaymentId: `mock_pay_${Date.now()}`,
    userEmail: user.email,
    showId: show.showId,
    movieName: 'Refund Test Movie',
    theatreName: show.theatreName,
    showDate: show.showDate,
    showTime: show.showTime,
    ticketsData: { seats: ['B5'] },
    selectedSeats: ['B5'],
    totalAmount: 350,
    paymentStatus: 'Completed',
    status: 'ACTIVE',
    qrCodeData: `IMOVE-${refundTestBookingId}`
  });

  // Admin issues refund
  const refundRes = await fetch(`${API_BASE}/admin/refund/${refundTestBookingId}`, {
    method: 'POST',
    headers: { 'auth-token': adminToken }
  }).then((r) => r.json());
  console.log(`[PASS] Refund endpoint succeeded: ${refundRes.success}, status: ${refundRes.booking?.status}`);
  if (!refundRes.success || refundRes.booking?.status !== 'REFUNDED') {
    throw new Error('Failed to refund ticket properly.');
  }

  // Verify excluded from user's active tickets
  const activeRes3 = await fetch(`${API_BASE}/bookings/user?filter=active`, {
    headers: { 'auth-token': token }
  }).then((r) => r.json());
  const foundActive3 = activeRes3.bookings.some((b) => b.bookingId === refundTestBookingId);
  console.log(`[PASS] Ticket excluded from active list post-refund: ${!foundActive3}`);
  if (foundActive3) throw new Error('Refunded ticket still appears in active list.');

  // Verify direct view endpoint returns refunded void state
  const directRefundRes = await fetch(`${API_BASE}/bookings/${refundTestBookingId}`, {
    headers: { 'auth-token': token }
  }).then((r) => r.json());
  const bRefund = directRefundRes.booking;
  console.log(`[PASS] Direct access: isActive=${bRefund?.isActive}, qrCodeUrl=${bRefund?.qrCodeUrl}, validation=${bRefund?.validationStatus}`);
  if (bRefund?.isActive || bRefund?.qrCodeUrl !== null || bRefund?.validationStatus !== 'REFUNDED_VOID') {
    throw new Error('Refunded ticket assets not invalidated.');
  }

  await Booking.deleteOne({ bookingId: refundTestBookingId });

  console.log('\n🎉 ALL LIFECYCLE & TICKET INVALIDATION TESTS COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

runTicketLifecycleTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
