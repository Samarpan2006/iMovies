const express = require('express');
const router = express.Router();
const {
  searchMoviesEndpoint,
  getTrendingEndpoint,
  getBollywoodEndpoint,
  getDiscoverEndpoint,
  getMovieSections,
  getAllMovies,
  getMovieById,
  addMovie,
  updateMovie,
  deleteMovie
} = require('../controllers/movieController');
const fetchUser = require('../middlewares/fetchUser');
const isAdmin = require('../middlewares/isAdmin');

// Public catalog routes - allow browsing and searching without requiring login token
router.get('/search', searchMoviesEndpoint);
router.get('/trending', getTrendingEndpoint);
router.get('/bollywood', getBollywoodEndpoint);
router.get('/discover', getDiscoverEndpoint);
router.get('/sections', getMovieSections);
router.get('/', getAllMovies);
router.get('/:movieId', getMovieById);

// Admin-only movie management routes
router.post('/add', fetchUser, isAdmin, addMovie);
router.put('/:movieId', fetchUser, isAdmin, updateMovie);
router.delete('/:movieId', fetchUser, isAdmin, deleteMovie);

module.exports = router;
