const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true, unique: true },
    userEmail: { type: String, required: true },
    userName: { type: String, default: null },
    moviePoster: { type: String, default: null },
    showId: { type: String, required: true },
    movieName: { type: String },
    theatreName: { type: String },
    showDate: { type: String },
    showTime: { type: String },
    ticketsData: { type: Object, default: {} },
    selectedSeats: [String],
    totalAmount: { type: Number },
    // Payment status tracking
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed', 'Cancelled', 'Refunded'],
      default: 'Pending',
    },
    // Standardized ticket lifecycle status
    status: {
      type: String,
      enum: ['ACTIVE', 'CANCELLED', 'REFUNDED', 'PENDING'],
      default: 'PENDING',
    },
    qrCodeData: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    refundId: { type: String, default: null },
    cancellationReason: { type: String, default: null },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
