import { StudyPlan } from '../models/StudyPlan.js';
import { Subject } from '../models/Subject.js';
import { Topic } from '../models/Topic.js';
import { Assignment } from '../models/Assignment.js';
import { Task } from '../models/Task.js';
import { Exam } from '../models/Exam.js';
import { StudyAvailability } from '../models/StudyAvailability.js';
import { StudySession } from '../models/StudySession.js';
import { EndOfDayTest } from '../models/EndOfDayTest.js';
import { Evaluation } from '../models/Evaluation.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { startOfLocalDay, addCalendarDays, localDateTimeToUTC, toDateKey } from '../utils/timezone.js';
import { getUserTimezone } from './availability.service.js';
import * as subjectService from './subject.service.js';
import { sanitizeTest } from './eodTest.service.js';
import {
  generateAvailableSlots,
  allocateItemsToSlots,
  applyGroqAllocation,
  validateScheduleEntries,
  ScheduleValidationError,
} from './scheduler.service.js';
import { requestStudyPlanCompletion, isGroqConfigured, GroqServiceError } from './groq.service.js';
import { env } from '../config/env.js';
import {
  loadAcademicData,
  ensureRoadmapData,
  buildWorkItems,
  computeUnscheduled,
  computeSummary,
  persistPlan,
} from './studyPlan.service.js';

const MAX_LOOKAHEAD_DAYS = 30;
const RECENT_SESSION_DAYS = 7;
const MAX_SUMMARY_CHANGES = 6;

// Modest additive adjustments — kept small on purpose so that exam/assignment
// deadline urgency (already baked into calculateTopicPriority/etc. via
// priority.service.js) always continues to dominate when a deadline is close,
// per "do not over-optimize" requirements.
const WEAK_MINUTES_MULTIPLIER = 1.3;
const STRONG_MINUTES_MULTIPLIER = 0.8;
const FOCUS_AREA_MINUTES_MULTIPLIER = 1.15;
const WEAK_PRIORITY_BONUS = 15;
const STRONG_PRIORITY_PENALTY = 10;
const FOCUS_AREA_PRIORITY_BONUS = 10;
const CARRIED_FORWARD_PRIORITY_BONUS = 10;

const classifyEntryStatus = (status) => {
  if (status === 'completed') return 'completed';
  if (status === 'in_progress') return 'partial';
  if (status === 'skipped' || status === 'missed') return 'missed';
  return 'scheduled';
};

const getEntryItemKey = (entry) => {
  if (entry.topic) return `topic:${entry.topic.toString()}`;
  if (entry.assignment) return `assignment:${entry.assignment.toString()}`;
  if (entry.task) return `task:${entry.task.toString()}`;
  return null;
};

// ---------------------------------------------------------------------------
// Preconditions + real-data context gathering (section 4/5 of the spec)
// ---------------------------------------------------------------------------

const getOwnedSubjectOrThrow = async (userId) => {
  const { subject } = await subjectService.getActiveOptimizationSubject(userId);
  if (!subject) {
    throw new ApiError(
      422,
      'No active optimization subject selected. Choose a subject to optimize before running next-day optimization.'
    );
  }
  return subject;
};

const getTodaySubmittedTestOrThrow = async (userId, subject, today) => {
  const test = await EndOfDayTest.findOne({ user: userId, subject: subject._id, studyDate: today });
  if (!test) {
    throw new ApiError(
      422,
      "Today's end-of-day test has not been generated yet. Complete today's study flow before optimizing tomorrow's roadmap."
    );
  }
  if (test.status !== 'submitted' || !test.result) {
    throw new ApiError(
      422,
      "Today's end-of-day test has not been submitted yet. Submit the test before optimizing tomorrow's roadmap."
    );
  }
  return test;
};

const getEvaluationOrThrow = async (userId, test) => {
  const evaluation = await Evaluation.findOne({ user: userId, endOfDayTest: test._id });
  if (!evaluation) {
    throw new ApiError(
      422,
      "Today's AI evaluation has not been generated yet. Generate the evaluation before optimizing tomorrow's roadmap."
    );
  }
  return evaluation;
};

