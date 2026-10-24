const mongoose = require('mongoose');

const showSchema = new mongoose.Schema({
  adminEmail: { type: String, required: true },
  showId: { type: String, required: true, unique: true },
  movieId: { type: String, required: true },
  theatreId: { type: String, required: true },
  theatreName: { type: String, required: true },
  theatreLocation: { type: String, default: 'Multiplex Auditorium Complex' },
  showDate: { type: String, required: true }, // Format: YYYY-MM-DD
  showTime: { type: String, required: true }, // e.g., '10:00 AM'
  format: { type: String, default: '2D' }, // Screen Type / Format: 2D, 3D, IMAX, 4DX, IMAX 3D, 2D Atmos
  screenType: { type: String, default: 'Screen 1' },
  pricing: {
    balcony: { type: Number, default: 400 },
    middle: { type: Number, default: 280 },
    lower: { type: Number, default: 180 }
  },
  tickets: { type: Object, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('Show', showSchema);
