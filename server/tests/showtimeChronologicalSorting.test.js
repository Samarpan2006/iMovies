const assert = require('assert');
const axios = require('axios');
const dayjs = require('dayjs');
const { compareShowtimes, sortShowsChronologically } = require('../utils/timeHelper');

const API_BASE = 'http://localhost:5000/api';

console.log('🧪 Starting Showtime Chronological Sorting Test Suite...\n');

// Test 1: compareShowtimes logic
console.log('Test 1: Verify compareShowtimes comparator');
assert.ok(compareShowtimes('09:45 AM', '01:00 PM') < 0, '09:45 AM must be earlier than 01:00 PM');
assert.ok(compareShowtimes('09:45 AM', '08:30 PM') < 0, '09:45 AM must be earlier than 08:30 PM');
assert.ok(compareShowtimes('08:30 PM', '09:45 AM') > 0, '08:30 PM must be later than 09:45 AM');

assert.ok(compareShowtimes('11:30 AM', '02:45 PM') < 0, '11:30 AM must be earlier than 02:45 PM');
assert.ok(compareShowtimes('11:30 AM', '09:15 PM') < 0, '11:30 AM must be earlier than 09:15 PM');
assert.ok(compareShowtimes('09:15 PM', '11:30 AM') > 0, '09:15 PM must be later than 11:30 AM');

assert.strictEqual(compareShowtimes('01:00 PM', '01:00 PM'), 0, 'Identical showtimes must return 0');
console.log('✅ Comparator correctly orders 12-hour AM/PM times chronologically.\n');

// Test 2: Sort Antigravity IMAX shows
console.log('Test 2: Fix out-of-order display for Antigravity IMAX Multiplex');
const antigravityRaw = [
  { showTime: '01:00 PM' },
  { showTime: '05:15 PM' },
  { showTime: '08:30 PM' },
  { showTime: '09:45 AM' } // was out of order at index 3 in screenshot
];
const antigravitySorted = sortShowsChronologically(antigravityRaw);
const expectedAntigravity = ['09:45 AM', '01:00 PM', '05:15 PM', '08:30 PM'];
assert.deepStrictEqual(
  antigravitySorted.map(s => s.showTime),
  expectedAntigravity,
  'Antigravity showtimes must be sorted: 09:45 AM, 01:00 PM, 05:15 PM, 08:30 PM'
);
console.log(`✅ Antigravity sequence: ${antigravitySorted.map(s => s.showTime).join(' -> ')}\n`);

// Test 3: Sort Cinepolis VIP shows
console.log('Test 3: Fix out-of-order display for Cinepolis VIP Cinemas');
const cinepolisRaw = [
  { showTime: '02:45 PM' },
  { showTime: '06:00 PM' },
  { showTime: '09:15 PM' },
  { showTime: '11:30 AM' } // was out of order at index 3 in screenshot
];
const cinepolisSorted = sortShowsChronologically(cinepolisRaw);
const expectedCinepolis = ['11:30 AM', '02:45 PM', '06:00 PM', '09:15 PM'];
assert.deepStrictEqual(
  cinepolisSorted.map(s => s.showTime),
  expectedCinepolis,
  'Cinepolis showtimes must be sorted: 11:30 AM, 02:45 PM, 06:00 PM, 09:15 PM'
);
console.log(`✅ Cinepolis sequence: ${cinepolisSorted.map(s => s.showTime).join(' -> ')}\n`);

// Test 4: Live API Endpoint Chronological Ordering
console.log('Test 4: Verify GET /api/shows returns strictly chronological showtimes across all theatres');
(async () => {
  try {
    const todayStr = dayjs().format('YYYY-MM-DD');
    const res = await axios.get(`${API_BASE}/shows?movieId=1153576&date=${todayStr}`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.shows));

    // Group by theatre
    const byTheatre = {};
    res.data.shows.forEach((s) => {
      if (!byTheatre[s.theatreName]) byTheatre[s.theatreName] = [];
      byTheatre[s.theatreName].push(s);
    });

    for (const [tName, theatreShows] of Object.entries(byTheatre)) {
      for (let i = 0; i < theatreShows.length - 1; i++) {
        const current = theatreShows[i].showTime;
        const next = theatreShows[i + 1].showTime;
        assert.ok(
          compareShowtimes(current, next) <= 0,
          `In ${tName}, ${current} must appear before or at same time as ${next}`
        );
      }
      console.log(`✅ ${tName}: ${theatreShows.map(s => s.showTime).join(', ')} (Chronological)`);
    }

    console.log('\n🎉 ALL SHOWTIME CHRONOLOGICAL SORTING TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ Live API test failed:', err.message);
    process.exit(1);
  }
})();
