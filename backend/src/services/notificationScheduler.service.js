import { StudyPlan } from '../models/StudyPlan.js';
import { Assignment } from '../models/Assignment.js';
import { Exam } from '../models/Exam.js';
import { StudyAvailability } from '../models/StudyAvailability.js';
import { StudyPerformance } from '../models/StudyPerformance.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { resolveTimezone, localDateTimeToUTC, getLocalDateKey } from '../utils/timezone.js';
import { dispatchNotification } from './notification.service.js';

const MISSED_LOOKBACK_MS = 2 * 24 * 60 * 60 * 1000;
const STREAK_RISK_LOCAL_HOUR = 20;

let intervalHandle = null;
let isTicking = false;

const safeDispatch = async (params) => {
  try {
    await dispatchNotification(params);
  } catch (err) {
    console.error('Notification dispatch failed:', err.message);
  }
};

const processStudySessionReminders = async (now) => {
  const windowStart = new Date(now.getTime());
  const windowEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const plans = await StudyPlan.find({
    status: 'active',
    startDate: { $lte: windowEnd },
    endDate: { $gte: windowStart },
    'entries.status': 'scheduled',
  }).select('user entries');

  if (plans.length === 0) {
    return;
  }

  const userIds = [...new Set(plans.map((plan) => String(plan.user)))];
  const [availabilities, users] = await Promise.all([
    StudyAvailability.find({ user: { $in: userIds } }).select('user timezone'),
    User.find({ _id: { $in: userIds } }).select('notificationPreferences'),
  ]);

  const timezoneByUser = new Map(availabilities.map((a) => [String(a.user), resolveTimezone(a.timezone)]));
  const prefsByUser = new Map(users.map((u) => [String(u._id), u.notificationPreferences || {}]));

  for (const plan of plans) {
    const userId = String(plan.user);
    const timezone = timezoneByUser.get(userId) || 'UTC';
    const reminderMinutes = prefsByUser.get(userId)?.studyReminderMinutesBefore || env.studyReminderMinutesBefore;
    const tickToleranceMs = env.notificationSchedulerIntervalMs + 5000;

    for (const entry of plan.entries) {
      if (entry.status !== 'scheduled') {
        continue;
      }

      const entryStart = localDateTimeToUTC(entry.date, entry.startTime, timezone);
      const msUntilStart = entryStart.getTime() - now.getTime();
      const reminderMs = reminderMinutes * 60 * 1000;

      if (msUntilStart <= reminderMs && msUntilStart > reminderMs - tickToleranceMs) {
        await safeDispatch({
          userId: plan.user,
          type: 'study_session_reminder',
          title: 'Upcoming study session',
          body: `${entry.subjectName || 'A study session'} starts in ${reminderMinutes} minutes`,
          url: '/study-plans',
          data: { studyPlanId: String(plan._id), entryId: String(entry._id) },
          dedupeKey: `${userId}:study_session_reminder:${plan._id}:${entry._id}`,
        });
      }

      if (msUntilStart <= 0 && msUntilStart > -tickToleranceMs) {
        await safeDispatch({
          userId: plan.user,
          type: 'study_session_start',
          title: 'Study session starting',
          body: `${entry.subjectName || 'Your study session'} is starting now`,
          url: '/study-plans',
          data: { studyPlanId: String(plan._id), entryId: String(entry._id) },
          dedupeKey: `${userId}:study_session_start:${plan._id}:${entry._id}`,
        });
      }
    }
  }
};

const processMissedSessionNotifications = async (now) => {
  const lookback = new Date(now.getTime() - MISSED_LOOKBACK_MS);

  const plans = await StudyPlan.find({
    'entries.status': 'missed',
    endDate: { $gte: lookback },
  }).select('user entries');

  for (const plan of plans) {
    for (const entry of plan.entries) {
      if (entry.status !== 'missed') {
        continue;
      }

      await safeDispatch({
        userId: plan.user,
        type: 'study_session_missed',
        title: 'Missed study session',
        body: `You missed ${entry.subjectName || 'a scheduled study session'}`,
        url: '/study-plans',
        data: { studyPlanId: String(plan._id), entryId: String(entry._id) },
        dedupeKey: `${String(plan.user)}:study_session_missed:${plan._id}:${entry._id}`,
      });
    }
  }
};

