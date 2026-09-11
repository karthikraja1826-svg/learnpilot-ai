import { StudyPlan, PLAN_STATUS_VALUES } from '../models/StudyPlan.js';
import { Subject } from '../models/Subject.js';
import { Topic } from '../models/Topic.js';
import { Exam } from '../models/Exam.js';
import { Assignment } from '../models/Assignment.js';
import { Task } from '../models/Task.js';
import { StudyAvailability } from '../models/StudyAvailability.js';
import { StudySession } from '../models/StudySession.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidObjectId } from '../utils/validators.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { startOfLocalDay, resolveTimezone } from '../utils/timezone.js';
import {
  PRIORITY_WEIGHTS,
  calculateTopicPriority,
  calculateAssignmentPriority,
  calculateTaskPriority,
} from './priority.service.js';
import {
  generateAvailableSlots,
  allocateItemsToSlots,
  applyGroqAllocation,
  validateScheduleEntries,
  ScheduleValidationError,
} from './scheduler.service.js';
import { requestStudyPlanCompletion, isGroqConfigured, GroqServiceError } from './groq.service.js';
import { env } from '../config/env.js';
import * as subjectService from './subject.service.js';

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const startOfUTCDay = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const addDaysUTC = (date, days) => {
  const base = startOfUTCDay(date);
  base.setUTCDate(base.getUTCDate() + days);
  return base;
};

const dateKey = (date) => startOfUTCDay(new Date(date)).toISOString().slice(0, 10);

const getUserTimezone = async (userId) => {
  const availability = await StudyAvailability.findOne({ user: userId }).select('timezone');
  return resolveTimezone(availability?.timezone);
};

const parseDateOnly = (value) => {
  if (typeof value !== 'string' || !DATE_ONLY_REGEX.test(value)) {
    throw new ApiError(400, 'Date must be in YYYY-MM-DD format');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, 'Invalid date');
  }
  return date;
};

const daysUntil = (date, referenceDate) => Math.ceil((new Date(date).getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));

// When subjectId is provided, every collection is scoped to that single
// subject so the resulting work items (and therefore the generated plan)
// only ever cover that subject. This is what powers the Part 2 "AI Daily
// Roadmap", which must stay focused on the user's active optimization
// subject rather than the whole academic workload.
export const loadAcademicData = async (userId, { subjectId } = {}) => {
  const subjectFilter = subjectId ? { user: userId, _id: subjectId } : { user: userId };
  const relatedFilter = subjectId ? { user: userId, subject: subjectId } : { user: userId };

  const [subjects, topics, exams, assignments, tasks, availability] = await Promise.all([
    Subject.find(subjectFilter),
    Topic.find(relatedFilter),
    Exam.find(relatedFilter),
    Assignment.find({ ...relatedFilter, status: { $ne: 'completed' } }),
    Task.find({ ...relatedFilter, status: { $nin: ['completed', 'cancelled'] } }),
    StudyAvailability.findOne({ user: userId }),
  ]);

  return { subjects, topics, exams, assignments, tasks, availability };
};

const ensureMinimumData = (data) => {
  if (!data.availability) {
    throw new ApiError(
      422,
      'Study availability has not been configured. Please set up your weekly availability before generating a plan.'
    );
  }

  const hasSchedulableWork = data.topics.length > 0 || data.assignments.length > 0 || data.tasks.length > 0;

  if (!hasSchedulableWork) {
    throw new ApiError(
      422,
      'A subject alone is not enough to generate a study plan. Add at least one topic, assignment, or task with actual study work.'
    );
  }
};

export const ensureRoadmapData = (subject, data) => {
  if (!data.availability) {
    throw new ApiError(
      422,
      'Study availability has not been configured. Please set up your weekly availability before generating a roadmap.'
    );
  }

  const hasSchedulableWork = data.topics.length > 0 || data.assignments.length > 0 || data.tasks.length > 0;

  if (!hasSchedulableWork) {
    throw new ApiError(
      422,
      `${subject.name} doesn't have any topics, assignments, or tasks yet. Add some study work for this subject before generating today's roadmap.`
    );
  }
};

