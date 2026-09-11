import mongoose from 'mongoose';
import { StudyPlan } from '../models/StudyPlan.js';
import { StudySession } from '../models/StudySession.js';
import { Subject } from '../models/Subject.js';
import { Topic } from '../models/Topic.js';
import { Assignment } from '../models/Assignment.js';
import { Task } from '../models/Task.js';
import { Exam } from '../models/Exam.js';
import { StudyAvailability } from '../models/StudyAvailability.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidObjectId, toMinutes } from '../utils/validators.js';
import { generateAvailableSlots, allocateItemsToSlots, validateScheduleEntries } from './scheduler.service.js';
import { calculateTopicPriority, calculateAssignmentPriority, calculateTaskPriority } from './priority.service.js';
import { getUserTimezone } from './availability.service.js';
import { getLocalDateKey, toDateKey } from '../utils/timezone.js';

const objectId = (value) => new mongoose.Types.ObjectId(value);

const MIN_SESSIONS_FOR_SIGNAL = 3;
const RECENT_WINDOW_DAYS = 14;
const UPCOMING_EXAM_WINDOW_DAYS = 14;
const STRONG_FOCUS_THRESHOLD = 4;
const WEAK_FOCUS_THRESHOLD = 2.5;
const STRONG_COMPLETION_RATE = 0.85;
const WEAK_COMPLETION_RATE = 0.5;
const WEAK_MULTIPLIER = 1.25;
const STRONG_MULTIPLIER = 0.85;

const toDateOnly = (dateKey) => new Date(`${dateKey}T00:00:00.000Z`);

const PRESERVED_ENTRY_STATUSES = new Set(['completed', 'in_progress', 'skipped', 'missed']);
const DUPLICATE_PROTECTED_STATUSES = new Set(['completed', 'in_progress']);

