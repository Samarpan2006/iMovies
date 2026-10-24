const express = require('express');
const router = express.Router();
const {
  getAllTheatres,
  getTheatreById,
  addTheatre,
  updateTheatre,
  deleteTheatre
} = require('../controllers/theatreController');
const fetchUser = require('../middlewares/fetchUser');
const isAdmin = require('../middlewares/isAdmin');

// Public read routes
router.get('/', getAllTheatres);
router.get('/:theatreId', getTheatreById);

// Admin-protected mutation routes
router.post('/add', fetchUser, isAdmin, addTheatre);
router.put('/:theatreId', fetchUser, isAdmin, updateTheatre);
router.delete('/:theatreId', fetchUser, isAdmin, deleteTheatre);

module.exports = router;