const gatherOptimizationContext = async (userId) => {
  const subject = await getOwnedSubjectOrThrow(userId);

  const timezone = await getUserTimezone(userId);
  const today = startOfLocalDay(new Date(), timezone);

  const test = await getTodaySubmittedTestOrThrow(userId, subject, today);
  const evaluation = await getEvaluationOrThrow(userId, test);

  const availability = await StudyAvailability.findOne({ user: userId });
  if (!availability) {
    throw new ApiError(
      422,
      "Study availability has not been configured. Please set up your weekly availability before optimizing tomorrow's roadmap."
    );
  }

  // The "previous day" study plan — today's roadmap for this subject.
  const previousPlan = await StudyPlan.findOne({
    user: userId,
    planType: 'daily',
    optimizationSubject: subject._id,
    startDate: today,
    status: { $ne: 'archived' },
  }).sort({ generatedAt: -1 });

  const dayStartUTC = localDateTimeToUTC(today, '00:00', timezone);
  const dayEndUTC = localDateTimeToUTC(addCalendarDays(today, 1), '00:00', timezone);

  const daySessions = await StudySession.find({
    user: userId,
    subject: subject._id,
    startTime: { $gte: dayStartUTC, $lt: dayEndUTC },
  });

  const recentWindowStartUTC = localDateTimeToUTC(addCalendarDays(today, -RECENT_SESSION_DAYS), '00:00', timezone);
  const recentSessions = await StudySession.find({
    user: userId,
    subject: subject._id,
    startTime: { $gte: recentWindowStartUTC, $lt: dayEndUTC },
    status: { $in: ['completed', 'abandoned', 'cancelled'] },
  }).select('startTime status completionPercentage actualDurationMinutes');

  const actualMinutesByItemKey = new Map();
  daySessions.forEach((session) => {
    const key = session.topic
      ? `topic:${session.topic.toString()}`
      : session.assignment
        ? `assignment:${session.assignment.toString()}`
        : session.task
          ? `task:${session.task.toString()}`
          : null;
    if (!key) return;
    actualMinutesByItemKey.set(key, (actualMinutesByItemKey.get(key) || 0) + (session.actualDurationMinutes || 0));
  });

  const roadmapEntryCounts = { completed: 0, partial: 0, missed: 0, scheduled: 0 };
  const plannedMinutesByItemKey = new Map();
  const carriedForwardEntries = [];
  const previousRoadmapEntries = [];

  (previousPlan?.entries ?? []).forEach((entry) => {
    const classification = classifyEntryStatus(entry.status);
    roadmapEntryCounts[classification] += 1;

    const key = getEntryItemKey(entry);
    if (key) {
      plannedMinutesByItemKey.set(key, (plannedMinutesByItemKey.get(key) || 0) + entry.durationMinutes);
    }

    if ((classification === 'missed' || classification === 'partial') && key) {
      carriedForwardEntries.push(entry);
    }

    // Fix (Part 6): the AI previously only saw aggregated totals for the
    // previous day's roadmap. It needs the actual entries — what was
    // planned per topic/item, what was actually focused on (from the same
    // StudySession-derived actualMinutesByItemKey used everywhere else, so
    // this never double counts time against the aggregate totals below —
    // and what its real completion status was.
    previousRoadmapEntries.push({
      itemType: entry.topic ? 'topic' : entry.assignment ? 'assignment' : entry.task ? 'task' : null,
      topicName: entry.topicName || entry.subjectName || 'General',
      activityType: entry.activityType,
      startTime: entry.startTime,
      endTime: entry.endTime,
      plannedMinutes: entry.durationMinutes,
      actualMinutes: key ? Math.round(actualMinutesByItemKey.get(key) || 0) : 0,
      status: entry.status,
      priority: entry.priority,
      reason: entry.reason || '',
    });
  });

  const totalPlannedMinutes = Array.from(plannedMinutesByItemKey.values()).reduce((sum, m) => sum + m, 0);
  const totalActualMinutes = daySessions.reduce((sum, session) => sum + (session.actualDurationMinutes || 0), 0);

  const user = await User.findById(userId).select(
    'academicGoals shortTermGoals longTermGoals studyGoal improvementAreas learningInterests dailyStudyTarget'
  );

  const [exams, assignments, tasks] = await Promise.all([
    Exam.find({ user: userId, subject: subject._id }),
    Assignment.find({ user: userId, subject: subject._id, status: { $ne: 'completed' } }),
    Task.find({ user: userId, subject: subject._id, status: { $nin: ['completed', 'cancelled'] } }),
  ]);

  // Fix (Part 6): question-by-question submitted responses, matched by the
  // persisted question _id (never by frontend/array ordering) — the exact
  // same safe-matching approach Part 5's evaluation.service.js already uses
  // against the same persisted EndOfDayTest document. Ground truth
  // (isCorrect/correctAnswer) is never recalculated here.
  const answerByQuestionId = new Map((test.answers || []).map((answer) => [String(answer.question), answer]));
  const questionResponses = (test.questions || []).map((question) => {
    const answer = answerByQuestionId.get(String(question._id));
    return {
      questionText: question.questionText,
      questionType: question.questionType,
      topicName: question.topicName || 'General',
      studentAnswer: answer ? answer.answerText : null,
      wasAttempted: Boolean(answer && answer.answerText),
      isCorrect: answer ? answer.isCorrect : null,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
    };
  });

  return {
    subject,
    timezone,
    today,
    test,
    evaluation,
    availability,
    previousPlan,
    roadmapEntryCounts,
    plannedMinutesByItemKey,
    actualMinutesByItemKey,
    previousRoadmapEntries,
    questionResponses,
    totalPlannedMinutes,
    totalActualMinutes,
    carriedForwardEntries,
    recentSessionCount: recentSessions.length,
    goals: {
      academicGoals: user?.academicGoals || '',
      shortTermGoals: user?.shortTermGoals || '',
      longTermGoals: user?.longTermGoals || '',
      studyGoal: user?.studyGoal || '',
      improvementAreas: user?.improvementAreas || '',
      learningInterests: user?.learningInterests || '',
      dailyStudyTarget: user?.dailyStudyTarget || null,
    },
    exams,
    assignments,
    tasks,
  };
};