const minutesToTimeLocal = (mins) => {
  const normalized = ((mins % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const entryDateKey = (entry) => toDateKey(entry.date);

const getEntryItemId = (entry) => {
  if (entry.topic) return `topic:${entry.topic.toString()}`;
  if (entry.assignment) return `assignment:${entry.assignment.toString()}`;
  if (entry.task) return `task:${entry.task.toString()}`;
  return null;
};

const buildOccupiedByDateKey = (preservedEntries, dailyStudyLimit) => {
  const occupiedByDateKey = new Map();

  preservedEntries.forEach((entry) => {
    const dateKey = entryDateKey(entry);
    if (!occupiedByDateKey.has(dateKey)) {
      occupiedByDateKey.set(dateKey, { ranges: [], usedMinutes: 0 });
    }
    const bucket = occupiedByDateKey.get(dateKey);
    bucket.ranges.push([toMinutes(entry.startTime), toMinutes(entry.endTime)]);
    bucket.usedMinutes += entry.durationMinutes;
  });

  occupiedByDateKey.forEach((bucket) => {
    bucket.remainingCapacity = Math.max(0, dailyStudyLimit - bucket.usedMinutes);
  });

  return occupiedByDateKey;
};

const adjustSlotsForOccupiedTime = (slots, occupiedByDateKey) => {
  const splitSlots = [];

  slots.forEach((slot) => {
    const dateKey = toDateKey(slot.date);
    const occupied = occupiedByDateKey.get(dateKey);

    if (!occupied || occupied.ranges.length === 0) {
      splitSlots.push(slot);
      return;
    }

    let segments = [[toMinutes(slot.startTime), toMinutes(slot.endTime)]];

    occupied.ranges.forEach(([occStart, occEnd]) => {
      const next = [];
      segments.forEach(([start, end]) => {
        if (occEnd <= start || occStart >= end) {
          next.push([start, end]);
          return;
        }
        if (occStart > start) next.push([start, occStart]);
        if (occEnd < end) next.push([occEnd, end]);
      });
      segments = next;
    });

    segments.forEach(([start, end], index) => {
      if (end - start < 1) return;
      splitSlots.push({
        ...slot,
        slotId: `${slot.slotId}_a${index}`,
        startTime: minutesToTimeLocal(start),
        endTime: minutesToTimeLocal(end),
        durationMinutes: end - start,
      });
    });
  });

  const byDate = new Map();
  splitSlots.forEach((slot) => {
    const dateKey = toDateKey(slot.date);
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, []);
    }
    byDate.get(dateKey).push(slot);
  });

  const finalSlots = [];

  byDate.forEach((daySlots, dateKey) => {
    const occupied = occupiedByDateKey.get(dateKey);
    const limit = occupied ? occupied.remainingCapacity : null;
    const ordered = [...daySlots].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    if (limit === null) {
      finalSlots.push(...ordered);
      return;
    }

    let usedMinutes = 0;
    ordered.forEach((slot) => {
      if (usedMinutes >= limit) return;
      const remaining = limit - usedMinutes;
      if (slot.durationMinutes <= remaining) {
        finalSlots.push(slot);
        usedMinutes += slot.durationMinutes;
        return;
      }
      const startMin = toMinutes(slot.startTime);
      finalSlots.push({
        ...slot,
        endTime: minutesToTimeLocal(startMin + remaining),
        durationMinutes: remaining,
      });
      usedMinutes = limit;
    });
  });

  return finalSlots;
};

const analyzeTopicSignals = async (userId) => {
  const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const rows = await StudySession.aggregate([
    {
      $match: {
        user: objectId(userId),
        topic: { $ne: null },
        createdAt: { $gte: since },
        status: { $in: ['completed', 'abandoned', 'cancelled'] },
      },
    },
    {
      $group: {
        _id: '$topic',
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        total: { $sum: 1 },
        focusRatingSum: { $sum: { $ifNull: ['$focusRating', 0] } },
        focusRatingCount: { $sum: { $cond: [{ $ifNull: ['$focusRating', false] }, 1, 0] } },
      },
    },
  ]);

  return rows.map((row) => ({
    topicId: row._id,
    sessions: row.total,
    completionRate: row.total > 0 ? row.completed / row.total : 0,
    averageFocusScore: row.focusRatingCount > 0 ? row.focusRatingSum / row.focusRatingCount : null,
  }));
};

export const analyzeAdaptiveNeeds = async (userId) => {
  const signals = await analyzeTopicSignals(userId);
  const eligible = signals.filter((signal) => signal.sessions >= MIN_SESSIONS_FOR_SIGNAL);

  const weakTopics = eligible.filter(
    (signal) =>
      signal.completionRate < WEAK_COMPLETION_RATE ||
      (signal.averageFocusScore !== null && signal.averageFocusScore < WEAK_FOCUS_THRESHOLD)
  );

  const strongTopics = eligible.filter(
    (signal) =>
      signal.completionRate >= STRONG_COMPLETION_RATE &&
      (signal.averageFocusScore === null || signal.averageFocusScore >= STRONG_FOCUS_THRESHOLD)
  );

  const timezone = await getUserTimezone(userId);
  const todayKey = getLocalDateKey(new Date(), timezone);
  const today = toDateOnly(todayKey);

  const missedEntries = await StudyPlan.aggregate([
    { $match: { user: objectId(userId), status: 'active' } },
    { $unwind: '$entries' },
    { $match: { 'entries.status': 'missed', 'entries.date': { $lt: today } } },
    {
      $project: {
        _id: 0,
        planId: '$_id',
        entryId: '$entries._id',
        subject: '$entries.subject',
        topic: '$entries.topic',
        assignment: '$entries.assignment',
        task: '$entries.task',
        durationMinutes: '$entries.durationMinutes',
      },
    },
  ]);

  const upcomingExams = await Exam.find({
    user: userId,
    examDate: { $gte: today, $lte: new Date(today.getTime() + UPCOMING_EXAM_WINDOW_DAYS * 24 * 60 * 60 * 1000) },
  }).select('_id title subject examDate');

  const recommendations = [];

  weakTopics.forEach((signal) => {
    recommendations.push({
      type: 'increase_study_time',
      topicId: signal.topicId,
      reason: 'Below-target completion rate or focus score over recent sessions',
      evidence: {
        sessions: signal.sessions,
        completionRate: signal.completionRate,
        averageFocusScore: signal.averageFocusScore,
      },
    });
  });

  strongTopics.forEach((signal) => {
    recommendations.push({
      type: 'reduce_study_time',
      topicId: signal.topicId,
      reason: 'Consistently strong completion rate and focus score over recent sessions',
      evidence: {
        sessions: signal.sessions,
        completionRate: signal.completionRate,
        averageFocusScore: signal.averageFocusScore,
      },
    });
  });

  if (missedEntries.length > 0) {
    recommendations.push({
      type: 'reschedule_missed_work',
      reason: 'Missed study plan entries detected in past active plans',
      evidence: { missedCount: missedEntries.length },
    });
  }

  upcomingExams.forEach((exam) => {
    recommendations.push({
      type: 'prioritize_exam',
      examId: exam._id,
      subjectId: exam.subject,
      reason: 'Exam approaching within the next two weeks',
      evidence: { examDate: exam.examDate },
    });
  });

  return {
    weakTopics: weakTopics.map((signal) => signal.topicId),
    strongTopics: strongTopics.map((signal) => signal.topicId),
    missedEntries,
    upcomingExams,
    recommendations,
  };
};

const buildSummary = (entries) => {
  const subjectIds = new Set();
  const topicIds = new Set();
  let highPriorityCount = 0;

  entries.forEach((entry) => {
    if (entry.subject) subjectIds.add(entry.subject.toString());
    if (entry.topic) topicIds.add(entry.topic.toString());
    if (entry.priority >= 70) highPriorityCount += 1;
  });

  return {
    totalSessions: entries.length,
    subjectsCovered: subjectIds.size,
    topicsCovered: topicIds.size,
    highPriorityCount,
    unscheduledCount: 0,
    constrained: false,
    notes: '',
  };
};

export const applyAdaptiveAdjustments = async (userId, planId) => {
  if (!isValidObjectId(planId)) {
    throw new ApiError(400, 'Invalid study plan id');
  }

  const plan = await StudyPlan.findOne({ _id: planId, user: userId, status: 'active' });
  if (!plan) {
    throw new ApiError(404, 'Active study plan not found');
  }

  const availability = await StudyAvailability.findOne({ user: userId });
  if (!availability) {
    throw new ApiError(422, 'Study availability has not been configured');
  }

  const timezone = await getUserTimezone(userId);
  const todayKey = getLocalDateKey(new Date(), timezone);
  const today = toDateOnly(todayKey);

  const planEndKey = new Date(plan.endDate).toISOString().slice(0, 10);
  if (planEndKey < todayKey) {
    throw new ApiError(409, 'Cannot adaptively adjust a plan that has already ended');
  }

  const { weakTopics, strongTopics } = await analyzeAdaptiveNeeds(userId);
  const weakTopicIds = new Set(weakTopics.map((id) => String(id)));
  const strongTopicIds = new Set(strongTopics.map((id) => String(id)));

  const pastEntries = plan.entries.filter((entry) => entryDateKey(entry) < todayKey);
  const windowEntries = plan.entries.filter((entry) => entryDateKey(entry) >= todayKey);
  const preservedWindowEntries = windowEntries.filter((entry) => PRESERVED_ENTRY_STATUSES.has(entry.status));
  const excludedItemIds = new Set(
    preservedWindowEntries
      .filter((entry) => DUPLICATE_PROTECTED_STATUSES.has(entry.status))
      .map((entry) => getEntryItemId(entry))
      .filter(Boolean)
  );

  const numFutureDays =
    Math.round((new Date(plan.endDate).getTime() - today.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  if (numFutureDays <= 0) {
    return plan;
  }

  const [subjects, topics, assignments, tasks, exams] = await Promise.all([
    Subject.find({ user: userId }),
    Topic.find({ user: userId, status: { $ne: 'completed' } }),
    Assignment.find({ user: userId, status: { $ne: 'completed' } }),
    Task.find({ user: userId, status: { $nin: ['completed', 'cancelled'] } }),
    Exam.find({ user: userId }),
  ]);

  const subjectsById = new Map(subjects.map((subject) => [subject._id.toString(), subject]));

  const nearestExamBySubject = new Map();
  exams.forEach((exam) => {
    if (!exam.subject) return;
    if (new Date(exam.examDate).getTime() < today.getTime()) return;
    const key = exam.subject.toString();
    const existing = nearestExamBySubject.get(key);
    if (!existing || new Date(exam.examDate) < new Date(existing)) {
      nearestExamBySubject.set(key, exam.examDate);
    }
  });

  const referenceDate = new Date();
  const items = [];

  topics.forEach((topic) => {
    const subject = subjectsById.get(topic.subject.toString());
    if (!subject) return;

    const nearestExam = nearestExamBySubject.get(topic.subject.toString()) || null;
    const masteryFactor = Math.min(Math.max((100 - (topic.currentMastery ?? 0)) / 100, 0.15), 1);
    let estimatedMinutes = Math.max(15, Math.round(topic.estimatedHours * 60 * masteryFactor));
    let priorityScore = calculateTopicPriority(topic, subject, nearestExam, referenceDate);

    const key = topic._id.toString();
    let reason = '';

    if (weakTopicIds.has(key)) {
      estimatedMinutes = Math.round(estimatedMinutes * WEAK_MULTIPLIER);
      priorityScore = Math.min(100, Math.round(priorityScore * WEAK_MULTIPLIER));
      reason = 'Increased priority due to recent performance below target';
    } else if (strongTopicIds.has(key)) {
      estimatedMinutes = Math.max(10, Math.round(estimatedMinutes * STRONG_MULTIPLIER));
      priorityScore = Math.max(0, Math.round(priorityScore * STRONG_MULTIPLIER));
      reason = 'Reduced priority due to consistently strong recent performance';
    }

    items.push({
      itemId: `topic:${topic._id.toString()}`,
      type: 'topic',
      refId: topic._id,
      subjectId: subject._id,
      subjectName: subject.name,
      title: topic.name,
      estimatedMinutes,
      priorityScore,
      activityType: topic.status === 'needs_revision' ? 'revision' : 'study',
      reason,
    });
  });

  assignments.forEach((assignment) => {
    const subject = assignment.subject ? subjectsById.get(assignment.subject.toString()) : null;
    items.push({
      itemId: `assignment:${assignment._id.toString()}`,
      type: 'assignment',
      refId: assignment._id,
      subjectId: subject ? subject._id : null,
      subjectName: subject ? subject.name : '',
      title: assignment.title,
      estimatedMinutes: Math.max(15, Math.round(assignment.estimatedHours * 60)),
      priorityScore: calculateAssignmentPriority(assignment, subject, referenceDate),
      activityType: 'assignment',
      reason: '',
    });
  });

  tasks.forEach((task) => {
    const subject = task.subject ? subjectsById.get(task.subject.toString()) : null;
    items.push({
      itemId: `task:${task._id.toString()}`,
      type: 'task',
      refId: task._id,
      subjectId: subject ? subject._id : null,
      subjectName: subject ? subject.name : '',
      title: task.title,
      estimatedMinutes: task.estimatedMinutes || 30,
      priorityScore: calculateTaskPriority(task, subject, referenceDate),
      activityType: 'practice',
      reason: '',
    });
  });

  const eligibleItems = items.filter((item) => !excludedItemIds.has(item.itemId));
  eligibleItems.sort((a, b) => b.priorityScore - a.priorityScore);

  const rawSlots = generateAvailableSlots(availability, today, numFutureDays);
  const occupiedByDateKey = buildOccupiedByDateKey(preservedWindowEntries, availability.dailyStudyLimit);
  const slots = adjustSlotsForOccupiedTime(rawSlots, occupiedByDateKey);
  const { entries: futureEntries, unscheduled } = allocateItemsToSlots(slots, eligibleItems);

  const combinedEntries = [...pastEntries, ...preservedWindowEntries, ...futureEntries];
  const validation = validateScheduleEntries(combinedEntries, availability);
  if (!validation.valid) {
    throw new ApiError(409, validation.errors.join('; '));
  }

  plan.entries = combinedEntries;
  plan.totalPlannedMinutes = combinedEntries.reduce((sum, entry) => sum + entry.durationMinutes, 0);

  const summary = buildSummary(combinedEntries);
  summary.unscheduledCount = unscheduled.length;
  summary.constrained = unscheduled.length > 0;
  summary.notes = summary.constrained
    ? `${unscheduled.length} work item(s) could not be fully scheduled within the available time.`
    : '';
  plan.summary = summary;

  await plan.save();
  return plan;
};
