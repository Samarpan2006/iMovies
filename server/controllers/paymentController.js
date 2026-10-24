const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/bookingModel');
const Show = require('../models/showModel');
const SeatLock = require('../models/seatLockModel');
const { parseSeatIdentifier } = require('../utils/seatHelper');
const { sendBookingConfirmation } = require('../services/emailService');
const { runWithTransaction } = require('../utils/transactionHelper');

const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_TpQ7mg5jyDRTt0',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '5OtY3b29pz3FK1KukmSiZqmS'
  });
};

/**
 * Create Gateway Payment Order
 * Resolves Issue 2 (Price Tampering):
 * - Removes any trust in client-supplied `amount` parameter
 * - Requires verified `bookingId` and extracts authoritative `booking.totalAmount` from the database
 */
exports.createOrder = async (req, res) => {
  try {
    const { bookingId, currency = 'INR' } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required to generate payment order.' });
    }

    const booking = await Booking.findOne({
      bookingId,
      ...(req.user?.isAdmin ? {} : { userEmail: req.user.email })
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found or unauthorized.' });
    }

    if (booking.paymentStatus === 'Completed') {
      return res.status(400).json({ success: false, message: 'Booking has already been completed and paid.' });
    }

    if (booking.status === 'CANCELLED' || booking.status === 'REFUNDED') {
      return res.status(400).json({ success: false, message: 'Cannot create payment order for an inactive booking.' });
    }

    // Authoritative server-side price from the verified booking:
    const authoritativeAmount = Number(booking.totalAmount);
    if (!authoritativeAmount || authoritativeAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Calculated booking amount must be greater than zero.'
      });
    }

    const razorpay = getRazorpayInstance();
    const options = {
      amount: Math.round(authoritativeAmount * 100), // convert to paise
      currency,
      receipt: booking.bookingId,
      payment_capture: 1,
      notes: {
        bookingId: booking.bookingId,
        userEmail: booking.userEmail,
        movieName: booking.movieName || 'Movie'
      }
    };

    const order = await razorpay.orders.create(options);

    // Persist razorpay order ID on booking
    booking.razorpayOrderId = order.id;
    await booking.save();

    return res.json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_TpQ7mg5jyDRTt0',
      authoritativeAmount
    });
  } catch (err) {
    console.error('Razorpay Create Order Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create Razorpay payment order.',
      error: err.message
    });
  }
};