// ---------------------------------------------------------------------------
// Next available study day (section 12) — never "+24h", always the next
// calendar day (in the user's timezone) that availability actually allows.
// ---------------------------------------------------------------------------

export const findNextAvailableStudyDate = (availability, fromDateExclusive, maxDays = MAX_LOOKAHEAD_DAYS) => {
  for (let offset = 1; offset <= maxDays; offset += 1) {
    const candidate = addCalendarDays(fromDateExclusive, offset);
    const slots = generateAvailableSlots(availability, candidate, 1);
    if (slots.length > 0) {
      return candidate;
    }
  }
  return null;
};

// ---------------------------------------------------------------------------
// Building next-day work items from evaluation-driven signals (section 6/7)
// ---------------------------------------------------------------------------

const buildOptimizedItems = (context, referenceDate) => {
  const data = {
    subjects: [context.subject],
    topics: context.topics,
    exams: context.exams,
    assignments: context.assignments,
    tasks: context.tasks,
    availability: context.availability,
  };

  const items = buildWorkItems(data, referenceDate);

  const understandingByTopicId = new Map(
    (context.evaluation.topicInsights || [])
      .filter((insight) => insight.topic)
      .map((insight) => [String(insight.topic), insight.understandingLevel])
  );

  const focusAreaNames = new Set(
    (context.evaluation.recommendedFocusAreas || []).map((name) => name.trim().toLowerCase())
  );

  const carriedForwardKeys = new Set(context.carriedForwardEntries.map(getEntryItemKey).filter(Boolean));

  items.forEach((item) => {
    const itemKey = `${item.type}:${item.refId.toString()}`;
    let extraReason = '';

    if (item.type === 'topic') {
      const understandingLevel = understandingByTopicId.get(item.refId.toString());

      if (understandingLevel === 'weak' || understandingLevel === 'developing') {
        item.estimatedMinutes = Math.round(item.estimatedMinutes * WEAK_MINUTES_MULTIPLIER);
        item.priorityScore = Math.min(100, item.priorityScore + WEAK_PRIORITY_BONUS);
        extraReason = "Increased focus — today's test/evaluation showed weaker understanding here.";
      } else if (understandingLevel === 'strong') {
        item.estimatedMinutes = Math.max(10, Math.round(item.estimatedMinutes * STRONG_MINUTES_MULTIPLIER));
        item.priorityScore = Math.max(0, item.priorityScore - STRONG_PRIORITY_PENALTY);
        extraReason = 'Reduced repetition — evaluation shows strong understanding; kept for light revision only.';
      } else if (focusAreaNames.has(item.title.toLowerCase())) {
        item.estimatedMinutes = Math.round(item.estimatedMinutes * FOCUS_AREA_MINUTES_MULTIPLIER);
        item.priorityScore = Math.min(100, item.priorityScore + FOCUS_AREA_PRIORITY_BONUS);
        extraReason = "Flagged as a recommended focus area in today's AI evaluation.";
      }
    }

    if (carriedForwardKeys.has(itemKey)) {
      item.priorityScore = Math.min(100, item.priorityScore + CARRIED_FORWARD_PRIORITY_BONUS);
      extraReason = extraReason
        ? `${extraReason} Also carried forward: not fully completed in the previous study day.`
        : 'Carried forward: not fully completed in the previous study day.';
    }

    if (extraReason) {
      item.reason = item.reason ? `${item.reason}. ${extraReason}` : extraReason;
    }
  });

  items.sort((a, b) => b.priorityScore - a.priorityScore);
  return items;
};

