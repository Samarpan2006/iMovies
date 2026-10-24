const assert = require('assert');
const dayjs = require('dayjs');
const { parseTimeToHoursAndMinutes, isShowtimePast } = require('../utils/timeHelper');

console.log('🧪 Starting Showtime Past Validation Test Suite...\n');

// Test 1: parseTimeToHoursAndMinutes
console.log('Test 1: Verify 12-hour / 24-hour time string parsing');
assert.deepStrictEqual(parseTimeToHoursAndMinutes('09:45 AM'), { hours: 9, minutes: 45 });
assert.deepStrictEqual(parseTimeToHoursAndMinutes('11:30 AM'), { hours: 11, minutes: 30 });
assert.deepStrictEqual(parseTimeToHoursAndMinutes('12:00 PM'), { hours: 12, minutes: 0 });
assert.deepStrictEqual(parseTimeToHoursAndMinutes('12:30 PM'), { hours: 12, minutes: 30 });
assert.deepStrictEqual(parseTimeToHoursAndMinutes('01:00 PM'), { hours: 13, minutes: 0 });
assert.deepStrictEqual(parseTimeToHoursAndMinutes('02:45 PM'), { hours: 14, minutes: 45 });
assert.deepStrictEqual(parseTimeToHoursAndMinutes('07:45 PM'), { hours: 19, minutes: 45 });
assert.deepStrictEqual(parseTimeToHoursAndMinutes('08:30 PM'), { hours: 20, minutes: 30 });
assert.deepStrictEqual(parseTimeToHoursAndMinutes('10:30 PM'), { hours: 22, minutes: 30 });
assert.deepStrictEqual(parseTimeToHoursAndMinutes('12:00 AM'), { hours: 0, minutes: 0 });
console.log('✅ Time parsing verified for morning, noon, afternoon, evening, and midnight.\n');

// Test 2: Current Time Comparison on "Today" (Simulating 7:45 PM / 19:45 on Today)
console.log('Test 2: Verify "Today" showtime comparisons against current system time');
const testTodayStr = dayjs().format('YYYY-MM-DD');
const simulatedCurrentTime = dayjs(`${testTodayStr} 19:45`); // 07:45 PM

// Slots that have already passed before 7:45 PM
assert.strictEqual(
  isShowtimePast(testTodayStr, '09:45 AM', simulatedCurrentTime),
  true,
  '09:45 AM should be marked as past at 7:45 PM'
);
assert.strictEqual(
  isShowtimePast(testTodayStr, '11:30 AM', simulatedCurrentTime),
  true,
  '11:30 AM should be marked as past at 7:45 PM'
);
assert.strictEqual(
  isShowtimePast(testTodayStr, '01:00 PM', simulatedCurrentTime),
  true,
  '01:00 PM should be marked as past at 7:45 PM'
);
assert.strictEqual(
  isShowtimePast(testTodayStr, '02:45 PM', simulatedCurrentTime),
  true,
  '02:45 PM should be marked as past at 7:45 PM'
);
assert.strictEqual(
  isShowtimePast(testTodayStr, '05:15 PM', simulatedCurrentTime),
  true,
  '05:15 PM should be marked as past at 7:45 PM'
);
assert.strictEqual(
  isShowtimePast(testTodayStr, '06:00 PM', simulatedCurrentTime),
  true,
  '06:00 PM should be marked as past at 7:45 PM'
);
assert.strictEqual(
  isShowtimePast(testTodayStr, '07:45 PM', simulatedCurrentTime),
  true,
  '07:45 PM exact start time should be marked as closed'
);

// Slots that are in the future (after 7:45 PM)
assert.strictEqual(
  isShowtimePast(testTodayStr, '08:30 PM', simulatedCurrentTime),
  false,
  '08:30 PM should remain available at 7:45 PM'
);
assert.strictEqual(
  isShowtimePast(testTodayStr, '09:15 PM', simulatedCurrentTime),
  false,
  '09:15 PM should remain available at 7:45 PM'
);
assert.strictEqual(
  isShowtimePast(testTodayStr, '10:30 PM', simulatedCurrentTime),
  false,
  '10:30 PM should remain available at 7:45 PM'
);
console.log('✅ Past slots on Today are strictly marked past; upcoming evening slots remain open.\n');

// Test 3: Future Dates must allow ALL showtimes normally
console.log('Test 3: Verify future dates bypass time checks and allow all scheduled slots');
const tomorrowStr = dayjs().add(1, 'day').format('YYYY-MM-DD');
const nextWeekStr = dayjs().add(5, 'day').format('YYYY-MM-DD');

assert.strictEqual(isShowtimePast(tomorrowStr, '09:45 AM', simulatedCurrentTime), false);
assert.strictEqual(isShowtimePast(tomorrowStr, '01:00 PM', simulatedCurrentTime), false);
assert.strictEqual(isShowtimePast(tomorrowStr, '02:45 PM', simulatedCurrentTime), false);
assert.strictEqual(isShowtimePast(tomorrowStr, '08:30 PM', simulatedCurrentTime), false);

assert.strictEqual(isShowtimePast(nextWeekStr, '09:45 AM', simulatedCurrentTime), false);
assert.strictEqual(isShowtimePast(nextWeekStr, '02:45 PM', simulatedCurrentTime), false);
console.log('✅ Future dates allow booking all scheduled morning, afternoon, and evening times.\n');

// Test 4: Past Dates must mark ALL showtimes as expired
console.log('Test 4: Verify past dates mark all slots as expired');
const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
assert.strictEqual(isShowtimePast(yesterdayStr, '10:30 PM', simulatedCurrentTime), true);
assert.strictEqual(isShowtimePast(yesterdayStr, '01:00 PM', simulatedCurrentTime), true);
console.log('✅ Yesterday and prior dates correctly treat all shows as expired.\n');

console.log('🎉 ALL SHOWTIME PAST VALIDATION TESTS PASSED PERFECTLY!');
