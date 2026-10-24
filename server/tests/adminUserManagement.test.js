const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const assert = require('assert');
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'imovies_jwt_secret_2024_secure_key';

async function runAdminUserManagementTests() {
  console.log('🧪 Starting Admin Registered Users Management & Deletion Test Suite...\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/imovies');

  const User = require('../models/userModel');
  const Admin = require('../models/adminModel');
  const Booking = require('../models/bookingModel');

  // Setup Admin user
  let admin = await Admin.findOne({ email: 'admin@imovies.com' });
  if (!admin) {
    admin = await Admin.create({
      username: 'admin',
      email: 'admin@imovies.com',
      password: 'adminpassword123'
    });
  }

  const adminToken = jwt.sign(
    { id: admin._id, email: admin.email, username: admin.username, isAdmin: true },
    JWT_SECRET
  );

  // Setup Regular user
  let regularUser = await User.findOne({ email: 'regular@test.com' });
  if (!regularUser) {
    regularUser = await User.create({
      username: 'regulartest',
      email: 'regular@test.com',
      password: 'password123',
      role: 'user'
    });
  }

  const regularToken = jwt.sign(
    { id: regularUser._id, email: regularUser.email, username: regularUser.username, isAdmin: false },
    JWT_SECRET
  );

  // Create a disposable user to test deletion
  const testDisposableEmail = `disposable_${Date.now()}@test.com`;
  const disposableUser = await User.create({
    username: `disp_${Date.now()}`,
    email: testDisposableEmail,
    password: 'password123',
    role: 'user'
  });
  console.log(`Created temporary test user: ${disposableUser.username} (${disposableUser._id})`);

  // Initial user count
  const initialCount = await User.countDocuments();
  console.log(`Initial User Count in DB: ${initialCount}`);

  // Test 1: Fetch all users via Admin API
  console.log('\n--- Test 1: GET /api/admin/users ---');
  const usersRes = await axios.get(`${API_BASE}/admin/users`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(usersRes.status, 200, 'GET /admin/users should return 200');
  assert.ok(usersRes.data.success, 'Response success should be true');
  assert.ok(Array.isArray(usersRes.data.users), 'Users should be an array');
  
  const foundDisposable = usersRes.data.users.find(u => String(u._id) === String(disposableUser._id));
  assert.ok(foundDisposable, 'Disposable test user should be listed');
  assert.ok(foundDisposable.username, 'User should have username');
  assert.ok(foundDisposable.email, 'User should have email');
  assert.ok(foundDisposable.createdAt, 'User should have registration date');
  assert.strictEqual(typeof foundDisposable.bookingsCount, 'number', 'User should have bookingsCount');
  console.log(`✅ PASS: Retrieved ${usersRes.data.users.length} users with full identity details and booking counts.`);

  // Test 2: Regular user cannot access DELETE /api/admin/users/:userId
  console.log('\n--- Test 2: RBAC Security Guard on DELETE /api/admin/users/:userId ---');
  try {
    await axios.delete(`${API_BASE}/admin/users/${disposableUser._id}`, {
      headers: { Authorization: `Bearer ${regularToken}` }
    });
    assert.fail('Regular user should not be able to delete users (expected 403)');
  } catch (err) {
    assert.strictEqual(err.response?.status, 403, 'Regular user deletion attempt must return 403 Forbidden');
    console.log('✅ PASS: Unauthorized user blocked with 403 Forbidden.');
  }

  // Test 3: Admin successfully deletes the user
  console.log('\n--- Test 3: Admin deletes user via DELETE /api/admin/users/:userId ---');
  const deleteRes = await axios.delete(`${API_BASE}/admin/users/${disposableUser._id}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(deleteRes.status, 200, 'Delete request should return 200');
  assert.ok(deleteRes.data.success, 'Delete response success should be true');
  assert.strictEqual(deleteRes.data.totalUsers, initialCount - 1, 'totalUsers in response should be decremented');

  // Verify deletion directly in MongoDB
  const postDeleteDbCheck = await User.findById(disposableUser._id);
  assert.strictEqual(postDeleteDbCheck, null, 'User should no longer exist in MongoDB');
  console.log(`✅ PASS: User successfully removed from MongoDB. New count: ${deleteRes.data.totalUsers}`);

  // Test 4: Dashboard stats reflect the updated user count
  console.log('\n--- Test 4: Verify GET /api/admin/stats metric synchronization ---');
  const statsRes = await axios.get(`${API_BASE}/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(statsRes.status, 200);
  assert.strictEqual(statsRes.data.stats.totalUsers, initialCount - 1, 'Stats totalUsers must match DB count');
  console.log(`✅ PASS: Dashboard stats accurately reflect ${statsRes.data.stats.totalUsers} registered users.`);

  // Cleanup
  await User.deleteOne({ email: 'regular@test.com' });

  console.log('\n🎉 ALL ADMIN REGISTERED USERS MANAGEMENT TESTS PASSED PERFECTLY!');
  process.exit(0);
}

runAdminUserManagementTests().catch((err) => {
  console.error('❌ Test failed:', err.message, err.response?.data);
  process.exit(1);
});