// ---------------------------------------------------------------------------
// Groq prompt (section 6) — same strict JSON schema as the rest of the app
// (see scheduler.service.js#applyGroqAllocation), just with a richer context.
// ---------------------------------------------------------------------------

const NO_VALUE = 'Not provided';

const buildOptimizationPrompt = (slots, items, context) => {
  const systemPrompt = [
    'You are a deterministic study-scheduling assistant embedded in a backend system.',
    'You are optimizing NEXT-DAY study plan for a single subject, based on the previous day\u2019s roadmap, actual ' +
      'study performance, an End-of-Day Test result, and an AI evaluation of that test.',
    'Respond with ONLY a single JSON object and nothing else: no markdown, no code fences, no prose.',
    'The JSON object must match this schema exactly: ' +
      '{"entries":[{"slotId":string,"itemId":string,"durationMinutes":number,"activityType":string,"reason":string}],"summaryNotes":string}.',
    'Only use slotId and itemId values from the lists provided in the user message. Never invent one.',
    'Never assign more durationMinutes to an item than its estimatedMinutes, and never assign more total ' +
      'durationMinutes to a slot than its durationMinutes.',
    'Increase attention on topics whose understandingLevel is "weak" or "developing", or that appear in ' +
      'recommendedFocusAreas. Reduce repetition (but do not fully drop) topics whose understandingLevel is "strong".',
    'Continue/carry forward items marked isCarriedForward — they were missed or left partial the previous day.',
    'Use previousDayRoadmapEntries (the actual entries from yesterday\u2019s roadmap, each with plannedMinutes vs ' +
      'actualMinutes and its real completion status) together with questionByQuestionResponses (the student\u2019s ' +
      'actual submitted answers, with ground-truth isCorrect/correctAnswer) to judge, per topic, whether it was ' +
      'completed as planned, under-studied, partially completed, missed entirely, or studied more than planned — ' +
      'and combine that with aiEvaluation\u2019s topicInsights before deciding priority. Do not penalize a topic ' +
      'just because actualMinutes is lower than plannedMinutes; weigh it alongside the test responses and evaluation.',
    'isCorrect and correctAnswer in questionByQuestionResponses are ground truth from official grading — never ' +
      'contradict or recompute them.',
    'Give the strongest scheduling priority to items with an approaching deadline in upcomingDeadlines.',
    'Do not allocate the entire day to weak topics — maintain a realistic, balanced schedule; strong topics may ' +
      'still receive light maintenance/revision.',
    'Respect the available time in the slots list, and never exceed it. Leaving low-priority items unscheduled is ' +
      'acceptable rather than producing an unrealistic workload.',
    'summaryNotes must be a concise (<= 400 characters) plain-text explanation of the key scheduling decisions you made.',
  ].join('\n');

  const payload = {
    subject: context.subject.name,
    previousDayPlan: context.previousPlan
      ? {
          totalPlannedMinutes: context.totalPlannedMinutes,
          entryStatusCounts: context.roadmapEntryCounts,
        }
      : 'No previous roadmap was found for today.',
    // Fix (Part 6): the actual previous-day roadmap entries, each with its
    // real planned-vs-actual minutes and completion status, so the AI can
    // reason per topic/item instead of only from aggregate totals.
    previousDayRoadmapEntries:
      context.previousRoadmapEntries.length > 0
        ? context.previousRoadmapEntries
        : 'No previous roadmap entries were found for today.',
    actualStudyPerformance: {
      totalActualMinutes: context.totalActualMinutes,
      recentSessionCount: context.recentSessionCount,
    },
    endOfDayTestResult: {
      score: context.test.result.score,
      percentage: context.test.result.percentage,
      attempted: context.test.result.attemptedQuestions,
      correct: context.test.result.correctAnswers,
      incorrect: context.test.result.incorrectAnswers,
      topicPerformance: (context.test.result.topicPerformance || []).map((tp) => ({
        topic: tp.topicName,
        correct: tp.correct,
        total: tp.total,
        percentage: tp.percentage,
      })),
    },
    // Fix (Part 6): question-by-question submitted responses (same
    // safe question-id matching Part 5 already uses), so the AI can see
    // exactly what the student got wrong rather than only the aggregate score.
    questionByQuestionResponses: context.questionResponses,
    aiEvaluation: {
      overallAssessment: context.evaluation.overallAssessment,
      strengths: context.evaluation.strengths,
      weaknesses: context.evaluation.weaknesses,
      recommendedFocusAreas: context.evaluation.recommendedFocusAreas,
      topicInsights: (context.evaluation.topicInsights || []).map((t) => ({
        topic: t.topicName,
        understandingLevel: t.understandingLevel,
      })),
    },
    topicMasteryAndGoals: {
      topics: context.topics.map((topic) => ({
        name: topic.name,
        currentMastery: topic.currentMastery,
        targetMastery: topic.targetMastery,
        status: topic.status,
      })),
      goals: context.goals,
    },
    upcomingDeadlines: items
      .filter((item) => item.type !== 'topic')
      .map((item) => ({
        title: item.title,
        estimatedMinutes: item.estimatedMinutes,
        priorityScore: item.priorityScore,
        deadline: item.deadline ? new Date(item.deadline).toISOString() : null,
        activityType: item.activityType,
      })),
    availableTime: slots.map((slot) => ({
      slotId: slot.slotId,
      date: toDateKey(slot.date),
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationMinutes: slot.durationMinutes,
    })),
    studyPreferences: {
      dailyStudyLimitMinutes: context.availability.dailyStudyLimit,
      preferredSessionDurationMinutes: context.availability.preferredSessionDuration,
      preferredBreakDurationMinutes: context.availability.preferredBreakDuration,
      preferredStudyPeriods: context.availability.preferredStudyPeriods || [],
      timezone: context.availability.timezone || NO_VALUE,
    },
    items: items.map((item) => ({
      itemId: item.itemId,
      type: item.type,
      title: item.title,
      estimatedMinutes: item.estimatedMinutes,
      priorityScore: item.priorityScore,
      deadline: item.deadline ? new Date(item.deadline).toISOString() : null,
      suggestedActivityType: item.activityType,
      isCarriedForward: context.carriedForwardEntries.some((e) => getEntryItemKey(e) === `${item.type}:${item.refId.toString()}`),
    })),
  };

  return { systemPrompt, userPrompt: JSON.stringify(payload) };
};

