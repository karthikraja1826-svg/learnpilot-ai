import mongoose from 'mongoose';
import { StudyPerformance } from '../models/StudyPerformance.js';
import { StudySession } from '../models/StudySession.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidObjectId } from '../utils/validators.js';
import { getUserTimezone } from './availability.service.js';
import { verifySubjectOwnership } from './subject.service.js';
import { verifyTopicOwnership } from './topic.service.js';
import { getLocalDateKey } from '../utils/timezone.js';

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const PRIOR_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const objectId = (value) => new mongoose.Types.ObjectId(value);

const toDateOnly = (dateKey) => new Date(`${dateKey}T00:00:00.000Z`);

const parseDateOnly = (value) => {
  if (typeof value !== 'string' || !DATE_ONLY_REGEX.test(value)) {
    throw new ApiError(400, 'date must be in YYYY-MM-DD format');
  }
  const date = toDateOnly(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, 'Invalid date');
  }
  return date;
};

const addDaysUTC = (date, days) => {
  const base = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  base.setUTCDate(base.getUTCDate() + days);
  return base;
};

const upsertDailyIncrement = async (userId, dateKey, increments) => {
  const date = toDateOnly(dateKey);
  return StudyPerformance.findOneAndUpdate(
    { user: userId, date },
    { $inc: increments },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const recordSessionStart = async (session, userId) => {
  const timezone = await getUserTimezone(userId);
  const dateKey = getLocalDateKey(session.startTime, timezone);
  await upsertDailyIncrement(userId, dateKey, { plannedMinutes: session.plannedDurationMinutes });
};

export const recordSessionCompletion = async (session, userId) => {
  const timezone = await getUserTimezone(userId);
  const dateKey = getLocalDateKey(session.endTime || new Date(), timezone);

  const increments = {
    completedMinutes: session.completedDurationMinutes,
    sessionsCompleted: 1,
    pomodorosCompleted: session.cyclesCompleted,
    interruptions: session.interruptionCount,
  };

  if (session.focusRating !== null && session.focusRating !== undefined) {
    increments.focusRatingSum = session.focusRating;
    increments.focusRatingCount = 1;
  }

  await upsertDailyIncrement(userId, dateKey, increments);
};

export const recordSessionAbandon = async (session, userId) => {
  const timezone = await getUserTimezone(userId);
  const dateKey = getLocalDateKey(session.endTime || new Date(), timezone);
  await upsertDailyIncrement(userId, dateKey, {
    sessionsAbandoned: 1,
    interruptions: session.interruptionCount,
  });
};

export const recordSessionCancel = async (session, userId) => {
  const timezone = await getUserTimezone(userId);
  const dateKey = getLocalDateKey(session.endTime || new Date(), timezone);
  await upsertDailyIncrement(userId, dateKey, { sessionsCancelled: 1 });
};

const deriveMetrics = (doc) => {
  const plannedMinutes = doc?.plannedMinutes || 0;
  const completedMinutes = doc?.completedMinutes || 0;
  const sessionsCompleted = doc?.sessionsCompleted || 0;
  const sessionsAbandoned = doc?.sessionsAbandoned || 0;
  const sessionsCancelled = doc?.sessionsCancelled || 0;
  const pomodorosCompleted = doc?.pomodorosCompleted || 0;
  const interruptions = doc?.interruptions || 0;
  const focusRatingSum = doc?.focusRatingSum || 0;
  const focusRatingCount = doc?.focusRatingCount || 0;

  const completionRate = plannedMinutes > 0 ? Math.min(1, completedMinutes / plannedMinutes) : 0;
  const averageFocusScore = focusRatingCount > 0 ? focusRatingSum / focusRatingCount : 0;
  const interruptionPenalty = Math.max(0, 1 - interruptions / Math.max(1, sessionsCompleted));
  const productivityScore = Math.round(completionRate * 60 + (averageFocusScore / 5) * 30 + interruptionPenalty * 10);

  return {
    plannedMinutes,
    completedMinutes,
    completionRate: Math.round(completionRate * 100) / 100,
    sessionsCompleted,
    sessionsAbandoned,
    sessionsCancelled,
    pomodorosCompleted,
    interruptions,
    averageFocusScore: Math.round(averageFocusScore * 100) / 100,
    productivityScore: Math.max(0, Math.min(100, productivityScore)),
  };
};

export const getDailyPerformance = async (userId, dateStr) => {
  const timezone = await getUserTimezone(userId);
  const dateKey = dateStr ? dateStr : getLocalDateKey(new Date(), timezone);
  const date = parseDateOnly(dateKey);
  const doc = await StudyPerformance.findOne({ user: userId, date });
  return { date: dateKey, ...deriveMetrics(doc) };
};

export const getWeeklyPerformance = async (userId, startDateStr) => {
  const timezone = await getUserTimezone(userId);
  const startDate = startDateStr
    ? parseDateOnly(startDateStr)
    : addDaysUTC(toDateOnly(getLocalDateKey(new Date(), timezone)), -6);
  const endDate = addDaysUTC(startDate, 6);

  const docs = await StudyPerformance.find({
    user: userId,
    date: { $gte: startDate, $lte: endDate },
  }).sort({ date: 1 });

  const docsByKey = new Map(docs.map((doc) => [doc.date.toISOString().slice(0, 10), doc]));

  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const dayDate = addDaysUTC(startDate, i);
    const key = dayDate.toISOString().slice(0, 10);
    days.push({ date: key, ...deriveMetrics(docsByKey.get(key)) });
  }

  const totals = docs.reduce(
    (acc, doc) => {
      acc.plannedMinutes += doc.plannedMinutes;
      acc.completedMinutes += doc.completedMinutes;
      acc.sessionsCompleted += doc.sessionsCompleted;
      acc.sessionsAbandoned += doc.sessionsAbandoned;
      acc.sessionsCancelled += doc.sessionsCancelled;
      acc.pomodorosCompleted += doc.pomodorosCompleted;
      acc.interruptions += doc.interruptions;
      acc.focusRatingSum += doc.focusRatingSum;
      acc.focusRatingCount += doc.focusRatingCount;
      return acc;
    },
    {
      plannedMinutes: 0,
      completedMinutes: 0,
      sessionsCompleted: 0,
      sessionsAbandoned: 0,
      sessionsCancelled: 0,
      pomodorosCompleted: 0,
      interruptions: 0,
      focusRatingSum: 0,
      focusRatingCount: 0,
    }
  );

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    days,
    ...deriveMetrics(totals),
  };
};

