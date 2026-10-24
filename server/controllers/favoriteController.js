const Favorite = require('../models/favoriteModel');

exports.addFavorite = async (req, res) => {
  try {
    const { movieId } = req.body;
    const userEmail = req.user.email;

    if (!movieId) return res.status(400).json({ success: false, message: 'Movie ID required.' });

    const existing = await Favorite.findOne({ userEmail, movieId: String(movieId) });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Movie is already in watchlist.' });
    }

    const favorite = await Favorite.create({ userEmail, movieId: String(movieId) });
    return res.status(201).json({ success: true, message: 'Added to watchlist.', favorite });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error adding favorite.', error: err.message });
  }
};

exports.removeFavorite = async (req, res) => {
  try {
    const { movieId } = req.params;
    const userEmail = req.user.email;

    await Favorite.findOneAndDelete({ userEmail, movieId: String(movieId) });
    return res.json({ success: true, message: 'Removed from watchlist.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error removing favorite.', error: err.message });
  }
};

exports.getUserFavorites = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const favorites = await Favorite.find({ userEmail });
    return res.json({ success: true, favorites });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve favorites.', error: err.message });
  }
};
