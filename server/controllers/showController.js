const Show = require('../models/showModel');
const Theatre = require('../models/theatreModel');
const Booking = require('../models/bookingModel');
const SeatLock = require('../models/seatLockModel');
const { toCompositeSeatId, parseSeatIdentifier } = require('../utils/seatHelper');
const { isShowtimePast, compareShowtimes } = require('../utils/timeHelper');
const { v4: uuidv4 } = require('uuid');

// Pure unbooked seat grid: all seats initialized strictly as 'available'
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

// Seed default standard multiplex theatres if missing
const ensureDefaultTheatres = async () => {
  const defaultTheatres = [
    {
      theatreId: 'theatre-pvr-01',
      theatreName: "PVR Director's Cut Multiplex",
      location: 'Downtown Cineplex, Screen 1',
      balconySeatPrice: 420,
      middleSeatPrice: 290,
      lowerSeatPrice: 190,
      balconySeats: generateSeatGrid(3, 10),
      middleSeats: generateSeatGrid(5, 10),
      lowerSeats: generateSeatGrid(4, 10)
    },
    {
      theatreId: 'theatre-cinepolis-02',
      theatreName: 'Cinepolis VIP Cinemas',
      location: 'City Center Mall, Screen 4',
      balconySeatPrice: 450,
      middleSeatPrice: 320,
      lowerSeatPrice: 210,
      balconySeats: generateSeatGrid(3, 10),
      middleSeats: generateSeatGrid(5, 10),
      lowerSeats: generateSeatGrid(4, 10)
    },
    {
      theatreId: 'theatre-antigravity-03',
      theatreName: 'Antigravity IMAX Multiplex',
      location: 'Skyline Promenade, IMAX Audi 1',
      balconySeatPrice: 520,
      middleSeatPrice: 380,
      lowerSeatPrice: 260,
      balconySeats: generateSeatGrid(3, 10),
      middleSeats: generateSeatGrid(5, 10),
      lowerSeats: generateSeatGrid(4, 10)
    }
  ];

  for (const tData of defaultTheatres) {
    const exists = await Theatre.findOne({ theatreId: tData.theatreId });
    if (!exists) {
      await Theatre.create(tData);
    }
  }
};

// Calculate seat availability metrics strictly based on total seats and actual booked seats
const calculateAvailability = (tickets, bookedSeatCount = 0) => {
  let totalCount = 120; // Standard default

  if (tickets && typeof tickets === 'object') {
    let counted = 0;
    for (const tier of ['balcony', 'middle', 'lower']) {
      const rowMap = tickets[tier];
      if (rowMap && typeof rowMap === 'object') {
        for (const rowKey of Object.keys(rowMap)) {
          const colMap = rowMap[rowKey];
          if (colMap && typeof colMap === 'object') {
            counted += Object.keys(colMap).length;
          }
        }
      }
    }
    if (counted > 0) totalCount = counted;
  }

  const availableCount = Math.max(0, totalCount - bookedSeatCount);
  const ratio = availableCount / totalCount;

  let status = 'Available';
  if (bookedSeatCount > 0) {
    if (ratio < 0.2) {
      status = 'Almost Full';
    } else if (ratio < 0.55) {
      status = 'Fast Filling';
    }
  }

  return {
    status,
    availableCount,
    totalCount,
    percentage: Math.round(ratio * 100)
  };
};

