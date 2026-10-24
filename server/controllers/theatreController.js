const Theatre = require('../models/theatreModel');
const { v4: uuidv4 } = require('uuid');

const generateSeatGrid = (rows, seatsPerRow) => {
  const grid = {};
  for (let r = 0; r < rows; r++) {
    const rowChar = String.fromCharCode(65 + r);
    grid[rowChar] = {};
    for (let c = 1; c <= seatsPerRow; c++) {
      grid[rowChar][c] = 'available';
    }
  }
  return grid;
};

exports.getAllTheatres = async (req, res) => {
  try {
    const theatres = await Theatre.find().sort({ createdAt: -1 });
    return res.json({ success: true, theatres });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve theatres.', error: err.message });
  }
};

exports.getTheatreById = async (req, res) => {
  try {
    const theatre = await Theatre.findOne({ theatreId: req.params.theatreId });
    if (!theatre) return res.status(404).json({ success: false, message: 'Theatre not found.' });
    return res.json({ success: true, theatre });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error retrieving theatre.', error: err.message });
  }
};

exports.addTheatre = async (req, res) => {
  try {
    const {
      theatreName,
      location,
      balconySeatPrice = 350,
      middleSeatPrice = 250,
      lowerSeatPrice = 150,
      balconyRows = 3,
      middleRows = 5,
      lowerRows = 4,
      seatsPerRow = 10
    } = req.body;

    if (!theatreName || !location) {
      return res.status(400).json({ success: false, message: 'Theatre name and location are required.' });
    }

    const theatreId = uuidv4();
    const theatre = await Theatre.create({
      theatreName,
      theatreId,
      location,
      balconySeatPrice: Number(balconySeatPrice),
      middleSeatPrice: Number(middleSeatPrice),
      lowerSeatPrice: Number(lowerSeatPrice),
      balconySeats: generateSeatGrid(Number(balconyRows), Number(seatsPerRow)),
      middleSeats: generateSeatGrid(Number(middleRows), Number(seatsPerRow)),
      lowerSeats: generateSeatGrid(Number(lowerRows), Number(seatsPerRow))
    });

    return res.status(201).json({ success: true, message: 'Theatre created successfully.', theatre });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create theatre.', error: err.message });
  }
};

exports.updateTheatre = async (req, res) => {
  try {
    const theatre = await Theatre.findOneAndUpdate(
      { theatreId: req.params.theatreId },
      req.body,
      { new: true }
    );
    if (!theatre) return res.status(404).json({ success: false, message: 'Theatre not found.' });
    return res.json({ success: true, message: 'Theatre updated successfully.', theatre });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update theatre.', error: err.message });
  }
};

exports.deleteTheatre = async (req, res) => {
  try {
    const theatre = await Theatre.findOneAndDelete({ theatreId: req.params.theatreId });
    if (!theatre) return res.status(404).json({ success: false, message: 'Theatre not found.' });
    return res.json({ success: true, message: 'Theatre deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete theatre.', error: err.message });
  }
};