const buildTopicReason = (topic, subject, nearestExam, referenceDate) => {
  const parts = [`${topic.currentMastery ?? 0}% mastery in ${subject?.name || 'subject'}`];
  if (nearestExam) {
    const days = Math.max(0, daysUntil(nearestExam, referenceDate));
    parts.push(`exam in ${days} day${days === 1 ? '' : 's'}`);
  }
  if (topic.status === 'needs_revision') {
    parts.push('flagged for revision');
  }
  return parts.join(', ');
};

const buildAssignmentReason = (assignment, referenceDate) => {
  const days = daysUntil(assignment.deadline, referenceDate);
  const deadlineText = days < 0 ? 'overdue' : days === 0 ? 'due today' : `due in ${days} day${days === 1 ? '' : 's'}`;
  return `Assignment ${deadlineText}, priority ${assignment.priority}`;
};

const buildTaskReason = (task, referenceDate) => {
  if (task.dueDate) {
    const days = daysUntil(task.dueDate, referenceDate);
    const deadlineText = days < 0 ? 'overdue' : days === 0 ? 'due today' : `due in ${days} day${days === 1 ? '' : 's'}`;
    return `Task ${deadlineText}, priority ${task.priority}`;
  }
  return `Task priority ${task.priority}`;
};

export const buildWorkItems = (data, referenceDate) => {
  const subjectsById = new Map(data.subjects.map((subject) => [subject._id.toString(), subject]));

  const nearestExamBySubject = new Map();
  data.exams.forEach((exam) => {
    if (!exam.subject) return;
    if (new Date(exam.examDate).getTime() < referenceDate.getTime()) return;
    const key = exam.subject.toString();
    const existing = nearestExamBySubject.get(key);
    if (!existing || new Date(exam.examDate) < new Date(existing)) {
      nearestExamBySubject.set(key, exam.examDate);
    }
  });

  const items = [];

  data.topics.forEach((topic) => {
    const subject = subjectsById.get(topic.subject.toString());
    if (!subject) return;

    const nearestExam = nearestExamBySubject.get(topic.subject.toString()) || null;

    let estimatedMinutes;
    let activityType;

    if (topic.status === 'completed') {
      if (!nearestExam || daysUntil(nearestExam, referenceDate) > 14) {
        return;
      }
      estimatedMinutes = Math.max(20, Math.round(topic.estimatedHours * 60 * 0.2));
      activityType = 'review';
    } else {
      const masteryFactor = Math.min(Math.max((100 - (topic.currentMastery ?? 0)) / 100, 0.15), 1);
      estimatedMinutes = Math.max(15, Math.round(topic.estimatedHours * 60 * masteryFactor));
      activityType = topic.status === 'needs_revision' ? 'revision' : 'study';
    }

    items.push({
      itemId: `topic:${topic._id.toString()}`,
      type: 'topic',
      refId: topic._id,
      subjectId: subject._id,
      subjectName: subject.name,
      title: topic.name,
      estimatedMinutes,
      priorityScore: calculateTopicPriority(topic, subject, nearestExam, referenceDate),
      activityType,
      reason: buildTopicReason(topic, subject, nearestExam, referenceDate),
      deadline: nearestExam,
    });
  });

  data.assignments.forEach((assignment) => {
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
      reason: buildAssignmentReason(assignment, referenceDate),
      deadline: assignment.deadline,
    });
  });

  data.tasks.forEach((task) => {
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
      reason: buildTaskReason(task, referenceDate),
      deadline: task.dueDate,
    });
  });

  items.sort((a, b) => b.priorityScore - a.priorityScore);

  return items;
};

const NO_VALUE = 'Not provided';

