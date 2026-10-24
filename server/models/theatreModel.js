const mongoose = require('mongoose');

const theatreSchema = new mongoose.Schema({
  theatreName: { type: String, required: true, trim: true },
  theatreId: { type: String, required: true, unique: true },
  location: { type: String, required: true },
  balconySeatPrice: { type: Number, required: true },
  middleSeatPrice: { type: Number, required: true },
  lowerSeatPrice: { type: Number, required: true },
  balconySeats: { type: Object, required: true },
  middleSeats: { type: Object, required: true },
  lowerSeats: { type: Object, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Theatre', theatreSchema);
