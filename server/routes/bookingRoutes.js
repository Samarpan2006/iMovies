const express = require('express');
const router = express.Router();
const {
  lockSeats,
  createBooking,
  getUserBookings,
  getBookingById,
  getPublicTicketPass,
  downloadTicketPdf,
  cancelBooking,
  getAllBookings
} = require('../controllers/bookingController');
const fetchUser = require('../middlewares/fetchUser');
const isAdmin = require('../middlewares/isAdmin');

// Public/direct pass and PDF download routes (for WhatsApp sharing and direct entry access)
router.get('/:bookingId/pdf', downloadTicketPdf);
router.get('/ticket/:bookingId/pdf', downloadTicketPdf);
router.get('/pass/:bookingId', getPublicTicketPass);
router.get('/public/:bookingId', getPublicTicketPass);

// Authenticated booking management routes
router.post('/lock-seats', fetchUser, lockSeats);
router.post('/create', fetchUser, createBooking);
router.get('/user', fetchUser, getUserBookings);
router.get('/all', fetchUser, isAdmin, getAllBookings);
router.get('/:bookingId', fetchUser, getBookingById);
router.post('/cancel/:bookingId', fetchUser, cancelBooking);

module.exports = router;