// Builds the Part 2 roadmap personalization context (real MongoDB data only)
// consumed by buildGroqPrompt below. Only called for generateSubjectRoadmap —
// generateDailyPlan/generateWeeklyPlan never pass a context, so their Groq
// prompt is unchanged.
const buildRoadmapPersonalizationContext = async (userId, subject, data) => {
  const user = await User.findById(userId).select(
    'educationLevel course timezone academicGoals shortTermGoals longTermGoals improvementAreas learningInterests dailyStudyTarget preferredStudyPeriods preferredSessionDuration breakDuration additionalInformation'
  );

  const studentProfile = {
    educationLevel: user?.educationLevel || NO_VALUE,
    course: user?.course || NO_VALUE,
    timezone: data.availability?.timezone || user?.timezone || NO_VALUE,
  };

  const studyGoals = {
    academicGoals: user?.academicGoals || NO_VALUE,
    shortTermGoals: user?.shortTermGoals || NO_VALUE,
    longTermGoals: user?.longTermGoals || NO_VALUE,
    improvementAreas: user?.improvementAreas || NO_VALUE,
    learningInterests: user?.learningInterests || NO_VALUE,
    additionalInformation: user?.additionalInformation || NO_VALUE,
  };

  const selectedSubject = {
    name: subject.name,
    difficulty: subject.difficulty,
    importance: subject.importance,
    currentPerformance: subject.currentPerformance,
    targetPerformance: subject.targetPerformance,
  };

  const topicMasteryByTopicId = new Map(
    data.topics.map((topic) => [
      topic._id.toString(),
      { currentMastery: topic.currentMastery, targetMastery: topic.targetMastery, status: topic.status },
    ])
  );

  const topicsAndMastery = data.topics.map((topic) => ({
    name: topic.name,
    currentMastery: topic.currentMastery,
    targetMastery: topic.targetMastery,
    difficulty: topic.difficulty,
    estimatedMinutes: Math.round(topic.estimatedHours * 60),
    status: topic.status,
  }));

  const studyPreferences = {
    dailyStudyTargetGoal: user?.dailyStudyTarget || NO_VALUE,
    dailyStudyLimitMinutes: data.availability?.dailyStudyLimit ?? NO_VALUE,
    preferredSessionDurationMinutes: data.availability?.preferredSessionDuration ?? NO_VALUE,
    preferredBreakDurationMinutes: data.availability?.preferredBreakDuration ?? NO_VALUE,
    preferredStudyPeriods:
      (data.availability?.preferredStudyPeriods?.length
        ? data.availability.preferredStudyPeriods
        : user?.preferredStudyPeriods) || [],
    timezone: data.availability?.timezone || user?.timezone || NO_VALUE,
  };

  const recentSessions = await StudySession.find({
    user: userId,
    subject: subject._id,
    status: 'completed',
  })
    .sort({ endTime: -1, createdAt: -1 })
    .limit(10)
    .select('topic plannedDurationMinutes actualDurationMinutes completionPercentage endTime createdAt');

  const topicNameById = new Map(data.topics.map((topic) => [topic._id.toString(), topic.name]));

  const recentCompletedStudySessions = recentSessions.map((session) => ({
    topic: session.topic ? topicNameById.get(session.topic.toString()) || 'Unknown topic' : 'General',
    plannedMinutes: session.plannedDurationMinutes,
    actualMinutes: session.actualDurationMinutes,
    completionPercentage: session.completionPercentage,
    date: (session.endTime || session.createdAt).toISOString(),
  }));

  const averageCompletionPercentage =
    recentSessions.length > 0
      ? Math.round(
          recentSessions.reduce((sum, session) => sum + (session.completionPercentage || 0), 0) / recentSessions.length
        )
      : null;

  return {
    studentProfile,
    studyGoals,
    selectedSubject,
    topicsAndMastery,
    topicMasteryByTopicId,
    studyPreferences,
    hasSessionHistory: recentSessions.length > 0,
    completedSessionCount: recentSessions.length,
    averageCompletionPercentage,
    recentCompletedStudySessions,
  };
};

const withTopicMastery = (item, context) => {
  if (!context || item.type !== 'topic') {
    return {};
  }
  const mastery = context.topicMasteryByTopicId.get(item.refId.toString());
  if (!mastery) {
    return {};
  }
  return {
    currentMastery: mastery.currentMastery,
    targetMastery: mastery.targetMastery,
    topicStatus: mastery.status,
  };
};

