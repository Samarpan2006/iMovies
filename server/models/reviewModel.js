const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  movieId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 10 },
  reviewText: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
