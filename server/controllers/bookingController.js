const mongoose = require('mongoose');
const Booking = require('../models/bookingModel');
const Show = require('../models/showModel');
const Theatre = require('../models/theatreModel');
const Movie = require('../models/movieModel');
const User = require('../models/userModel');
const SeatLock = require('../models/seatLockModel');
const { toCompositeSeatId, parseSeatIdentifier, formatSeatDisplay } = require('../utils/seatHelper');
const { isShowtimePast } = require('../utils/timeHelper');
const { generateTicketPdf } = require('../services/pdfTicketService');
const { runWithTransaction } = require('../utils/transactionHelper');
const { v4: uuidv4 } = require('uuid');

const LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes temporary seat lock

/**
 * 1. Lock Seats with Concurrency Control & Tier Isolation
 * Resolves:
 * - Race conditions via MongoDB transactions and SeatLock unique compound indexes
 * - Cross-tier seat collisions by enforcing composite unique keys (`tier:row:col`)
 */
exports.lockSeats = async (req, res) => {
  try {
    const { showId, selectedSeats, userEmail } = req.body;
    const email = userEmail || req.user?.email;

    if (!showId || !selectedSeats || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid seat selection or show parameters.' });
    }

    if (!email) {
      return res.status(401).json({ success: false, message: 'User identification required to lock seats.' });
    }

    return await runWithTransaction(async (session) => {
      const showQuery = Show.findOne({ showId });
      if (session) showQuery.session(session);
      const show = await showQuery;

      if (!show) {
        return res.status(404).json({ success: false, message: 'Show not found.' });
      }

      // Check whether this showtime on the given date has already passed
      if (isShowtimePast(show.showDate, show.showTime)) {
        return res.status(400).json({
          success: false,
          message: `This screening (${show.showTime} on ${show.showDate}) has already started or concluded. Seat locking is closed.`
        });
      }

      const tickets = show.tickets || {};
      const now = new Date();
      const lockExpiry = new Date(Date.now() + LOCK_TTL_MS);

      // Standardize all incoming seats into composite keys and parsed objects
      const parsedSeats = selectedSeats.map(parseSeatIdentifier);
      const lockedCompositeKeys = [];

      for (const seat of parsedSeats) {
        const { tier, row, col, seatId } = seat;

        // 1. Strict tier/section check in Show auditorium setup
        if (!tickets[tier] || !tickets[tier][row] || !tickets[tier][row][col]) {
          return res.status(400).json({
            success: false,
            message: `Seat ${seatId} does not exist in auditorium setup.`
          });
        }

        // 2. In-memory matrix check on Show
        const currentTicketVal = tickets[tier][row][col];
        if (typeof currentTicketVal === 'string' && currentTicketVal !== 'available') {
          return res.status(409).json({
            success: false,
            message: `Seat ${seatId} is already ${currentTicketVal}.`
          });
        }

        // 3. Database-level concurrency lock check
        const lockQuery = SeatLock.findOne({ showId, seatId });
        if (session) lockQuery.session(session);
        const existingLock = await lockQuery;

        if (existingLock) {
          if (existingLock.status === 'BOOKED') {
            return res.status(409).json({
              success: false,
              message: `Seat ${seatId} has already been booked by another customer.`
            });
          }

          if (
            existingLock.status === 'LOCKED' &&
            existingLock.lockExpiry > now &&
            existingLock.lockedBy !== email
          ) {
            return res.status(409).json({
              success: false,
              message: `Seat ${seatId} is temporarily locked by another customer.`
            });
          }

          // Atomically update existing lock
          existingLock.status = 'LOCKED';
          existingLock.lockedBy = email;
          existingLock.lockExpiry = lockExpiry;
          existingLock.tier = tier;
          existingLock.tierId = tier;
          existingLock.sectionId = tier;
          existingLock.row = row;
          existingLock.col = col;
          existingLock.seatNumber = col;
          await existingLock.save(session ? { session } : undefined);
        } else {
          // Atomically insert new lock. If concurrent requests race, the unique index throws E11000
          await SeatLock.create(
            [
              {
                showId,
                seatId,
                tier,
                tierId: tier,
                sectionId: tier,
                row,
                col,
                seatNumber: col,
                status: 'LOCKED',
                lockedBy: email,
                lockExpiry
              }
            ],
            session ? { session } : {}
          );
        }

        // 5. Update Show ticket status
        tickets[tier][row][col] = {
          status: 'locked',
          lockedBy: email,
          lockExpiry: lockExpiry.getTime()
        };

        lockedCompositeKeys.push(seatId);
      }

      show.tickets = tickets;
      show.markModified('tickets');
      await show.save(session ? { session } : undefined);

      // Broadcast real-time availability update
      const io = req.app.get('io');
      if (io) {
        io.to(`show-${showId}`).emit('seat-status-update', {
          showId,
          lockedSeats: lockedCompositeKeys
        });
      }

      return res.json({
        success: true,
        message: 'Seats locked successfully for checkout.',
        lockedSeats: lockedCompositeKeys,
        lockExpiry: lockExpiry.getTime()
      });
    });
  } catch (err) {
    if (err.code === 11000 || err.name === 'VersionError' || err.message?.includes('WriteConflict') || err.message?.includes('duplicate key')) {
      return res.status(409).json({
        success: false,
        message: 'Seats were locked concurrently by another user. Please choose alternative seats.'
      });
    }
    console.error('Lock seats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to lock seats.', error: err.message });
  }
};