const normalizeSummaryNotes = (raw) => {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return trimmed.slice(0, 400);
};

// ---------------------------------------------------------------------------
// Scheduling with Groq + deterministic fallback (section 8), reusing the
// existing scheduler.service.js validation/allocation architecture.
// ---------------------------------------------------------------------------

const runOptimizationScheduling = async ({ slots, items, availability, context }) => {
  if (slots.length === 0) {
    return {
      entries: [],
      unscheduled: items,
      source: 'algorithm',
      aiUsed: false,
      aiModel: null,
      aiFallbackReason: null,
      aiSummaryNotes: '',
    };
  }

  if (isGroqConfigured() && items.length > 0) {
    try {
      const { systemPrompt, userPrompt } = buildOptimizationPrompt(slots, items, context);
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
        aiSummaryNotes: normalizeSummaryNotes(groqResponse?.summaryNotes),
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
        aiSummaryNotes: '',
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
    aiFallbackReason: isGroqConfigured() ? null : 'missing_api_key',
    aiSummaryNotes: '',
  };
};

// ---------------------------------------------------------------------------
// Optimization summary (section 13) — built from the real, deterministic
// decisions above so it is never fabricated, plus an optional bounded AI note.
// ---------------------------------------------------------------------------

const buildOptimizationSummary = (context, items, entries, schedulingResult) => {
  const scheduledItemKeys = new Set(
    entries
      .map((entry) => getEntryItemKey(entry))
      .filter(Boolean)
  );

  const changes = [];

  items.forEach((item) => {
    const key = `${item.type}:${item.refId.toString()}`;
    if (!scheduledItemKeys.has(key)) return;
    if (!item.reason) return;

    if (item.reason.includes('weaker understanding')) {
      changes.push(`More time allocated to "${item.title}" because of weaker test/evaluation performance.`);
    } else if (item.reason.includes('strong understanding')) {
      changes.push(`Revision reduced for "${item.title}" — evaluation showed strong understanding.`);
    } else if (item.reason.includes('recommended focus area')) {
      changes.push(`"${item.title}" prioritized as a recommended focus area from today's evaluation.`);
    }

    if (item.reason.includes('Carried forward')) {
      changes.push(`Unfinished "${item.title}" work carried forward from the previous day.`);
    }
  });

  const nearestDeadlineItems = items
    .filter((item) => item.type !== 'topic' && item.deadline)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 2);

  nearestDeadlineItems.forEach((item) => {
    const key = `${item.type}:${item.refId.toString()}`;
    if (scheduledItemKeys.has(key)) {
      changes.push(`"${item.title}" given higher priority due to its approaching deadline.`);
    }
  });

  const uniqueChanges = Array.from(new Set(changes)).slice(0, MAX_SUMMARY_CHANGES);

  return {
    changes: uniqueChanges,
    aiSummary: schedulingResult.aiSummaryNotes || '',
  };
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const getOptimizationStatus = async (userId) => {
  const { subject } = await subjectService.getActiveOptimizationSubject(userId);
  if (!subject) {
    return { canOptimize: false, reason: 'no_active_subject', subject: null, test: null, evaluation: null, nextDayPlan: null };
  }

  const timezone = await getUserTimezone(userId);
  const today = startOfLocalDay(new Date(), timezone);

  const test = await EndOfDayTest.findOne({ user: userId, subject: subject._id, studyDate: today });
  if (!test) {
    return { canOptimize: false, reason: 'test_not_generated', subject, test: null, evaluation: null, nextDayPlan: null };
  }
  if (test.status !== 'submitted' || !test.result) {
    return {
      canOptimize: false,
      reason: 'test_not_submitted',
      subject,
      test: sanitizeTest(test),
      evaluation: null,
      nextDayPlan: null,
    };
  }

  const evaluation = await Evaluation.findOne({ user: userId, endOfDayTest: test._id });
  if (!evaluation) {
    return {
      canOptimize: false,
      reason: 'evaluation_missing',
      subject,
      test: sanitizeTest(test),
      evaluation: null,
      nextDayPlan: null,
    };
  }

  const { plan: nextDayPlan } = await getNextDayPlan(userId);

  return { canOptimize: true, reason: null, subject, test: sanitizeTest(test), evaluation, nextDayPlan };
};

export const getNextDayPlan = async (userId) => {
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
    startDate: { $gt: today },
    status: { $ne: 'archived' },
  }).sort({ startDate: 1, generatedAt: -1 });

  return { plan, subject };
};

