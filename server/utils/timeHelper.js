const dayjs = require('dayjs');

/**
 * Parses a show time string (e.g. "01:00 PM", "9:45 AM", "18:30")
 * into 24-hour hours and minutes numbers.
 * @param {string} timeStr - Time string
 * @returns {{ hours: number, minutes: number } | null}
 */
const parseTimeToHoursAndMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3] ? match[3].toUpperCase() : null;

  if (meridiem) {
    if (meridiem === 'PM' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }
  }

  return { hours, minutes };
};

/**
 * Compares two showtime strings chronologically (from earliest to latest in the day).
 * Properly handles 12-hour AM/PM formats, avoiding alphabetical sorting pitfalls
 * (e.g. '09:45 AM' is ordered before '01:00 PM' and '08:30 PM').
 *
 * @param {string} timeA - First time string (e.g. '09:45 AM')
 * @param {string} timeB - Second time string (e.g. '01:00 PM')
 * @returns {number} Negative if timeA is earlier, positive if timeB is earlier, 0 if equal
 */
const compareShowtimes = (timeA, timeB) => {
  const parsedA = parseTimeToHoursAndMinutes(timeA);
  const parsedB = parseTimeToHoursAndMinutes(timeB);

  if (!parsedA && !parsedB) return 0;
  if (!parsedA) return 1;
  if (!parsedB) return -1;

  const totalMinutesA = parsedA.hours * 60 + parsedA.minutes;
  const totalMinutesB = parsedB.hours * 60 + parsedB.minutes;

  return totalMinutesA - totalMinutesB;
};

/**
 * Sorts an array of show objects chronologically by their `showTime` property.
 * @param {Array} showsList - List of show objects containing `showTime`
 * @returns {Array} New sorted array
 */
const sortShowsChronologically = (showsList) => {
  if (!Array.isArray(showsList)) return [];
  return [...showsList].sort((a, b) => compareShowtimes(a.showTime, b.showTime));
};

/**
 * Validates whether a showtime on a given date has already passed.
 * - If showDate is in the past (< today): returns true
 * - If showDate is in the future (> today): returns false (all scheduled times valid)
 * - If showDate is today: strictly compares show hour & minute against current system time
 *
 * @param {string} showDate - Date string in 'YYYY-MM-DD' format (e.g. '2026-10-23')
 * @param {string} showTime - Time string (e.g. '01:00 PM', '08:30 PM')
 * @param {Date|dayjs.Dayjs} [currentTime] - Optional custom reference time for testing
 * @returns {boolean} true if the show has already started or ended, false if still bookable
 */
const isShowtimePast = (showDate, showTime, currentTime = dayjs()) => {
  if (!showDate || !showTime) return false;

  const now = dayjs(currentTime);
  const todayStr = now.format('YYYY-MM-DD');

  // Future dates: Always allow booking normally
  if (showDate > todayStr) {
    return false;
  }

  // Past dates: Always expired
  if (showDate < todayStr) {
    return true;
  }

  // Today: Compare show hours and minutes with current system time
  const parsed = parseTimeToHoursAndMinutes(showTime);
  if (!parsed) {
    const fallbackDate = dayjs(`${showDate} ${showTime}`);
    return fallbackDate.isValid() ? fallbackDate.isBefore(now) : false;
  }

  const currentHour = now.hour();
  const currentMinute = now.minute();

  if (parsed.hours < currentHour) {
    return true;
  }
  if (parsed.hours === currentHour && parsed.minutes <= currentMinute) {
    return true;
  }

  return false;
};

module.exports = {
  parseTimeToHoursAndMinutes,
  compareShowtimes,
  sortShowsChronologically,
  isShowtimePast
};
