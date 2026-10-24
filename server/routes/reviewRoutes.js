const express = require('express');
const router = express.Router();
const {
  addReview,
  getMovieReviews,
  deleteReview
} = require('../controllers/reviewController');
const fetchUser = require('../middlewares/fetchUser');

router.post('/add', fetchUser, addReview);
router.get('/:movieId', fetchUser, getMovieReviews);
router.delete('/:reviewId', fetchUser, deleteReview);

module.exports = router;
