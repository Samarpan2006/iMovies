const Review = require('../models/reviewModel');

exports.addReview = async (req, res) => {
  try {
    const { movieId, rating, reviewText } = req.body;
    const userEmail = req.user.email;

    if (!movieId || !rating || !reviewText) {
      return res.status(400).json({ success: false, message: 'Movie ID, rating, and review text are required.' });
    }

    const existing = await Review.findOne({ userEmail, movieId: String(movieId) });
    if (existing) {
      existing.rating = Number(rating);
      existing.reviewText = reviewText;
      await existing.save();
      return res.json({ success: true, message: 'Review updated.', review: existing });
    }

    const review = await Review.create({
      userEmail,
      movieId: String(movieId),
      rating: Number(rating),
      reviewText
    });

    return res.status(201).json({ success: true, message: 'Review added.', review });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to record review.', error: err.message });
  }
};

exports.getMovieReviews = async (req, res) => {
  try {
    const { movieId } = req.params;
    const reviews = await Review.find({ movieId: String(movieId) }).sort({ createdAt: -1 });
    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0';

    return res.json({ success: true, reviews, avgRating: Number(avgRating) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch reviews.', error: err.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    await Review.findOneAndDelete({ _id: reviewId, userEmail: req.user.email });
    return res.json({ success: true, message: 'Review deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete review.', error: err.message });
  }
};