export const computeEntityPerformance = async (userId, field, entityId) => {
  const match = { user: objectId(userId), [field]: objectId(entityId), status: 'completed' };

  const [summary] = await StudySession.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        studyMinutes: { $sum: '$completedDurationMinutes' },
        sessionsCompleted: { $sum: 1 },
        focusRatingSum: { $sum: { $ifNull: ['$focusRating', 0] } },
        focusRatingCount: { $sum: { $cond: [{ $ifNull: ['$focusRating', false] }, 1, 0] } },
        lastStudiedAt: { $max: '$endTime' },
      },
    },
  ]);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - RECENT_WINDOW_MS);
  const fourteenDaysAgo = new Date(now.getTime() - PRIOR_WINDOW_MS);

  const [recentWindow] = await StudySession.aggregate([
    { $match: { ...match, endTime: { $gte: fourteenDaysAgo } } },
    {
      $group: {
        _id: null,
        recentMinutes: { $sum: { $cond: [{ $gte: ['$endTime', sevenDaysAgo] }, '$completedDurationMinutes', 0] } },
        priorMinutes: { $sum: { $cond: [{ $lt: ['$endTime', sevenDaysAgo] }, '$completedDurationMinutes', 0] } },
      },
    },
  ]);

  const studyMinutes = summary?.studyMinutes || 0;
  const sessionsCompleted = summary?.sessionsCompleted || 0;
  const focusRatingCount = summary?.focusRatingCount || 0;
  const focusRatingSum = summary?.focusRatingSum || 0;
  const averageFocusScore = focusRatingCount > 0 ? focusRatingSum / focusRatingCount : 0;
  const recentMinutes = recentWindow?.recentMinutes || 0;
  const priorMinutes = recentWindow?.priorMinutes || 0;

  let trend = 'stable';
  if (recentMinutes > priorMinutes * 1.1) {
    trend = 'improving';
  } else if (recentMinutes < priorMinutes * 0.9) {
    trend = 'declining';
  }

  const performanceScore = Math.round(
    Math.min(100, (averageFocusScore / 5) * 60 + Math.min(1, studyMinutes / 300) * 40)
  );

  return {
    studyMinutes,
    sessionsCompleted,
    averageFocusScore: Math.round(averageFocusScore * 100) / 100,
    performanceScore,
    trend,
    recentMinutes,
    priorMinutes,
    lastStudiedAt: summary?.lastStudiedAt || null,
  };
};

export const getTopicPerformance = async (userId, topicId) => {
  if (!isValidObjectId(topicId)) {
    throw new ApiError(400, 'Invalid topic id');
  }
  await verifyTopicOwnership(topicId, userId);
  const performance = await computeEntityPerformance(userId, 'topic', topicId);
  return { topicId, ...performance, masteryTrend: performance.trend };
};

export const getSubjectPerformance = async (userId, subjectId) => {
  if (!isValidObjectId(subjectId)) {
    throw new ApiError(400, 'Invalid subject id');
  }
  await verifySubjectOwnership(subjectId, userId);
  const performance = await computeEntityPerformance(userId, 'subject', subjectId);
  return { subjectId, ...performance };
};
