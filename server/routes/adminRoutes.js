const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllTransactions,
  refundPayment,
  getAllUsers,
  deleteUser
} = require('../controllers/adminController');
const { createAdmin } = require('../controllers/authController');
const fetchUser = require('../middlewares/fetchUser');
const isAdmin = require('../middlewares/isAdmin');

router.get('/stats', fetchUser, isAdmin, getDashboardStats);
router.get('/transactions', fetchUser, isAdmin, getAllTransactions);
router.post('/refund/:paymentId', fetchUser, isAdmin, refundPayment);
router.get('/users', fetchUser, isAdmin, getAllUsers);
router.delete('/users/:userId', fetchUser, isAdmin, deleteUser);

// Secure protected admin creation route for dashboard
router.post('/create-admin', fetchUser, isAdmin, createAdmin);

module.exports = router;
