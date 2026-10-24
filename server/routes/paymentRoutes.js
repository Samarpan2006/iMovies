const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment
} = require('../controllers/paymentController');
const fetchUser = require('../middlewares/fetchUser');

router.post('/create-order', fetchUser, createOrder);
router.post('/verify', fetchUser, verifyPayment);

module.exports = router;
