const mongoose = require('mongoose');

const seatLockSchema = new mongoose.Schema(
  {
    showId: { type: String, required: true, index: true },
    seatId: { type: String, required: true }, // Composite unique key: e.g. "balcony-A-1"
    tier: { type: String, required: true, enum: ['balcony', 'middle', 'lower'] },
    tierId: { type: String, default: function () { return this.tier; } },
    sectionId: { type: String, default: function () { return this.tier; } },
    row: { type: String, required: true },
    col: { type: String, required: true },
    seatNumber: { type: String, default: function () { return this.col; } },
    status: {
      type: String,
      enum: ['LOCKED', 'BOOKED'],
      default: 'LOCKED',
      required: true
    },
    lockedBy: { type: String, required: true }, // User email
    bookingId: { type: String, default: null },
    lockExpiry: { type: Date, required: true }
  },
  { timestamps: true }
);

// Compound Unique Indexes:
// 1. Unique by showId and composite seatId
seatLockSchema.index({ showId: 1, seatId: 1 }, { unique: true });

// 2. Explicit composite unique constraint: UNIQUE(showId, section_id, row, seat_number)
seatLockSchema.index({ showId: 1, tier: 1, row: 1, col: 1 }, { unique: true });

// Secondary Index for cleanup & query optimization
seatLockSchema.index({ showId: 1, status: 1 });
seatLockSchema.index({ lockExpiry: 1 });

module.exports = mongoose.model('SeatLock', seatLockSchema);