/**
 * 2. Create Booking with Server-Authoritative Price Calculation
 * Resolves:
 * - Price tampering (vulnerability to ₹1 tickets) by strictly computing prices on the server
 * - Cross-tier seat collision by persisting composite keys
 */
exports.createBooking = async (req, res) => {
  try {
    const {
      showId,
      movieName,
      moviePoster,
      userName,
      theatreName,
      showDate,
      showTime,
      selectedSeats
    } = req.body;

    const userEmail = req.user?.email || req.body.userEmail;
    if (!showId || !selectedSeats || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid booking data or seat selection.' });
    }

    // Server-Authoritative Price Calculation
    // Never trust client-supplied totalAmount or ticket prices!
    const show = await Show.findOne({ showId });
    if (!show) {
      return res.status(404).json({ success: false, message: 'Showtime not found.' });
    }

    // Check whether this showtime on the given date has already passed
    if (isShowtimePast(show.showDate, show.showTime)) {
      return res.status(400).json({
        success: false,
        message: `This screening (${show.showTime} on ${show.showDate}) has already started or concluded. Tickets cannot be reserved.`
      });
    }

    const theatre = await Theatre.findOne({ theatreId: show.theatreId });
    const tierPricing = {
      balcony: Number(show.pricing?.balcony || theatre?.balconySeatPrice || 400),
      middle: Number(show.pricing?.middle || theatre?.middleSeatPrice || 280),
      lower: Number(show.pricing?.lower || theatre?.lowerSeatPrice || 180)
    };

    const parsedSeats = selectedSeats.map(parseSeatIdentifier);
    let calculatedTotalAmount = 0;
    const seatsDetail = [];
    const compositeSeatIds = [];

    for (const seat of parsedSeats) {
      const price = tierPricing[seat.tier];
      if (!price || price <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid seat section / tier '${seat.tier}' for seat ${seat.seatId}.`
        });
      }
      calculatedTotalAmount += price;
      compositeSeatIds.push(seat.seatId);
      seatsDetail.push({
        ...seat,
        price
      });
    }

    // Resolve Movie Poster if not passed directly
    let resolvedMoviePoster = moviePoster || null;
    if (!resolvedMoviePoster && show.movieId) {
      try {
        const movieDoc = await Movie.findOne({
          $or: [
            { _id: mongoose.isValidObjectId(show.movieId) ? show.movieId : null },
            { tmdbId: String(show.movieId) }
          ]
        });
        if (movieDoc && movieDoc.posterPath) {
          resolvedMoviePoster = movieDoc.posterPath;
        }
      } catch (mErr) {
        // silent fallback
      }
    }

    // Resolve User Name if not passed directly
    let resolvedUserName = userName || req.user?.username || null;
    if (!resolvedUserName && userEmail) {
      try {
        const userDoc = await User.findOne({ email: userEmail });
        if (userDoc && userDoc.username) {
          resolvedUserName = userDoc.username;
        }
      } catch (uErr) {
        // silent fallback
      }
    }

    const bookingId = uuidv4();
    const booking = await Booking.create({
      bookingId,
      userEmail,
      userName: resolvedUserName,
      moviePoster: resolvedMoviePoster,
      showId,
      movieName: movieName || show.movieName || 'Movie',
      theatreName: theatreName || show.theatreName || 'Antigravity Cinemas',
      showDate: showDate || show.showDate || '',
      showTime: showTime || show.showTime || '',
      ticketsData: { seats: seatsDetail },
      selectedSeats: compositeSeatIds,
      totalAmount: calculatedTotalAmount, // Server-calculated ONLY!
      paymentStatus: 'Pending',
      status: 'PENDING'
    });

    // Link bookingId with active SeatLock records
    await SeatLock.updateMany(
      { showId, seatId: { $in: compositeSeatIds }, lockedBy: userEmail },
      { $set: { bookingId } }
    );

    return res.status(201).json({
      success: true,
      message: 'Booking initiated with server-verified pricing.',
      booking,
      bookingId,
      totalAmount: calculatedTotalAmount
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create booking.', error: err.message });
  }
};

// Helper to enrich a booking with uniform lifecycle flags and QR validity
const formatBookingResponse = (b) => {
  const isCancelled = b.status === 'CANCELLED' || b.paymentStatus === 'Cancelled';
  const isRefunded = b.status === 'REFUNDED' || b.paymentStatus === 'Refunded';
  const isPast = isShowtimePast(b.showDate, b.showTime);
  const isCompleted = b.paymentStatus === 'Completed';
  const isActive = !isCancelled && !isRefunded && isCompleted && !isPast;
  const isExpired = !isCancelled && !isRefunded && isPast;

  const normalizedStatus = isCancelled
    ? 'CANCELLED'
    : isRefunded
    ? 'REFUNDED'
    : isExpired
    ? 'EXPIRED'
    : isActive
    ? 'ACTIVE'
    : b.status || 'PENDING';

  const parsedSeats = (b.selectedSeats || []).map(parseSeatIdentifier);
  const displaySeats = parsedSeats.map((s) => formatSeatDisplay(s));

  return {
    ...b,
    status: normalizedStatus,
    isActive,
    isCancelled,
    isRefunded,
    isPast,
    isExpired,
    isCancellable: isActive,
    displaySeats,
    // Live QR admission code only provided if ticket is verified active and upcoming
    qrCodeUrl: isActive
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
          `iMovies-Pass:${b.bookingId}:${b.showId}:${(b.selectedSeats || []).join(',')}`
        )}`
      : null,
    validationStatus: isActive
      ? 'VALID_ENTRY'
      : isCancelled
      ? 'CANCELLED_VOID'
      : isRefunded
      ? 'REFUNDED_VOID'
      : isExpired
      ? 'EXPIRED_PAST'
      : 'PENDING_PAYMENT',
    invalidationNotice: isCancelled
      ? `Ticket was cancelled on ${b.cancelledAt ? new Date(b.cancelledAt).toLocaleString() : 'record'}. Entry is void.`
      : isRefunded
      ? `Ticket was refunded on ${b.refundedAt ? new Date(b.refundedAt).toLocaleString() : 'record'}. Entry is void.`
      : isExpired
      ? `This screening concluded on ${b.showDate} at ${b.showTime}. Pass is expired and cannot be cancelled.`
      : null
  };
};

exports.getUserBookings = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { filter, status } = req.query;

    const query = { userEmail };

    if (filter === 'active' || status === 'ACTIVE') {
      query.paymentStatus = 'Completed';
      query.status = { $nin: ['CANCELLED', 'REFUNDED'] };
    } else if (filter === 'inactive' || filter === 'cancelled' || status === 'CANCELLED') {
      query.$or = [
        { paymentStatus: { $in: ['Cancelled', 'Refunded'] } },
        { status: { $in: ['CANCELLED', 'REFUNDED'] } }
      ];
    }

    const rawBookings = await Booking.find(query).sort({ createdAt: -1 }).lean();
    const bookings = rawBookings.map(formatBookingResponse);

    return res.json({ success: true, bookings });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve bookings.', error: err.message });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const raw = await Booking.findOne({ bookingId }).lean();

    if (!raw) {
      return res.status(404).json({ success: false, message: 'Ticket booking not found.' });
    }

    // Access authorization check: user must own ticket, or be an admin
    if (!req.user.isAdmin && raw.userEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Access denied to this ticket.' });
    }

    const booking = formatBookingResponse(raw);
    return res.json({ success: true, booking });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error retrieving ticket.', error: err.message });
  }
};