const processAssignmentReminders = async (now) => {
  const windowEnd = new Date(now.getTime() + env.deadlineReminderHoursBefore * 60 * 60 * 1000);

  const assignments = await Assignment.find({
    status: { $in: ['pending', 'in_progress'] },
    deadline: { $gte: now, $lte: windowEnd },
  }).select('user title deadline');

  for (const assignment of assignments) {
    await safeDispatch({
      userId: assignment.user,
      type: 'assignment_deadline',
      title: 'Assignment deadline approaching',
      body: `"${assignment.title}" is due soon`,
      url: '/assignments',
      data: { assignmentId: String(assignment._id), deadline: assignment.deadline },
      dedupeKey: `${String(assignment.user)}:assignment_deadline:${assignment._id}`,
      expiresAt: assignment.deadline,
    });
  }
};

const processExamReminders = async (now) => {
  const windowEnd = new Date(now.getTime() + env.deadlineReminderHoursBefore * 60 * 60 * 1000);

  const exams = await Exam.find({
    examDate: { $gte: now, $lte: windowEnd },
  }).select('user title examDate');

  for (const exam of exams) {
    await safeDispatch({
      userId: exam.user,
      type: 'exam_reminder',
      title: 'Upcoming exam',
      body: `"${exam.title}" is coming up soon`,
      url: '/exams',
      data: { examId: String(exam._id), examDate: exam.examDate },
      dedupeKey: `${String(exam.user)}:exam_reminder:${exam._id}`,
      expiresAt: exam.examDate,
    });
  }
};

const processStreakAtRisk = async (now) => {
  const availabilities = await StudyAvailability.find({}).select('user timezone');

  for (const availability of availabilities) {
    const timezone = resolveTimezone(availability.timezone);
    const localHour = parseInt(
      new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', hour12: false }).format(now),
      10
    );

    if (localHour < STREAK_RISK_LOCAL_HOUR) {
      continue;
    }

    const todayKey = getLocalDateKey(now, timezone);
    const todayStart = new Date(`${todayKey}T00:00:00.000Z`);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const studiedToday = await StudyPerformance.exists({
      user: availability.user,
      date: { $gte: todayStart, $lt: todayEnd },
      completedMinutes: { $gt: 0 },
    });

    if (studiedToday) {
      continue;
    }

    const hasPriorActivity = await StudyPerformance.exists({
      user: availability.user,
      date: { $lt: todayStart },
      completedMinutes: { $gt: 0 },
    });

    if (!hasPriorActivity) {
      continue;
    }

    await safeDispatch({
      userId: availability.user,
      type: 'streak',
      title: 'Your streak is at risk',
      body: 'You have not studied today. Keep your streak alive.',
      url: '/streaks',
      data: { date: todayKey },
      dedupeKey: `${String(availability.user)}:streak_at_risk:${todayKey}`,
    });
  }
};

const tick = async () => {
  if (isTicking) {
    return;
  }

  isTicking = true;
  const now = new Date();

  try {
    await processStudySessionReminders(now);
    await processMissedSessionNotifications(now);
    await processAssignmentReminders(now);
    await processExamReminders(now);
    await processStreakAtRisk(now);
  } catch (err) {
    console.error('Notification scheduler tick failed:', err.message);
  } finally {
    isTicking = false;
  }
};

export const startNotificationScheduler = () => {
  if (intervalHandle) {
    return;
  }

  intervalHandle = setInterval(tick, env.notificationSchedulerIntervalMs);
  intervalHandle.unref();
  tick();
};

export const stopNotificationScheduler = () => {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
};
