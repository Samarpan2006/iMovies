const express = require('express');
const router = express.Router();
const {
  getAllShows,
  getShowById,
  addShow,
  deleteShow
} = require('../controllers/showController');
const fetchUser = require('../middlewares/fetchUser');
const isAdmin = require('../middlewares/isAdmin');

// Public read routes
router.get('/', getAllShows);
router.get('/:showId', getShowById);

// Admin-protected mutation routes
router.post('/add', fetchUser, isAdmin, addShow);
router.delete('/:showId', fetchUser, isAdmin, deleteShow);

module.exports = router;
