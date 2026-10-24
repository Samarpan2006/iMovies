const Booking = require('../models/bookingModel');
const Show = require('../models/showModel');
const { sendReminderEmail } = require('../services/emailService');
const dayjs = require('dayjs');

const sendShowReminders = async () => {
  try {
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
    const shows = await Show.find({ showDate: tomorrow });
    if (!shows || shows.length === 0) return;

    for (const show of shows) {
      const bookings = await Booking.find({ showId: show.showId, paymentStatus: 'Completed' });
      for (const booking of bookings) {
        await sendReminderEmail({
          to: booking.userEmail,
          movieName: booking.movieName || 'Movie',
          theatreName: booking.theatreName || show.theatreName,
          showDate: booking.showDate || show.showDate,
          showTime: booking.showTime || show.showTime
        });
      }
    }
    console.log(`[reminderService] Processed show reminders for date ${tomorrow}`);
  } catch (err) {
    console.error('[reminderService] Error sending reminders:', err.message);
  }
};

module.exports = { sendShowReminders };