const buildGroqPrompt = (slots, items, planType, context) => {
  const baseSystemPrompt =
    'You are a deterministic study-scheduling assistant embedded in a backend system. ' +
    'You must respond with ONLY a single JSON object and nothing else: no markdown, no code fences, no prose. ' +
    'The JSON object must match this schema exactly: ' +
    '{"entries":[{"slotId":string,"itemId":string,"durationMinutes":number,"activityType":string,"reason":string}],"summaryNotes":string}. ' +
    'Only use slotId values and itemId values from the lists provided in the user message. ' +
    'Never invent a slotId or itemId. Never assign more durationMinutes to an item than its estimatedMinutes. ' +
    'Never assign more total durationMinutes to a slot than its durationMinutes. ' +
    'Prefer scheduling higher priorityScore items earlier and give topics near their exam deadlines more emphasis.';

  const roadmapSystemPrompt = context
    ? ' You are generating a personalized daily study roadmap for one selected subject only. ' +
      'The user message is organized into these sections: studentProfile, studyGoals, selectedSubject, ' +
      'topicsAndMastery, studyPreferences, availableTime (the slots list), recentCompletedStudySessions, ' +
      'academicDeadlines, and roadmapRequirements. Never change or substitute selectedSubject. ' +
      'Prioritize topics with the largest gap between currentMastery and targetMastery, and any topic whose ' +
      'topicStatus is needs_revision. Use recentCompletedStudySessions to avoid repeating already-mastered work ' +
      'and to judge realistic pacing; if it says there is no history, plan conservatively. Respect studyPreferences ' +
      '(preferred study periods, session duration, break duration, daily study limit) and never exceed the total ' +
      'minutes available across the slots. Give the strongest scheduling priority to academicDeadlines items that ' +
      'are due soonest. Do not produce an unrealistic workload — leaving lower-priority items unscheduled is ' +
      'acceptable.'
    : '';

  const systemPrompt = baseSystemPrompt + roadmapSystemPrompt;

  const payload = {
    planType,
    ...(context
      ? {
          studentProfile: context.studentProfile,
          studyGoals: context.studyGoals,
          selectedSubject: context.selectedSubject,
          topicsAndMastery: context.topicsAndMastery,
          studyPreferences: context.studyPreferences,
          recentCompletedStudySessions: context.hasSessionHistory
            ? {
                count: context.completedSessionCount,
                averageCompletionPercentage: context.averageCompletionPercentage,
                sessions: context.recentCompletedStudySessions,
              }
            : 'No previous study session history for this subject.',
          academicDeadlines: items
            .filter((item) => item.type !== 'topic')
            .map((item) => ({
              title: item.title,
              subject: item.subjectName,
              estimatedMinutes: item.estimatedMinutes,
              priorityScore: item.priorityScore,
              deadline: item.deadline ? new Date(item.deadline).toISOString() : null,
              activityType: item.activityType,
            })),
          roadmapRequirements: [
            'Generate a realistic roadmap only for the selected subject.',
            'Prioritize weak topics (large currentMastery/targetMastery gap) and topics needing revision.',
            'Factor in recent completed study sessions before assigning new workload.',
            'Never schedule more total time than the availableTime slots allow.',
            'Respect preferred study periods, session duration, and break duration.',
            'Give approaching academic deadlines appropriate priority.',
            'Only use slotId and itemId values from the lists provided.',
          ],
        }
      : {}),
    slots: slots.map((slot) => ({
      slotId: slot.slotId,
      date: dateKey(slot.date),
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationMinutes: slot.durationMinutes,
    })),
    items: items.map((item) => ({
      itemId: item.itemId,
      type: item.type,
      subject: item.subjectName,
      title: item.title,
      estimatedMinutes: item.estimatedMinutes,
      priorityScore: item.priorityScore,
      deadline: item.deadline ? new Date(item.deadline).toISOString() : null,
      suggestedActivityType: item.activityType,
      ...withTopicMastery(item, context),
    })),
  };

  const userPrompt = JSON.stringify(payload);

  return { systemPrompt, userPrompt };
};

export const computeUnscheduled = (items, entries) => {
  const usedByItem = new Map();

  entries.forEach((entry) => {
    const refId = entry.topic || entry.assignment || entry.task;
    if (!refId) return;
    const key = refId.toString();
    usedByItem.set(key, (usedByItem.get(key) || 0) + entry.durationMinutes);
  });

  return items
    .map((item) => {
      const used = usedByItem.get(item.refId.toString()) || 0;
      return { ...item, remainingMinutes: item.estimatedMinutes - used };
    })
    .filter((item) => item.remainingMinutes > 0);
};

