import { StudyPerformance } from '../models/StudyPerformance.js';
import { getUserTimezone } from './availability.service.js';
import { getLocalDateKey } from '../utils/timezone.js';

const toDateOnly = (dateKey) => new Date(`${dateKey}T00:00:00.000Z`);

const shiftDateKey = (dateKey, days) => {
  const date = toDateOnly(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const getStreakInfo = async (userId) => {
  const timezone = await getUserTimezone(userId);
  const todayKey = getLocalDateKey(new Date(), timezone);

  const studyDays = await StudyPerformance.find({
    user: userId,
    completedMinutes: { $gt: 0 },
    date: { $lte: toDateOnly(todayKey) },
  }).select('date');

  const dateKeys = new Set(studyDays.map((doc) => doc.date.toISOString().slice(0, 10)));

  let currentStreak = 0;
  let cursor = todayKey;
  if (!dateKeys.has(cursor)) {
    cursor = shiftDateKey(cursor, -1);
  }
  while (dateKeys.has(cursor)) {
    currentStreak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  const sortedKeys = Array.from(dateKeys).sort();
  let longestStreak = 0;
  let running = 0;
  let previousKey = null;
  sortedKeys.forEach((key) => {
    if (previousKey !== null && shiftDateKey(previousKey, 1) === key) {
      running += 1;
    } else {
      running = 1;
    }
    longestStreak = Math.max(longestStreak, running);
    previousKey = key;
  });

  const lastActiveStudyDate = sortedKeys.length > 0 ? sortedKeys[sortedKeys.length - 1] : null;

  return {
    currentStreak,
    longestStreak,
    studyDays: sortedKeys.length,
    lastActiveStudyDate,
  };
};
