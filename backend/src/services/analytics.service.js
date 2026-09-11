import mongoose from 'mongoose';
import { StudySession } from '../models/StudySession.js';
import { Subject } from '../models/Subject.js';
import { Topic } from '../models/Topic.js';
import {
  getDailyPerformance,
  getWeeklyPerformance,
  computeEntityPerformance,
} from './studyPerformance.service.js';
import { getStreakInfo } from './streak.service.js';

const objectId = (value) => new mongoose.Types.ObjectId(value);

export const getOverview = async (userId) => {
  const [totalAgg] = await StudySession.aggregate([
    { $match: { user: objectId(userId), status: 'completed' } },
    {
      $group: {
        _id: null,
        totalMinutes: { $sum: '$completedDurationMinutes' },
        sessionsCompleted: { $sum: 1 },
        pomodorosCompleted: { $sum: '$cyclesCompleted' },
        focusRatingSum: { $sum: { $ifNull: ['$focusRating', 0] } },
        focusRatingCount: { $sum: { $cond: [{ $ifNull: ['$focusRating', false] }, 1, 0] } },
      },
    },
  ]);

  const [missedAgg] = await StudySession.aggregate([
    { $match: { user: objectId(userId), status: { $in: ['abandoned', 'cancelled'] } } },
    { $group: { _id: null, missedSessions: { $sum: 1 } } },
  ]);

  const [daily, weekly, streak] = await Promise.all([
    getDailyPerformance(userId),
    getWeeklyPerformance(userId),
    getStreakInfo(userId),
  ]);

  const totalMinutes = totalAgg?.totalMinutes || 0;
  const sessionsCompleted = totalAgg?.sessionsCompleted || 0;
  const pomodorosCompleted = totalAgg?.pomodorosCompleted || 0;
  const focusRatingCount = totalAgg?.focusRatingCount || 0;
  const focusRatingSum = totalAgg?.focusRatingSum || 0;
  const averageFocusScore = focusRatingCount > 0 ? focusRatingSum / focusRatingCount : 0;
  const averageSessionDuration = sessionsCompleted > 0 ? totalMinutes / sessionsCompleted : 0;

  return {
    totalStudyMinutes: totalMinutes,
    todayStudyMinutes: daily.completedMinutes,
    weeklyStudyMinutes: weekly.completedMinutes,
    plannedMinutes: weekly.plannedMinutes,
    completionPercentage: Math.round(weekly.completionRate * 100),
    sessionsCompleted,
    pomodorosCompleted,
    averageFocusScore: Math.round(averageFocusScore * 100) / 100,
    averageSessionDuration: Math.round(averageSessionDuration * 100) / 100,
    missedSessions: missedAgg?.missedSessions || 0,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
  };
};

export const getDailyAnalytics = async (userId, dateStr) => getDailyPerformance(userId, dateStr);

export const getWeeklyAnalytics = async (userId, startDateStr) => getWeeklyPerformance(userId, startDateStr);

export const getSubjectsAnalytics = async (userId) => {
  const subjects = await Subject.find({ user: userId }).select('_id name');

  const performances = await Promise.all(
    subjects.map(async (subject) => {
      const performance = await computeEntityPerformance(userId, 'subject', subject._id.toString());
      return { subjectId: subject._id, name: subject.name, ...performance };
    })
  );

  const studied = performances.filter((entry) => entry.sessionsCompleted > 0);
  const sorted = [...studied].sort((a, b) => b.performanceScore - a.performanceScore);

  return {
    subjects: performances,
    strongestSubjects: sorted.slice(0, 3),
    weakestSubjects: sorted.slice(-3).reverse(),
  };
};

export const getTopicsAnalytics = async (userId) => {
  const topics = await Topic.find({ user: userId }).select('_id name subject');

  const performances = await Promise.all(
    topics.map(async (topic) => {
      const performance = await computeEntityPerformance(userId, 'topic', topic._id.toString());
      return { topicId: topic._id, name: topic.name, subject: topic.subject, ...performance };
    })
  );

  const studied = performances.filter((entry) => entry.sessionsCompleted > 0);
  const mostStudied = [...studied].sort((a, b) => b.studyMinutes - a.studyMinutes).slice(0, 5);

  return {
    topics: performances,
    mostStudiedTopics: mostStudied,
  };
};

export const getProductivityAnalytics = async (userId) => {
  const weekly = await getWeeklyPerformance(userId);

  const productivityTrend = weekly.days.map((day) => ({
    date: day.date,
    productivityScore: day.productivityScore,
    completionRate: day.completionRate,
    completedMinutes: day.completedMinutes,
  }));

  const averageProductivity =
    weekly.days.length > 0
      ? Math.round(weekly.days.reduce((sum, day) => sum + day.productivityScore, 0) / weekly.days.length)
      : 0;

  return {
    averageProductivity,
    productivityTrend,
  };
};
