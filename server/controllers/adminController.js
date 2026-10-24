const mongoose = require('mongoose');
const Booking = require('../models/bookingModel');
const User = require('../models/userModel');
const Movie = require('../models/movieModel');
const Show = require('../models/showModel');
const SeatLock = require('../models/seatLockModel');
const { parseSeatIdentifier } = require('../utils/seatHelper');
const Razorpay = require('razorpay');

const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_TpQ7mg5jyDRTt0',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '5OtY3b29pz3FK1KukmSiZqmS'
  });
};

exports.getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalMovies, totalShows, allBookings] = await Promise.all([
      User.countDocuments(),
      Movie.countDocuments(),
      Show.countDocuments(),
      Booking.find()
    ]);

    const completedBookings = allBookings.filter(b => b.paymentStatus === 'Completed');
    const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const cancelledCount = allBookings.filter(b => b.paymentStatus === 'Cancelled' || b.paymentStatus === 'Refunded').length;

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalMovies,
        totalShows,
        totalBookings: allBookings.length,
        completedBookings: completedBookings.length,
        cancelledBookings: cancelledCount,
        totalRevenue
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to aggregate statistics.', error: err.message });
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Booking.find().sort({ createdAt: -1 });
    return res.json({ success: true, transactions });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve transactions.', error: err.message });
  }
};

exports.refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const booking = await Booking.findOne({
      $or: [{ razorpayPaymentId: paymentId }, { bookingId: paymentId }]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Matching booking transaction not found.' });
    }

    if (booking.paymentStatus === 'Refunded') {
      return res.status(400).json({ success: false, message: 'Transaction has already been refunded.' });
    }

    let refundResult = { id: `rfnd_sim_${Date.now()}` };
    if (booking.razorpayPaymentId && !booking.razorpayPaymentId.startsWith('mock_')) {
      try {
        const razorpay = getRazorpayInstance();
        refundResult = await razorpay.payments.refund(booking.razorpayPaymentId, {
          amount: Math.round(booking.totalAmount * 100),
          speed: 'normal',
          notes: { bookingId: booking.bookingId }
        });
      } catch (rzpErr) {
        console.warn('Live Razorpay refund response:', rzpErr.message);
      }
    }

    booking.paymentStatus = 'Refunded';
    booking.status = 'REFUNDED';
    booking.refundedAt = new Date();
    booking.refundId = refundResult?.id || `rfnd_${Date.now()}`;
    booking.qrCodeData = null; // Invalidate digital entry QR code immediately
    await booking.save();

    // Release locks in SeatLock
    const parsedSeats = (booking.selectedSeats || []).map(parseSeatIdentifier);
    const compositeSeatIds = parsedSeats.map((s) => s.seatId);
    const colonSeatIds = parsedSeats.map((s) => `${s.tier}:${s.row}:${s.seatNumber}`);
    await SeatLock.deleteMany({
      showId: booking.showId,
      seatId: { $in: [...compositeSeatIds, ...colonSeatIds] }
    });

    const show = await Show.findOne({ showId: booking.showId });
    if (show && show.tickets) {
      const tickets = show.tickets;
      for (const seat of parsedSeats) {
        if (tickets[seat.tier] && tickets[seat.tier][seat.row] && tickets[seat.tier][seat.row][seat.col]) {
          tickets[seat.tier][seat.row][seat.col] = 'available';
        }
      }
      show.tickets = tickets;
      show.markModified('tickets');
      await show.save();

      // Real-time broadcast: notify all clients viewing this auditorium
      const io = req.app.get('io');
      if (io) {
        io.to(`show-${booking.showId}`).emit('seat-status-update', {
          showId: booking.showId,
          releasedSeats: compositeSeatIds
        });
        io.emit('booking-status-changed', {
          bookingId: booking.bookingId,
          status: 'REFUNDED',
          paymentStatus: 'Refunded',
          userEmail: booking.userEmail
        });
      }
    }

    return res.json({
      success: true,
      message: 'Refund successfully processed and auditorium seats freed.',
      refund: refundResult,
      booking
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Refund processing failed.', error: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    
    // Attach total bookings count for each user
    const usersWithBookings = await Promise.all(
      users.map(async (u) => {
        const bookingsCount = await Booking.countDocuments({ userEmail: u.email });
        return {
          ...u,
          bookingsCount
        };
      })
    );

    return res.json({ success: true, users: usersWithBookings });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve users.', error: err.message });
  }
};

/**
 * Delete User Account from Database (Admin action):
 * Permanently removes user account from MongoDB, emits real-time WebSocket update,
 * and returns updated user count for synchronized client-side metrics.
 */
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const query = mongoose.isValidObjectId(userId)
      ? { $or: [{ _id: userId }, { email: userId }] }
      : { email: userId };

    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    // Safety guard: Prevent accidental deletion of primary admin accounts
    if (user.role === 'admin' || user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be removed from user management.'
      });
    }

    // Delete user from MongoDB
    await User.deleteOne({ _id: user._id });

    // Count remaining registered users in real-time
    const totalUsers = await User.countDocuments();

    // Broadcast real-time WebSocket event
    const io = req.app.get('io');
    if (io) {
      io.emit('user-count-updated', {
        totalUsers,
        deletedUserId: user._id,
        deletedUserEmail: user.email
      });
    }

    return res.json({
      success: true,
      message: `User ${user.username || user.email} removed successfully.`,
      deletedUserId: user._id,
      totalUsers
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user account.',
      error: err.message
    });
  }
};