const runScheduling = async ({ slots, items, availability, planType, context }) => {
  if (slots.length === 0) {
    return {
      entries: [],
      unscheduled: items,
      source: 'algorithm',
      aiUsed: false,
      aiModel: null,
      aiFallbackReason: null,
    };
  }

  if (isGroqConfigured() && items.length > 0) {
    try {
      const { systemPrompt, userPrompt } = buildGroqPrompt(slots, items, planType, context);
      const groqResponse = await requestStudyPlanCompletion({ systemPrompt, userPrompt });
      const groqEntries = applyGroqAllocation(groqResponse, slots, items);
      const validation = validateScheduleEntries(groqEntries, availability);

      if (!validation.valid) {
        throw new ScheduleValidationError(validation.errors);
      }

      return {
        entries: groqEntries,
        unscheduled: computeUnscheduled(items, groqEntries),
        source: 'ai',
        aiUsed: true,
        aiModel: env.groqModel,
        aiFallbackReason: null,
      };
    } catch (err) {
      const reason =
        err instanceof GroqServiceError
          ? err.reason
          : err instanceof ScheduleValidationError
            ? 'invalid_ai_output'
            : 'unknown_error';

      const baseline = allocateItemsToSlots(slots, items);

      return {
        entries: baseline.entries,
        unscheduled: baseline.unscheduled,
        source: 'algorithm',
        aiUsed: false,
        aiModel: null,
        aiFallbackReason: reason,
      };
    }
  }

  const baseline = allocateItemsToSlots(slots, items);

  return {
    entries: baseline.entries,
    unscheduled: baseline.unscheduled,
    source: 'algorithm',
    aiUsed: false,
    aiModel: null,
    aiFallbackReason: null,
  };
};

export const computeSummary = (entries, unscheduledCount) => {
  const subjectIds = new Set();
  const topicIds = new Set();
  let highPriorityCount = 0;

  entries.forEach((entry) => {
    if (entry.subject) subjectIds.add(entry.subject.toString());
    if (entry.topic) topicIds.add(entry.topic.toString());
    if (entry.priority >= 70) highPriorityCount += 1;
  });

  const constrained = unscheduledCount > 0;

  return {
    totalSessions: entries.length,
    subjectsCovered: subjectIds.size,
    topicsCovered: topicIds.size,
    highPriorityCount,
    unscheduledCount,
    constrained,
    notes: constrained
      ? `${unscheduledCount} work item(s) could not be fully scheduled within the available time.`
      : '',
  };
};

export const persistPlan = async ({
  userId,
  planType,
  startDate,
  endDate,
  schedulingResult,
  generationDurationMs,
  version,
  previousPlan,
  optimizationSubject,
}) => {
  const totalPlannedMinutes = schedulingResult.entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const summary = computeSummary(schedulingResult.entries, schedulingResult.unscheduled.length);

  const plan = await StudyPlan.create({
    user: userId,
    planType,
    startDate,
    endDate,
    generatedAt: new Date(),
    version: version || 1,
    previousPlan: previousPlan || null,
    status: 'active',
    optimizationSubject: optimizationSubject || null,
    source: schedulingResult.source,
    totalPlannedMinutes,
    entries: schedulingResult.entries,
    summary,
    generationMetadata: {
      aiUsed: schedulingResult.aiUsed,
      aiModel: schedulingResult.aiModel,
      aiFallbackReason: schedulingResult.aiFallbackReason,
      generationDurationMs,
      priorityWeights: PRIORITY_WEIGHTS,
    },
  });

  return plan;
};

export const generateDailyPlan = async (userId, options = {}, versionInfo = {}) => {
  const generationStart = Date.now();
  const referenceDate = new Date();

  const data = await loadAcademicData(userId);
  ensureMinimumData(data);

  const timezone = resolveTimezone(data.availability?.timezone);
  const targetDate = options.date ? parseDateOnly(options.date) : startOfLocalDay(referenceDate, timezone);

  const items = buildWorkItems(data, referenceDate);
  const slots = generateAvailableSlots(data.availability, targetDate, 1);

  const schedulingResult = await runScheduling({
    slots,
    items,
    availability: data.availability,
    planType: 'daily',
  });

  return persistPlan({
    userId,
    planType: 'daily',
    startDate: targetDate,
    endDate: targetDate,
    schedulingResult,
    generationDurationMs: Date.now() - generationStart,
    version: versionInfo.version,
    previousPlan: versionInfo.previousPlan,
  });
};