// Generates (or, unless regenerate is requested, simply returns) the
// optimized next-day roadmap. Never mutates the previous day's StudyPlan,
// StudySession history, EndOfDayTest, or Evaluation — it only ever creates a
// brand-new StudyPlan document for the next available study day.
export const optimizeNextDay = async (userId, { regenerate = false } = {}) => {
  const generationStart = Date.now();
  const referenceDate = new Date();

  const context = await gatherOptimizationContext(userId);

  const nextDay = findNextAvailableStudyDate(context.availability, context.today);
  if (!nextDay) {
    throw new ApiError(
      422,
      `No available study day could be found within your configured availability in the next ${MAX_LOOKAHEAD_DAYS} days.`
    );
  }

  const existing = await StudyPlan.findOne({
    user: userId,
    planType: 'daily',
    optimizationSubject: context.subject._id,
    startDate: nextDay,
    status: { $ne: 'archived' },
  }).sort({ generatedAt: -1 });

  if (existing && !regenerate) {
    return { plan: existing, subject: context.subject, created: false, changes: null };
  }

  // Matches Part 2's generateSubjectRoadmap: fetch all topics for the
  // subject (not pre-filtered by status) and let buildWorkItems decide
  // whether a completed topic still needs a pre-exam review pass.
  context.topics = await Topic.find({ user: userId, subject: context.subject._id });

  ensureRoadmapData(context.subject, {
    availability: context.availability,
    topics: context.topics,
    assignments: context.assignments,
    tasks: context.tasks,
  });

  const items = buildOptimizedItems(context, referenceDate);
  const slots = generateAvailableSlots(context.availability, nextDay, 1);

  const schedulingResult = await runOptimizationScheduling({
    slots,
    items,
    availability: context.availability,
    context,
  });

  const optimizationSummary = buildOptimizationSummary(context, items, schedulingResult.entries, schedulingResult);

  const summaryNotesParts = [];
  if (optimizationSummary.changes.length > 0) {
    summaryNotesParts.push(optimizationSummary.changes.join(' '));
  }
  if (optimizationSummary.aiSummary) {
    summaryNotesParts.push(optimizationSummary.aiSummary);
  }

  const plan = await persistPlan({
    userId,
    planType: 'daily',
    startDate: nextDay,
    endDate: nextDay,
    schedulingResult,
    generationDurationMs: Date.now() - generationStart,
    version: existing ? existing.version + 1 : 1,
    previousPlan: existing ? existing._id : context.previousPlan ? context.previousPlan._id : null,
    optimizationSubject: context.subject._id,
  });

  if (summaryNotesParts.length > 0) {
    plan.summary.notes = `${plan.summary.notes ? `${plan.summary.notes} ` : ''}${summaryNotesParts.join(' ')}`.slice(0, 1000);
    await plan.save();
  }

  if (existing) {
    existing.status = 'archived';
    await existing.save();
  }

  return { plan, subject: context.subject, created: true, changes: optimizationSummary.changes };
};
