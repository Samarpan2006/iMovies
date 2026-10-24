const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/userModel');
const Admin = require('./models/adminModel');
const Theatre = require('./models/theatreModel');
const Show = require('./models/showModel');
const Movie = require('./models/movieModel');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/imovies';

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

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected for seeding.');

    // Seed Admin
    const existingAdmin = await Admin.findOne({ email: 'admin@imovies.com' });
    if (!existingAdmin) {
      const hashedAdminPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({
        username: 'admin',
        email: 'admin@imovies.com',
        password: hashedAdminPassword
      });
      console.log('Default Admin seeded: admin@imovies.com / admin123');
    }

    // Seed Demo User
    const existingUser = await User.findOne({ email: 'demo@imovies.com' });
    if (!existingUser) {
      const hashedUserPassword = await bcrypt.hash('user123', 10);
      await User.create({
        username: 'demouser',
        email: 'demo@imovies.com',
        password: hashedUserPassword
      });
      console.log('Default User seeded: demo@imovies.com / user123');
    }

    // Seed Theatres
    let theatre = await Theatre.findOne({ theatreId: 'theatre-pvr-01' });
    if (!theatre) {
      theatre = await Theatre.create({
        theatreName: 'PVR Director\'s Cut Multiplex',
        theatreId: 'theatre-pvr-01',
        location: 'Downtown Cineplex, Screen 1',
        balconySeatPrice: 400,
        middleSeatPrice: 280,
        lowerSeatPrice: 180,
        balconySeats: generateSeatGrid(3, 10),
        middleSeats: generateSeatGrid(5, 10),
        lowerSeats: generateSeatGrid(4, 10)
      });
      console.log('Default Theatre seeded: theatre-pvr-01');
    }

    // Seed Show linking to now_playing TMDB movie ID
    const today = new Date().toISOString().split('T')[0];
    const existingShow = await Show.findOne({ showId: 'show-demo-01' });
    if (!existingShow) {
      await Show.create({
        adminEmail: 'admin@imovies.com',
        showId: 'show-demo-01',
        movieId: '1022796', // TMDB ID for live movie
        theatreId: 'theatre-pvr-01',
        theatreName: theatre.theatreName,
        showDate: today,
        showTime: '19:45',
        tickets: {
          balcony: JSON.parse(JSON.stringify(theatre.balconySeats)),
          middle: JSON.parse(JSON.stringify(theatre.middleSeats)),
          lower: JSON.parse(JSON.stringify(theatre.lowerSeats))
        }
      });
      console.log('Default Show seeded for today at 19:45: show-demo-01');
    }

    console.log('Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err.message);
    process.exit(1);
  }
};

seed();