export const generateWeeklyPlan = async (userId, options = {}, versionInfo = {}) => {
  const generationStart = Date.now();
  const referenceDate = new Date();

  const data = await loadAcademicData(userId);
  ensureMinimumData(data);

  const timezone = resolveTimezone(data.availability?.timezone);
  const startDate = options.startDate ? parseDateOnly(options.startDate) : startOfLocalDay(referenceDate, timezone);
  const endDate = addDaysUTC(startDate, 6);

  const items = buildWorkItems(data, referenceDate);
  const slots = generateAvailableSlots(data.availability, startDate, 7);

  const schedulingResult = await runScheduling({
    slots,
    items,
    availability: data.availability,
    planType: 'weekly',
  });

  return persistPlan({
    userId,
    planType: 'weekly',
    startDate,
    endDate,
    schedulingResult,
    generationDurationMs: Date.now() - generationStart,
    version: versionInfo.version,
    previousPlan: versionInfo.previousPlan,
  });
};

// ---------------------------------------------------------------------------
// Part 2 — AI Daily Roadmap
//
// A "roadmap" is a regular `daily` StudyPlan, generated with the exact same
// availability/priority/Groq scheduling pipeline as generateDailyPlan above,
// but with every input (topics, exams, assignments, tasks) filtered down to
// the user's single active optimization subject (see subject.service.js /
// User.activeOptimizationSubject). The resulting plan is tagged with
// `optimizationSubject` so it can be distinguished from — and never mixed
// with — the general, all-subjects daily/weekly plans above.
// ---------------------------------------------------------------------------

export const generateSubjectRoadmap = async (userId, options = {}, versionInfo = {}) => {
  const generationStart = Date.now();
  const referenceDate = new Date();

  const { subject } = await subjectService.getActiveOptimizationSubject(userId);
  if (!subject) {
    throw new ApiError(
      422,
      'No active optimization subject selected. Choose a subject to optimize before generating a roadmap.'
    );
  }

  const data = await loadAcademicData(userId, { subjectId: subject._id });
  ensureRoadmapData(subject, data);

  const timezone = resolveTimezone(data.availability?.timezone);
  const targetDate = options.date ? parseDateOnly(options.date) : startOfLocalDay(referenceDate, timezone);

  const items = buildWorkItems(data, referenceDate);
  const slots = generateAvailableSlots(data.availability, targetDate, 1);
  const context = await buildRoadmapPersonalizationContext(userId, subject, data);

  const schedulingResult = await runScheduling({
    slots,
    items,
    availability: data.availability,
    planType: 'daily',
    context,
  });

  return persistPlan({
    userId,
    planType: 'daily',
    startDate: targetDate,
    endDate: targetDate,
    schedulingResult,
    generationDurationMs: Date.now() - generationStart,
    version: versionInfo.version,
    previousPlan: versionInfo.previousPlan,
    optimizationSubject: subject._id,
  });
};

export const getTodayRoadmap = async (userId) => {
  const { subject } = await subjectService.getActiveOptimizationSubject(userId);
  if (!subject) {
    return { plan: null, subject: null };
  }

  const timezone = await getUserTimezone(userId);
  const today = startOfLocalDay(new Date(), timezone);

  const plan = await StudyPlan.findOne({
    user: userId,
    planType: 'daily',
    optimizationSubject: subject._id,
    startDate: today,
    status: { $ne: 'archived' },
  }).sort({ generatedAt: -1 });

  return { plan, subject };
};

const getOwnedPlanOrThrow = async (planId, userId) => {
  if (!isValidObjectId(planId)) {
    throw new ApiError(400, 'Invalid study plan id');
  }
  const plan = await StudyPlan.findOne({ _id: planId, user: userId });
  if (!plan) {
    throw new ApiError(404, 'Study plan not found');
  }
  return plan;
};

export const listPlans = async (userId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { user: userId };

  if (query.planType !== undefined) {
    if (!['daily', 'weekly'].includes(query.planType)) {
      throw new ApiError(400, 'planType must be daily or weekly');
    }
    filter.planType = query.planType;
  }

  if (query.status !== undefined) {
    if (!PLAN_STATUS_VALUES.includes(query.status)) {
      throw new ApiError(400, `status must be one of: ${PLAN_STATUS_VALUES.join(', ')}`);
    }
    filter.status = query.status;
  }

  if (query.startDate !== undefined || query.endDate !== undefined) {
    filter.startDate = {};
    if (query.startDate !== undefined) {
      filter.startDate.$gte = parseDateOnly(query.startDate);
    }
    if (query.endDate !== undefined) {
      filter.startDate.$lte = parseDateOnly(query.endDate);
    }
  }

  const [plans, total] = await Promise.all([
    StudyPlan.find(filter).sort({ startDate: -1, generatedAt: -1 }).skip(skip).limit(limit),
    StudyPlan.countDocuments(filter),
  ]);

  return { plans, pagination: buildPaginationMeta(page, limit, total) };
};

