const Show = require('../models/showModel');
const SeatLock = require('../models/seatLockModel');

const releaseExpiredLocks = async () => {
  try {
    const now = new Date();

    // 1. Delete expired temporary locks from SeatLock collection
    const deletedLocks = await SeatLock.deleteMany({
      status: 'LOCKED',
      lockExpiry: { $lt: now }
    });

    if (deletedLocks.deletedCount > 0) {
      console.log(`[cleanupService] Cleared ${deletedLocks.deletedCount} expired temporary seat lock records.`);
    }

    // 2. Reconcile Show.tickets in-memory representation
    const shows = await Show.find();
    const nowTime = now.getTime();
    let updatedCount = 0;

    for (const show of shows) {
      const tickets = show.tickets;
      if (!tickets) continue;
      let modified = false;

      for (const tier of ['balcony', 'middle', 'lower']) {
        if (!tickets[tier]) continue;
        for (const row of Object.keys(tickets[tier])) {
          for (const col of Object.keys(tickets[tier][row])) {
            const seat = tickets[tier][row][col];
            if (typeof seat === 'object' && seat !== null && seat.status === 'locked') {
              if (seat.lockExpiry && seat.lockExpiry < nowTime) {
                tickets[tier][row][col] = 'available';
                modified = true;
              }
            }
          }
        }
      }

      if (modified) {
        show.tickets = tickets;
        show.markModified('tickets');
        await show.save();
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`[cleanupService] Released expired seat locks across ${updatedCount} shows.`);
    }
  } catch (err) {
    console.error('[cleanupService] Error releasing locks:', err.message);
  }
};

module.exports = { releaseExpiredLocks };
