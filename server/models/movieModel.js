const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  movieName: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
  description: { type: String, required: true, trim: true, minlength: 10 },
  genres: {
    type: [String],
    required: true,
    validate: { validator: v => v.length > 0, message: 'At least one genre required' },
  },
  releaseDate: { type: Date, required: true },
  language: { type: String, required: true },
  duration: { type: String, required: true },
  certification: { type: String, default: 'U/A' },
  posterPath: { type: String },
  backdropPath: { type: String },
  trailerUrl: { type: String },
  tmdbId: { type: String },
  voteAverage: { type: Number, default: 0 },
  cast: [{ name: String, character: String, profilePath: String }],
}, { timestamps: true });

module.exports = mongoose.model('Movie', movieSchema);