exports.getPublicTicketPass = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const raw = await Booking.findOne({ bookingId }).lean();

    if (!raw) {
      return res.status(404).json({ success: false, message: 'Ticket booking not found.' });
    }

    const booking = formatBookingResponse(raw);
    return res.json({ success: true, booking });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error retrieving ticket pass.', error: err.message });
  }
};

/**
 * 3. Cancel Booking with Atomic Lock Release
 */
exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    return await runWithTransaction(async (session) => {
      const bookingQuery = Booking.findOne({
        bookingId,
        ...(req.user.isAdmin ? {} : { userEmail: req.user.email })
      });
      if (session) bookingQuery.session(session);
      const booking = await bookingQuery;

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }

      if (booking.status === 'CANCELLED' || booking.paymentStatus === 'Cancelled') {
        return res.status(400).json({ success: false, message: 'Booking is already cancelled.' });
      }

      if (booking.status === 'REFUNDED' || booking.paymentStatus === 'Refunded') {
        return res.status(400).json({ success: false, message: 'Booking has been refunded and cannot be cancelled.' });
      }

      // Check whether showtime has already passed / expired
      if (isShowtimePast(booking.showDate, booking.showTime)) {
        return res.status(400).json({
          success: false,
          message: `Cannot cancel ticket: This movie screening (${booking.showTime} on ${booking.showDate}) has already concluded or started.`
        });
      }

      // Transition status
      booking.paymentStatus = 'Cancelled';
      booking.status = 'CANCELLED';
      booking.cancelledAt = new Date();
      booking.qrCodeData = null; // Invalidate digital entry QR code immediately
      await booking.save(session ? { session } : undefined);

      // Release locks in SeatLock
      const parsedSeats = (booking.selectedSeats || []).map(parseSeatIdentifier);
      const compositeSeatIds = parsedSeats.map((s) => s.seatId);
      const colonSeatIds = parsedSeats.map((s) => `${s.tier}:${s.row}:${s.seatNumber}`);
      const deleteQuery = SeatLock.deleteMany({
        showId: booking.showId,
        seatId: { $in: [...compositeSeatIds, ...colonSeatIds] }
      });
      if (session) deleteQuery.session(session);
      await deleteQuery;

      // Release auditorium seats strictly on their specific tier in Show.tickets
      const showQuery = Show.findOne({ showId: booking.showId });
      if (session) showQuery.session(session);
      const show = await showQuery;

      if (show && show.tickets) {
        const tickets = show.tickets;
        for (const seat of parsedSeats) {
          if (tickets[seat.tier] && tickets[seat.tier][seat.row] && tickets[seat.tier][seat.row][seat.col]) {
            tickets[seat.tier][seat.row][seat.col] = 'available';
          }
        }
        show.tickets = tickets;
        show.markModified('tickets');
        await show.save(session ? { session } : undefined);
      }

      // Real-time broadcast
      const io = req.app.get('io');
      if (io) {
        io.to(`show-${booking.showId}`).emit('seat-status-update', {
          showId: booking.showId,
          releasedSeats: compositeSeatIds
        });
        io.emit('booking-status-changed', {
          bookingId: booking.bookingId,
          status: 'CANCELLED',
          paymentStatus: 'Cancelled',
          userEmail: booking.userEmail
        });
      }

      return res.json({
        success: true,
        message: 'Booking cancelled successfully and seats released.',
        booking: formatBookingResponse(booking.toObject())
      });
    });
  } catch (err) {
    console.error('Cancellation error:', err);
    return res.status(500).json({ success: false, message: 'Cancellation error.', error: err.message });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const rawBookings = await Booking.find().sort({ createdAt: -1 }).lean();
    const bookings = rawBookings.map(formatBookingResponse);
    return res.json({ success: true, bookings });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve bookings.', error: err.message });
  }
};

exports.downloadTicketPdf = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId }).lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ticket booking not found.' });
    }

    const pdfBuffer = await generateTicketPdf(booking);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="iMovies_Pass_${booking.bookingId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('PDF Generation Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate ticket PDF pass.',
      error: err.message
    });
  }
};