export const getPlanById = async (planId, userId) => getOwnedPlanOrThrow(planId, userId);

export const getTodayPlan = async (userId) => {
  const timezone = await getUserTimezone(userId);
  const today = startOfLocalDay(new Date(), timezone);
  return StudyPlan.findOne({
    user: userId,
    planType: 'daily',
    startDate: today,
    status: { $ne: 'archived' },
  }).sort({ generatedAt: -1 });
};

export const getCurrentWeekPlan = async (userId) => {
  const timezone = await getUserTimezone(userId);
  const today = startOfLocalDay(new Date(), timezone);
  return StudyPlan.findOne({
    user: userId,
    planType: 'weekly',
    startDate: { $lte: today },
    endDate: { $gte: today },
    status: { $ne: 'archived' },
  }).sort({ generatedAt: -1 });
};

export const regeneratePlan = async (planId, userId) => {
  const existing = await getOwnedPlanOrThrow(planId, userId);

  const versionInfo = { version: existing.version + 1, previousPlan: existing._id };

  // A roadmap (optimizationSubject set) always regenerates against whichever
  // subject is *currently* the user's active optimization subject, via
  // generateSubjectRoadmap — this is what keeps regeneration respecting the
  // selected optimization subject even if entries/availability changed.
  let newPlan;
  if (existing.optimizationSubject) {
    newPlan = await generateSubjectRoadmap(userId, { date: dateKey(existing.startDate) }, versionInfo);
  } else if (existing.planType === 'daily') {
    newPlan = await generateDailyPlan(userId, { date: dateKey(existing.startDate) }, versionInfo);
  } else {
    newPlan = await generateWeeklyPlan(userId, { startDate: dateKey(existing.startDate) }, versionInfo);
  }

  existing.status = 'archived';
  await existing.save();

  return newPlan;
};

const sanitizeManualEntries = (rawEntries) => {
  if (!Array.isArray(rawEntries)) {
    throw new ApiError(400, 'entries must be an array');
  }

  return rawEntries.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new ApiError(400, `entries[${index}] must be an object`);
    }

    ['subject', 'topic', 'assignment', 'task'].forEach((field) => {
      if (entry[field] !== undefined && entry[field] !== null && !isValidObjectId(entry[field])) {
        throw new ApiError(400, `entries[${index}].${field} is not a valid id`);
      }
    });

    return {
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
      durationMinutes: Number(entry.durationMinutes),
      subject: entry.subject || null,
      topic: entry.topic || null,
      assignment: entry.assignment || null,
      task: entry.task || null,
      subjectName: typeof entry.subjectName === 'string' ? entry.subjectName.slice(0, 100) : '',
      topicName: typeof entry.topicName === 'string' ? entry.topicName.slice(0, 150) : '',
      activityType: entry.activityType,
      priority: Number(entry.priority),
      status: entry.status || 'scheduled',
      reason: typeof entry.reason === 'string' ? entry.reason.slice(0, 500) : '',
    };
  });
};

const collectRefIds = (entries, field) => {
  const ids = new Set();
  entries.forEach((entry) => {
    if (entry[field]) {
      ids.add(String(entry[field]));
    }
  });
  return Array.from(ids);
};

const loadOwnedMap = async (Model, ids, userId) => {
  if (ids.length === 0) {
    return new Map();
  }
  const docs = await Model.find({ _id: { $in: ids }, user: userId });
  return new Map(docs.map((doc) => [String(doc._id), doc]));
};