/**
 * Verify Payment and Finalize Booking
 * Resolves:
 * - Issue 1 (Shared Seat Names): Updates seats strictly within their specific tier/section
 * - Issue 3 (Double Booking Race Condition): Executes within an atomic database transaction
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
      return res.status(400).json({ success: false, message: 'Missing payment signature verification parameters.' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || '5OtY3b29pz3FK1KukmSiZqmS';
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Cryptographic signature mismatch. Unauthorized transaction.' });
    }

    return await runWithTransaction(async (session) => {
      const bookingQuery = Booking.findOne({ bookingId });
      if (session) bookingQuery.session(session);
      const booking = await bookingQuery;

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Referenced booking not found.' });
      }

      // Idempotency: If already confirmed, return immediately
      if (booking.paymentStatus === 'Completed') {
        return res.json({
          success: true,
          message: 'Payment verified and booking confirmed.',
          booking
        });
      }

      const parsedSeats = (booking.selectedSeats || []).map(parseSeatIdentifier);
      const compositeSeatIds = parsedSeats.map((s) => s.seatId);

      // Double Booking Concurrency Check
      const lockQuery = SeatLock.find({
        showId: booking.showId,
        seatId: { $in: compositeSeatIds },
        status: 'BOOKED',
        bookingId: { $ne: booking.bookingId }
      });
      if (session) lockQuery.session(session);
      const conflictingLocks = await lockQuery;

      if (conflictingLocks.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Double booking conflict detected: One or more requested seats were already booked by another customer.'
        });
      }

      // Mark seats as permanently BOOKED in SeatLock table
      for (const seat of parsedSeats) {
        await SeatLock.findOneAndUpdate(
          { showId: booking.showId, seatId: seat.seatId },
          {
            showId: booking.showId,
            seatId: seat.seatId,
            tier: seat.tier,
            tierId: seat.tier,
            sectionId: seat.tier,
            row: seat.row,
            col: seat.col,
            seatNumber: seat.col,
            status: 'BOOKED',
            lockedBy: booking.userEmail,
            bookingId: booking.bookingId,
            lockExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
          },
          { upsert: true, session: session || undefined }
        );
      }

      // Update Show.tickets strictly for each seat's specific tier
      const showQuery = Show.findOne({ showId: booking.showId });
      if (session) showQuery.session(session);
      const show = await showQuery;

      if (show && show.tickets) {
        const tickets = show.tickets;
        for (const seat of parsedSeats) {
          if (tickets[seat.tier] && tickets[seat.tier][seat.row] && tickets[seat.tier][seat.row][seat.col]) {
            tickets[seat.tier][seat.row][seat.col] = 'booked';
          }
        }
        show.tickets = tickets;
        show.markModified('tickets');
        await show.save(session ? { session } : undefined);
      }

      // Update Booking record
      booking.paymentStatus = 'Completed';
      booking.status = 'ACTIVE';
      booking.qrCodeData = `IMOVE-PASS-${booking.bookingId}-${Date.now()}`;
      booking.razorpayOrderId = razorpay_order_id;
      booking.razorpayPaymentId = razorpay_payment_id;
      booking.razorpaySignature = razorpay_signature;
      await booking.save(session ? { session } : undefined);

      // Real-time broadcast
      const io = req.app.get('io');
      if (io) {
        io.to(`show-${booking.showId}`).emit('seat-status-update', {
          showId: booking.showId,
          bookedSeats: compositeSeatIds
        });
      }

      // Asynchronous confirmation email
      try {
        let posterForEmail = booking.moviePoster;
        if (!posterForEmail && booking.showId) {
          try {
            const Show = require('../models/showModel');
            const showDoc = await Show.findOne({ showId: booking.showId });
            if (showDoc && showDoc.movieId) {
              const Movie = require('../models/movieModel');
              const movieDoc = await Movie.findOne({
                $or: [
                  { _id: mongoose.isValidObjectId(showDoc.movieId) ? showDoc.movieId : null },
                  { tmdbId: String(showDoc.movieId) }
                ]
              });
              if (movieDoc && movieDoc.posterPath) {
                posterForEmail = movieDoc.posterPath;
              }
            }
          } catch (_) {}
        }

        const seatLabels = parsedSeats.map((s) => s.label);
        const seatWithTier = parsedSeats.map((s) => `${s.label} (${s.tier.charAt(0).toUpperCase() + s.tier.slice(1)})`);

        await sendBookingConfirmation({
          to: booking.userEmail,
          userEmail: booking.userEmail,
          userName: booking.userName,
          bookingId: booking.bookingId,
          movieName: booking.movieName,
          moviePoster: posterForEmail,
          theatreName: booking.theatreName || 'Antigravity Cinemas Multiplex',
          showDate: booking.showDate,
          showTime: booking.showTime,
          selectedSeats: seatLabels,
          seatDisplayList: seatWithTier,
          totalAmount: booking.totalAmount,
          paymentStatus: booking.paymentStatus || 'Completed',
          loginUrl: 'https://i-movies-theta.vercel.app/login'
        });
      } catch (eErr) {
        console.warn('Booking confirmation email sending error:', eErr.message);
      }

      return res.json({
        success: true,
        message: 'Payment verified and booking confirmed.',
        booking
      });
    });
  } catch (err) {
    console.error('Payment Verification Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Payment verification failed.',
      error: err.message
    });
  }
};