// Auto-seed showtimes for a movie across target date or 7 days if none exist
// All seats are initialized strictly as 'available'
const ensureMovieShows = async (movieId, targetDateStr = null) => {
  await ensureDefaultTheatres();
  const theatres = await Theatre.find({
    theatreId: { $in: ['theatre-pvr-01', 'theatre-cinepolis-02', 'theatre-antigravity-03'] }
  });

  if (!theatres.length) return;

  const schedules = [
    {
      theatreId: 'theatre-pvr-01',
      format: '2D Atmos',
      screenType: 'Audi 1 (Dolby 7.1)',
      timings: ['10:00 AM', '01:15 PM', '04:30 PM', '07:45 PM', '10:30 PM']
    },
    {
      theatreId: 'theatre-cinepolis-02',
      format: '4DX',
      screenType: 'Audi 3 (Dynamic Motion)',
      timings: ['11:30 AM', '02:45 PM', '06:00 PM', '09:15 PM']
    },
    {
      theatreId: 'theatre-antigravity-03',
      format: 'IMAX 3D',
      screenType: 'IMAX Laser Audi',
      timings: ['09:45 AM', '01:00 PM', '05:15 PM', '08:30 PM']
    }
  ];

  let datesToGenerate = [];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const maxAdvanceDate = new Date(now);
  maxAdvanceDate.setDate(now.getDate() + 7);
  const maxAdvanceStr = maxAdvanceDate.toISOString().split('T')[0];

  if (targetDateStr) {
    if (targetDateStr >= todayStr && targetDateStr <= maxAdvanceStr) {
      const existingOnDate = await Show.countDocuments({
        movieId: String(movieId),
        showDate: String(targetDateStr)
      });
      if (existingOnDate === 0) {
        datesToGenerate.push(targetDateStr);
      }
    }
  } else {
    for (let d = 0; d < 7; d++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + d);
      const dateStr = targetDate.toISOString().split('T')[0];
      const existingOnDate = await Show.countDocuments({
        movieId: String(movieId),
        showDate: dateStr
      });
      if (existingOnDate === 0) {
        datesToGenerate.push(dateStr);
      }
    }
  }

  if (datesToGenerate.length === 0) return;

  const newShows = [];
  for (const dateStr of datesToGenerate) {
    for (const sched of schedules) {
      const theatre = theatres.find(t => t.theatreId === sched.theatreId);
      if (!theatre) continue;

      for (const timeStr of sched.timings) {
        newShows.push({
          adminEmail: 'admin@imovies.com',
          showId: uuidv4(),
          movieId: String(movieId),
          theatreId: theatre.theatreId,
          theatreName: theatre.theatreName,
          theatreLocation: theatre.location,
          showDate: dateStr,
          showTime: timeStr,
          format: sched.format,
          screenType: sched.screenType,
          pricing: {
            balcony: theatre.balconySeatPrice,
            middle: theatre.middleSeatPrice,
            lower: theatre.lowerSeatPrice
          },
          // All seats strictly 'available' by default - zero fake pre-booked seats
          tickets: {
            balcony: generateSeatGrid(3, 10),
            middle: generateSeatGrid(5, 10),
            lower: generateSeatGrid(4, 10)
          }
        });
      }
    }
  }

  if (newShows.length > 0) {
    await Show.insertMany(newShows);
    console.log(`[ShowController] Initialized ${newShows.length} new showtimes (all seats available) for movie ${movieId}`);
  }
};