const applyOwnershipAndRelationships = async (entries, userId) => {
  const [subjectMap, topicMap, assignmentMap, taskMap] = await Promise.all([
    loadOwnedMap(Subject, collectRefIds(entries, 'subject'), userId),
    loadOwnedMap(Topic, collectRefIds(entries, 'topic'), userId),
    loadOwnedMap(Assignment, collectRefIds(entries, 'assignment'), userId),
    loadOwnedMap(Task, collectRefIds(entries, 'task'), userId),
  ]);

  entries.forEach((entry, index) => {
    const label = `entries[${index}]`;

    const subjectDoc = entry.subject ? subjectMap.get(String(entry.subject)) : null;
    if (entry.subject && !subjectDoc) {
      throw new ApiError(403, `${label}.subject does not belong to the authenticated user`);
    }

    const topicDoc = entry.topic ? topicMap.get(String(entry.topic)) : null;
    if (entry.topic && !topicDoc) {
      throw new ApiError(403, `${label}.topic does not belong to the authenticated user`);
    }

    const assignmentDoc = entry.assignment ? assignmentMap.get(String(entry.assignment)) : null;
    if (entry.assignment && !assignmentDoc) {
      throw new ApiError(403, `${label}.assignment does not belong to the authenticated user`);
    }

    const taskDoc = entry.task ? taskMap.get(String(entry.task)) : null;
    if (entry.task && !taskDoc) {
      throw new ApiError(403, `${label}.task does not belong to the authenticated user`);
    }

    if (subjectDoc && topicDoc && String(topicDoc.subject) !== String(subjectDoc._id)) {
      throw new ApiError(400, `${label}: topic does not belong to the specified subject`);
    }

    if (subjectDoc && assignmentDoc && assignmentDoc.subject && String(assignmentDoc.subject) !== String(subjectDoc._id)) {
      throw new ApiError(400, `${label}: assignment does not belong to the specified subject`);
    }

    if (topicDoc && assignmentDoc && assignmentDoc.subject && String(topicDoc.subject) !== String(assignmentDoc.subject)) {
      throw new ApiError(400, `${label}: topic and assignment belong to different subjects`);
    }

    if (subjectDoc && taskDoc && taskDoc.subject && String(taskDoc.subject) !== String(subjectDoc._id)) {
      throw new ApiError(400, `${label}: task does not belong to the specified subject`);
    }

    if (topicDoc && taskDoc && taskDoc.topic && String(taskDoc.topic) !== String(topicDoc._id)) {
      throw new ApiError(400, `${label}: task does not belong to the specified topic`);
    }

    if (assignmentDoc && taskDoc && taskDoc.assignment && String(taskDoc.assignment) !== String(assignmentDoc._id)) {
      throw new ApiError(400, `${label}: task does not belong to the specified assignment`);
    }

    let derivedSubject = subjectDoc ? subjectDoc._id : null;
    if (topicDoc && topicDoc.subject) {
      derivedSubject = topicDoc.subject;
    } else if (assignmentDoc && assignmentDoc.subject) {
      derivedSubject = assignmentDoc.subject;
    } else if (taskDoc && taskDoc.subject) {
      derivedSubject = taskDoc.subject;
    }

    entry.subject = derivedSubject || null;
  });

  return entries;
};

const validateEntryDateRange = (entries, plan) => {
  const planStartKey = dateKey(plan.startDate);
  const planEndKey = dateKey(plan.endDate);

  entries.forEach((entry, index) => {
    const date = new Date(entry.date);
    if (Number.isNaN(date.getTime())) {
      throw new ApiError(400, `entries[${index}].date is invalid`);
    }

    const key = dateKey(date);

    if (plan.planType === 'daily') {
      if (key !== planStartKey) {
        throw new ApiError(400, `entries[${index}].date must equal the plan date ${planStartKey}`);
      }
    } else if (key < planStartKey || key > planEndKey) {
      throw new ApiError(400, `entries[${index}].date must fall between ${planStartKey} and ${planEndKey}`);
    }
  });
};

export const updatePlan = async (planId, userId, body) => {
  const plan = await getOwnedPlanOrThrow(planId, userId);

  if (body.status !== undefined) {
    if (!PLAN_STATUS_VALUES.includes(body.status)) {
      throw new ApiError(400, `status must be one of: ${PLAN_STATUS_VALUES.join(', ')}`);
    }
    plan.status = body.status;
  }

  if (body.entries !== undefined) {
    const entries = sanitizeManualEntries(body.entries);
    await applyOwnershipAndRelationships(entries, userId);
    validateEntryDateRange(entries, plan);

    const availability = await StudyAvailability.findOne({ user: userId });
    const validation = validateScheduleEntries(entries, availability);

    if (!validation.valid) {
      throw new ApiError(400, validation.errors.join('; '));
    }

    plan.entries = entries;
    plan.totalPlannedMinutes = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
    plan.summary = computeSummary(entries, 0);
  }

  await plan.save();
  return plan;
};