exports.getAllShows = async (req, res) => {
  try {
    const { movieId, date } = req.query;

    if (movieId) {
      await ensureMovieShows(movieId, date);
    }

    const filter = {};
    if (movieId) filter.movieId = String(movieId);
    if (date) filter.showDate = String(date);

    const shows = await Show.find(filter).sort({ theatreName: 1, showTime: 1 }).lean();

    // Fetch actual completed bookings for all returned shows to calculate real availability
    const showIds = shows.map((s) => s.showId);
    const completedBookings = await Booking.find({
      showId: { $in: showIds },
      paymentStatus: 'Completed',
      status: { $nin: ['CANCELLED', 'REFUNDED'] }
    }).select('showId selectedSeats').lean();

    const bookedSeatsByShow = {};
    for (const b of completedBookings) {
      if (!bookedSeatsByShow[b.showId]) {
        bookedSeatsByShow[b.showId] = new Set();
      }
      if (Array.isArray(b.selectedSeats)) {
        b.selectedSeats.forEach((seat) => {
          const parsed = parseSeatIdentifier(seat);
          bookedSeatsByShow[b.showId].add(parsed.seatId);
        });
      }
    }

    // Enrich shows strictly based on real booking data
    const enrichedShows = shows.map((show) => {
      const bookedSet = bookedSeatsByShow[show.showId] || new Set();
      const bookedCount = bookedSet.size;

      const avail = calculateAvailability(show.tickets, bookedCount);

      return {
        ...show,
        isPast: isShowtimePast(show.showDate, show.showTime),
        availabilityStatus: avail.status, // "Available" if bookedCount === 0
        availableSeatsCount: avail.availableCount,
        totalSeatsCount: avail.totalCount,
        availablePercentage: avail.percentage,
        bookedSeatsCount: bookedCount,
        format: show.format || '2D',
        screenType: show.screenType || 'Screen 1',
        theatreLocation: show.theatreLocation || 'Multiplex Complex',
        pricing: show.pricing || {
          balcony: 400,
          middle: 280,
          lower: 180
        }
      };
    });

    // Chronological Sorting: Ensure all showtimes are strictly ordered from morning to night
    // Prevents alphabetical bugs like 09:45 AM appearing after 08:30 PM
    enrichedShows.sort((a, b) => {
      const theatreCmp = (a.theatreName || '').localeCompare(b.theatreName || '');
      if (theatreCmp !== 0) return theatreCmp;
      return compareShowtimes(a.showTime, b.showTime);
    });

    return res.json({ success: true, shows: enrichedShows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve shows.', error: err.message });
  }
};

exports.getShowById = async (req, res) => {
  try {
    let show = await Show.findOne({ showId: req.params.showId });
    if (!show) return res.status(404).json({ success: false, message: 'Show not found.' });

    let theatre = await Theatre.findOne({ theatreId: show.theatreId });
    if (!theatre) {
      theatre = {
        theatreName: show.theatreName,
        theatreId: show.theatreId,
        location: show.theatreLocation || 'Multiplex Auditorium',
        balconySeatPrice: show.pricing?.balcony || 400,
        middleSeatPrice: show.pricing?.middle || 280,
        lowerSeatPrice: show.pricing?.lower || 180,
        balconySeats: generateSeatGrid(3, 10),
        middleSeats: generateSeatGrid(5, 10),
        lowerSeats: generateSeatGrid(4, 10)
      };
    }

    // Dynamic Booking Check: Fetch completed bookings and active seat locks strictly filtered by this showId
    const [completedBookings, activeLocks] = await Promise.all([
      Booking.find({
        showId: show.showId,
        paymentStatus: 'Completed',
        status: { $nin: ['CANCELLED', 'REFUNDED'] }
      }).select('selectedSeats bookingId userEmail').lean(),
      SeatLock.find({
        showId: show.showId
      }).lean()
    ]);

    const bookedSeatSet = new Set();
    const lockMap = new Map();
    const now = Date.now();

    completedBookings.forEach((b) => {
      if (Array.isArray(b.selectedSeats)) {
        b.selectedSeats.forEach((seat) => {
          const parsed = parseSeatIdentifier(seat);
          bookedSeatSet.add(parsed.id);
          bookedSeatSet.add(parsed.seatId);
          bookedSeatSet.add(`${parsed.tier}:${parsed.row}:${parsed.seatNumber}`);
        });
      }
    });

    activeLocks.forEach((lock) => {
      const parsed = parseSeatIdentifier(lock.seatId || lock);
      if (lock.status === 'BOOKED') {
        bookedSeatSet.add(parsed.id);
        bookedSeatSet.add(parsed.seatId);
        bookedSeatSet.add(`${parsed.tier}:${parsed.row}:${parsed.seatNumber}`);
      } else if (
        lock.status === 'LOCKED' &&
        lock.lockExpiry &&
        new Date(lock.lockExpiry).getTime() > now
      ) {
        const lockObj = {
          status: 'locked',
          lockedBy: lock.lockedBy,
          lockExpiry: new Date(lock.lockExpiry).getTime()
        };
        lockMap.set(parsed.id, lockObj);
        lockMap.set(parsed.seatId, lockObj);
        lockMap.set(`${parsed.tier}:${parsed.row}:${parsed.seatNumber}`, lockObj);
      }
    });

    // Ensure tickets layout exists and reconcile seat states:
    // If no completed booking exists for that seat, it MUST be 'available' (unless currently locked with active TTL)
    const baseTickets = show.tickets && Object.keys(show.tickets).length > 0
      ? show.tickets
      : {
          balcony: generateSeatGrid(3, 10),
          middle: generateSeatGrid(5, 10),
          lower: generateSeatGrid(4, 10)
        };

    const reconciledTickets = {};

    for (const tier of ['balcony', 'middle', 'lower']) {
      reconciledTickets[tier] = {};
      const tierRows = baseTickets[tier] || {};

      for (const rowKey of Object.keys(tierRows)) {
        reconciledTickets[tier][rowKey] = {};
        const colMap = tierRows[rowKey] || {};

        for (const colKey of Object.keys(colMap)) {
          // Composite key: e.g. "balcony-A-1" vs "lower-A-1" (Zero collision between tiers!)
          const compositeKey = toCompositeSeatId(tier, rowKey, colKey);
          const colonKey = `${tier}:${rowKey}:${colKey}`;

          if (bookedSeatSet.has(compositeKey) || bookedSeatSet.has(colonKey)) {
            // Strictly booked by a verified completed booking in THIS tier
            reconciledTickets[tier][rowKey][colKey] = 'booked';
          } else if (lockMap.has(compositeKey) || lockMap.has(colonKey)) {
            // Active temporary lock within TTL in THIS tier
            reconciledTickets[tier][rowKey][colKey] = lockMap.get(compositeKey) || lockMap.get(colonKey);
          } else {
            // Unbooked / Available by default
            reconciledTickets[tier][rowKey][colKey] = 'available';
          }
        }
      }
    }

    // Persist sanitized tickets back to MongoDB
    show.tickets = reconciledTickets;
    show.markModified('tickets');
    await show.save();

    const avail = calculateAvailability(reconciledTickets, bookedSeatSet.size);

    return res.json({
      success: true,
      show: {
        ...show.toObject(),
        isPast: isShowtimePast(show.showDate, show.showTime),
        tickets: reconciledTickets,
        bookedSeats: Array.from(bookedSeatSet),
        availabilityStatus: avail.status,
        availableSeatsCount: avail.availableCount,
        totalSeatsCount: avail.totalCount
      },
      theatre
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error retrieving show details.', error: err.message });
  }
};

exports.addShow = async (req, res) => {
  try {
    const { adminEmail, movieId, theatreId, theatreName, showDate, showTime, format, screenType } = req.body;

    if (!movieId || !theatreId || !showDate || !showTime) {
      return res.status(400).json({ success: false, message: 'Missing required show schedule parameters.' });
    }

    const theatre = await Theatre.findOne({ theatreId });
    if (!theatre) {
      return res.status(404).json({ success: false, message: 'Referenced theatre not found.' });
    }

    // Initialize all seats strictly as 'available'
    const tickets = {
      balcony: generateSeatGrid(3, 10),
      middle: generateSeatGrid(5, 10),
      lower: generateSeatGrid(4, 10)
    };

    const showId = uuidv4();
    const show = await Show.create({
      adminEmail: adminEmail || req.user?.email || 'admin@imovies.com',
      showId,
      movieId: String(movieId),
      theatreId,
      theatreName: theatreName || theatre.theatreName,
      theatreLocation: theatre.location,
      showDate,
      showTime,
      format: format || '2D',
      screenType: screenType || 'Screen 1',
      pricing: {
        balcony: theatre.balconySeatPrice,
        middle: theatre.middleSeatPrice,
        lower: theatre.lowerSeatPrice
      },
      tickets
    });

    return res.status(201).json({ success: true, message: 'Show scheduled successfully (all seats available).', show });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to schedule show.', error: err.message });
  }
};

exports.deleteShow = async (req, res) => {
  try {
    const show = await Show.findOneAndDelete({ showId: req.params.showId });
    if (!show) return res.status(404).json({ success: false, message: 'Show not found.' });
    return res.json({ success: true, message: 'Show cancelled and deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete show.', error: err.message });
  }
};
