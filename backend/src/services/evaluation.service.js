import { Evaluation, UNDERSTANDING_LEVEL_VALUES } from '../models/Evaluation.js';
import { EndOfDayTest } from '../models/EndOfDayTest.js';
import { Subject } from '../models/Subject.js';
import { Topic } from '../models/Topic.js';
import { StudyPlan } from '../models/StudyPlan.js';
import { StudySession } from '../models/StudySession.js';
import { StudyAvailability } from '../models/StudyAvailability.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidObjectId } from '../utils/validators.js';
import { resolveTimezone, localDateTimeToUTC, addCalendarDays, toDateKey } from '../utils/timezone.js';
import { requestStudyPlanCompletion, isGroqConfigured, GroqServiceError } from './groq.service.js';
import { getTodayTest, sanitizeTest } from './eodTest.service.js';
import { env } from '../config/env.js';

const RECENT_SESSION_DAYS = 7;
const MAX_LIST_ITEMS = 5;
const MAX_TOPIC_LIST_ITEMS = 3;

class EvaluationValidationError extends Error {
  constructor(reason) {
    super(reason);
    this.name = 'EvaluationValidationError';
  }
}

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const getUserTimezone = async (userId) => {
  const availability = await StudyAvailability.findOne({ user: userId }).select('timezone');
  return resolveTimezone(availability?.timezone);
};

// ---------------------------------------------------------------------------
// Gathering real evaluation context (roadmap + sessions + mastery + goals)
// ---------------------------------------------------------------------------

const classifyEntryStatus = (status) => {
  if (status === 'completed') return 'completed';
  if (status === 'in_progress') return 'partial';
  if (status === 'skipped' || status === 'missed') return 'missed';
  return 'scheduled';
};

const gatherEvaluationContext = async (userId, test) => {
  const subject = await Subject.findOne({ _id: test.subject, user: userId });
  if (!subject) {
    throw new ApiError(404, 'The subject for this test could not be found.');
  }

  const timezone = await getUserTimezone(userId);
  const studyDate = test.studyDate;
  const dayStartUTC = localDateTimeToUTC(studyDate, '00:00', timezone);
  const dayEndUTC = localDateTimeToUTC(addCalendarDays(studyDate, 1), '00:00', timezone);

  const roadmapPlan = await StudyPlan.findOne({
    user: userId,
    planType: 'daily',
    optimizationSubject: subject._id,
    startDate: studyDate,
    status: { $ne: 'archived' },
  }).sort({ generatedAt: -1 });

  const daySessions = await StudySession.find({
    user: userId,
    subject: subject._id,
    startTime: { $gte: dayStartUTC, $lt: dayEndUTC },
  }).sort({ startTime: 1 });

  const recentWindowStartUTC = localDateTimeToUTC(addCalendarDays(studyDate, -RECENT_SESSION_DAYS), '00:00', timezone);
  const recentSessions = await StudySession.find({
    user: userId,
    subject: subject._id,
    startTime: { $gte: recentWindowStartUTC, $lt: dayEndUTC },
  }).select('startTime status actualDurationMinutes');

  const topicIds = (test.topicsCovered || []).map((id) => String(id));
  const topics = topicIds.length > 0
    ? await Topic.find({ _id: { $in: topicIds }, user: userId, subject: subject._id })
    : [];
  const topicById = new Map(topics.map((topic) => [String(topic._id), topic]));

  const plannedMinutesByTopic = new Map();
  const entryStatusByTopic = new Map();
  const roadmapEntryCounts = { completed: 0, partial: 0, missed: 0, scheduled: 0 };
  (roadmapPlan?.entries ?? []).forEach((entry) => {
    roadmapEntryCounts[classifyEntryStatus(entry.status)] += 1;
    if (!entry.topic) return;
    const key = String(entry.topic);
    plannedMinutesByTopic.set(key, (plannedMinutesByTopic.get(key) || 0) + entry.durationMinutes);
    const bucket = entryStatusByTopic.get(key) || { completed: 0, partial: 0, missed: 0, scheduled: 0 };
    bucket[classifyEntryStatus(entry.status)] += 1;
    entryStatusByTopic.set(key, bucket);
  });

  const actualMinutesByTopic = new Map();
  daySessions.forEach((session) => {
    if (!session.topic) return;
    const key = String(session.topic);
    actualMinutesByTopic.set(key, (actualMinutesByTopic.get(key) || 0) + (session.actualDurationMinutes || 0));
  });

  const resultTopicPerfByKey = new Map();
  (test.result?.topicPerformance ?? []).forEach((tp) => {
    const key = tp.topic ? String(tp.topic) : `name:${tp.topicName}`;
    resultTopicPerfByKey.set(key, tp);
  });

  const topicContexts = topicIds.map((key) => {
    const topic = topicById.get(key);
    const fallbackName = (test.questions || []).find((q) => q.topic && String(q.topic) === key)?.topicName;
    const topicName = topic?.name || fallbackName || 'General';
    const perf = resultTopicPerfByKey.get(key) || resultTopicPerfByKey.get(`name:${topicName}`) || null;
    const roadmapStatus = entryStatusByTopic.get(key) || { completed: 0, partial: 0, missed: 0, scheduled: 0 };

    return {
      topicId: key,
      topicName,
      currentMastery: topic?.currentMastery ?? null,
      targetMastery: topic?.targetMastery ?? null,
      plannedMinutes: Math.round(plannedMinutesByTopic.get(key) || 0),
      actualMinutes: Math.round(actualMinutesByTopic.get(key) || 0),
      testCorrect: perf?.correct ?? null,
      testTotal: perf?.total ?? null,
      testPercentage: perf ? perf.percentage : null,
      roadmapStatus,
    };
  });

  const totalPlannedMinutes = topicContexts.reduce((sum, t) => sum + t.plannedMinutes, 0);
  const totalActualMinutes = topicContexts.reduce((sum, t) => sum + t.actualMinutes, 0);

  const user = await User.findById(userId).select(
    'academicGoals shortTermGoals longTermGoals studyGoal improvementAreas learningInterests'
  );

  // Question-by-question responses, matched by the persisted question _id
  // (never by frontend/array ordering). Source of truth is entirely the
  // backend-persisted test document — nothing here is fabricated or pulled
  // from frontend state.
  const answerByQuestionId = new Map(
    (test.answers || []).map((answer) => [String(answer.question), answer])
  );

  const questionResponses = (test.questions || []).map((question) => {
    const answer = answerByQuestionId.get(String(question._id));
    const topicKey = question.topic ? String(question.topic) : null;
    const topicName =
      (topicKey && topicById.get(topicKey)?.name) || question.topicName || 'General';

    return {
      questionText: question.questionText,
      questionType: question.questionType,
      topicName,
      studentAnswer: answer ? answer.answerText : null,
      wasAttempted: Boolean(answer && answer.answerText),
      isCorrect: answer ? answer.isCorrect : null,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
    };
  });

  return {
    subject,
    studyDate,
    topicContexts,
    questionResponses,
    totalPlannedMinutes,
    totalActualMinutes,
    roadmapEntryCounts,
    recentSessionCount: recentSessions.length,
    goals: {
      academicGoals: user?.academicGoals || '',
      shortTermGoals: user?.shortTermGoals || '',
      longTermGoals: user?.longTermGoals || '',
      studyGoal: user?.studyGoal || '',
      improvementAreas: user?.improvementAreas || '',
      learningInterests: user?.learningInterests || '',
    },
  };
};

// ---------------------------------------------------------------------------
// Deterministic study-consistency score — never taken from the AI response.
// ---------------------------------------------------------------------------

const computeConsistencyScore = (context) => {
  const { totalPlannedMinutes, totalActualMinutes, roadmapEntryCounts } = context;
  const totalEntries =
    roadmapEntryCounts.completed + roadmapEntryCounts.partial + roadmapEntryCounts.missed + roadmapEntryCounts.scheduled;

  const timeRatio =
    totalPlannedMinutes > 0 ? Math.min(1, totalActualMinutes / totalPlannedMinutes) : totalActualMinutes > 0 ? 1 : 0;

  const completionRatio =
    totalEntries > 0
      ? (roadmapEntryCounts.completed + roadmapEntryCounts.partial * 0.5) / totalEntries
      : totalActualMinutes > 0
        ? 1
        : 0;

  const score = Math.round((timeRatio * 0.5 + completionRatio * 0.5) * 100);
  return Math.max(0, Math.min(100, score));
};

// ---------------------------------------------------------------------------
// Groq prompt — organized into the sections requested for Part 5
// ---------------------------------------------------------------------------

const buildEvaluationPrompt = (context, test) => {
  const systemPrompt = [
    'You are an academic performance evaluator for a study app called LearnPilot AI.',
    'You interpret real study and test data for a student — you do NOT grade or re-score anything.',
    'The official End-of-Day Test result given to you below is final ground truth and must never be changed or contradicted.',
    'Respond ONLY with a JSON object of exactly this shape and nothing else:',
    '{',
    '  "overallAssessment": string,',
    '  "strengths": string[] (1-5 short items),',
    '  "weaknesses": string[] (1-5 short items),',
    '  "topicInsights": [ { "topic": string, "understandingLevel": "weak" | "developing" | "proficient" | "strong",',
    '    "strengths": string[] (0-3 items), "weaknesses": string[] (0-3 items), "recommendation": string } ],',
    '  "studyConsistencyAssessment": string,',
    '  "plannedVsActualInsight": string,',
    '  "recommendedFocusAreas": string[] (1-5 items),',
    '  "learningSummary": string',
    '}',
    'Rules:',
    '- Do NOT invent a score, percentage, or correct/incorrect counts — treat the provided result as ground truth.',
    '- Every "topic" in topicInsights MUST exactly match one of the topic names listed under TOPIC-WISE PERFORMANCE.',
    '- Ground "understandingLevel" in the provided test percentage and mastery data for that topic.',
    '- Weigh study time, roadmap completion, and mastery gap together rather than the test score alone.',
    '- Use QUESTION-BY-QUESTION RESPONSES to understand WHAT the student actually answered, not just the aggregate ' +
      'score — look for repeated conceptual mistakes, a specific misunderstanding, partial understanding on short ' +
      'answers, or careless errors, and reflect these patterns in strengths/weaknesses/recommendations.',
    '- The per-question "isCorrect" and "correctAnswer" values are ground truth from the official grading; never ' +
      'contradict them, and do not make claims the responses do not support.',
    '- Do not output a numeric consistency score — describe it qualitatively in "studyConsistencyAssessment" only.',
    '- Do not include any text or fields outside the specified JSON shape.',
  ].join('\n');

  const topicLines =
    context.topicContexts
      .map(
        (t) =>
          `- ${t.topicName}: test ${t.testCorrect ?? 'n/a'}/${t.testTotal ?? 'n/a'} ` +
          `(${t.testPercentage ?? 'n/a'}%), current mastery ${t.currentMastery ?? 0}%, target mastery ${t.targetMastery ?? 0}%, ` +
          `planned ${t.plannedMinutes} min / actual ${t.actualMinutes} min today, roadmap: ` +
          `${t.roadmapStatus.completed} completed / ${t.roadmapStatus.partial} partial / ${t.roadmapStatus.missed} missed`
      )
      .join('\n') || 'No topic-level data available.';

  const questionLines =
    context.questionResponses
      .map((q, index) => {
        const answerLine = q.wasAttempted
          ? `Student answer: ${q.studentAnswer}`
          : 'Student answer: (not attempted)';
        return (
          `${index + 1}. [${q.topicName}] (${q.questionType}) ${q.questionText}\n` +
          `   ${answerLine}\n` +
          `   Correct: ${q.isCorrect === null ? 'n/a' : q.isCorrect}\n` +
          `   Correct answer: ${q.correctAnswer}`
        );
      })
      .join('\n') || 'No question responses available.';

  const goalLines =
    Object.entries(context.goals)
      .filter(([, value]) => value)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n') || '- Not provided.';

  const userPrompt = [
    'STUDENT CONTEXT',
    `Study date: ${toDateKey(context.studyDate)}`,
    `Study sessions logged for this subject in the last ${RECENT_SESSION_DAYS} days: ${context.recentSessionCount}`,
    '',
    'SELECTED SUBJECT',
    context.subject.name,
    '',
    "TODAY'S STUDY PLAN",
    `Planned minutes: ${context.totalPlannedMinutes}`,
    `Roadmap entries: ${context.roadmapEntryCounts.completed} completed, ${context.roadmapEntryCounts.partial} partial, ` +
      `${context.roadmapEntryCounts.missed} missed, ${context.roadmapEntryCounts.scheduled} still scheduled`,
    '',
    'ACTUAL STUDY PERFORMANCE',
    `Actual focused minutes: ${context.totalActualMinutes}`,
    '',
    'END-OF-DAY TEST RESULT (official, final — treat as ground truth)',
    `Score: ${test.result.correctAnswers}/${test.result.totalQuestions} (${test.result.percentage}%)`,
    `Attempted: ${test.result.attemptedQuestions}/${test.result.totalQuestions}`,
    '',
    'TOPIC-WISE PERFORMANCE',
    topicLines,
    '',
    'QUESTION-BY-QUESTION RESPONSES (ground truth — do not contradict isCorrect/correct answer)',
    questionLines,
    '',
    'CURRENT MASTERY',
    context.topicContexts.map((t) => `- ${t.topicName}: ${t.currentMastery ?? 0}%`).join('\n') || 'Not available.',
    '',
    'TARGET MASTERY',
    context.topicContexts.map((t) => `- ${t.topicName}: ${t.targetMastery ?? 0}%`).join('\n') || 'Not available.',
    '',
    'LEARNING GOALS',
    goalLines,
  ].join('\n');

  return { systemPrompt, userPrompt };
};

// ---------------------------------------------------------------------------
// Strict validation / whitelisting of the AI response — no arbitrary fields
// ---------------------------------------------------------------------------

const isBoundedStringArray = (value, max) =>
  Array.isArray(value) &&
  value.length <= max &&
  value.every((item) => typeof item === 'string' && item.trim().length > 0 && item.length <= 300);

const validateEvaluationOutput = (raw, context) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new EvaluationValidationError('invalid_output');
  }

  const overallAssessment = normalizeText(raw.overallAssessment).slice(0, 1000);
  if (!overallAssessment) {
    throw new EvaluationValidationError('missing_overall_assessment');
  }

  if (!isBoundedStringArray(raw.strengths, MAX_LIST_ITEMS)) {
    throw new EvaluationValidationError('invalid_strengths');
  }
  if (!isBoundedStringArray(raw.weaknesses, MAX_LIST_ITEMS)) {
    throw new EvaluationValidationError('invalid_weaknesses');
  }
  if (!Array.isArray(raw.topicInsights)) {
    throw new EvaluationValidationError('invalid_topic_insights');
  }

  const topicByName = new Map(context.topicContexts.map((t) => [t.topicName.toLowerCase(), t]));

  const topicInsights = raw.topicInsights.map((item) => {
    const topicName = normalizeText(item?.topic);
    const matched = topicByName.get(topicName.toLowerCase());
    if (!matched) {
      throw new EvaluationValidationError('topic_not_recognized');
    }
    if (!UNDERSTANDING_LEVEL_VALUES.includes(item?.understandingLevel)) {
      throw new EvaluationValidationError('invalid_understanding_level');
    }
    const strengths = item.strengths ?? [];
    const weaknesses = item.weaknesses ?? [];
    if (!isBoundedStringArray(strengths, MAX_TOPIC_LIST_ITEMS) || !isBoundedStringArray(weaknesses, MAX_TOPIC_LIST_ITEMS)) {
      throw new EvaluationValidationError('invalid_topic_strengths_weaknesses');
    }
    const recommendation = normalizeText(item.recommendation).slice(0, 500);
    if (!recommendation) {
      throw new EvaluationValidationError('missing_topic_recommendation');
    }

    return {
      topic: matched.topicId || null,
      topicName: matched.topicName,
      performance: matched.testPercentage,
      understandingLevel: item.understandingLevel,
      strengths,
      weaknesses,
      recommendation,
    };
  });

  const studyConsistencyAssessment = normalizeText(raw.studyConsistencyAssessment).slice(0, 800);
  if (!studyConsistencyAssessment) {
    throw new EvaluationValidationError('missing_study_consistency_assessment');
  }

  const plannedVsActualInsight = normalizeText(raw.plannedVsActualInsight).slice(0, 800);
  if (!plannedVsActualInsight) {
    throw new EvaluationValidationError('missing_planned_vs_actual_insight');
  }

  if (!isBoundedStringArray(raw.recommendedFocusAreas, MAX_LIST_ITEMS)) {
    throw new EvaluationValidationError('invalid_recommended_focus_areas');
  }

  const learningSummary = normalizeText(raw.learningSummary).slice(0, 1000);
  if (!learningSummary) {
    throw new EvaluationValidationError('missing_learning_summary');
  }

  // Only the fields above are ever kept — anything else the model returned
  // is silently dropped, so no arbitrary AI-generated field can reach the
  // database.
  return {
    overallAssessment,
    strengths: raw.strengths,
    weaknesses: raw.weaknesses,
    topicInsights,
    studyConsistencyAssessment,
    plannedVsActualInsight,
    recommendedFocusAreas: raw.recommendedFocusAreas,
    learningSummary,
  };
};

// ---------------------------------------------------------------------------
// Deterministic fallback — grounded in the same real data, used whenever
// Groq is not configured, fails, or returns invalid output.
// ---------------------------------------------------------------------------

const understandingLevelFromPercentage = (percentage) => {
  const value = typeof percentage === 'number' ? percentage : 0;
  if (value >= 85) return 'strong';
  if (value >= 65) return 'proficient';
  if (value >= 40) return 'developing';
  return 'weak';
};

const generateFallbackEvaluation = (context, test) => {
  const topicInsights = context.topicContexts.map((t) => {
    const level = understandingLevelFromPercentage(t.testPercentage);
    const strengths = [];
    const weaknesses = [];

    if (t.testPercentage !== null && t.testPercentage >= 65) {
      strengths.push(`Scored ${t.testPercentage}% on today's test for this topic.`);
    } else if (t.testPercentage !== null) {
      weaknesses.push(`Scored ${t.testPercentage}% on today's test for this topic.`);
    }

    if (t.plannedMinutes > 0 && t.actualMinutes < t.plannedMinutes) {
      weaknesses.push(`Studied ${t.actualMinutes} of the planned ${t.plannedMinutes} minutes today.`);
    } else if (t.plannedMinutes > 0) {
      strengths.push(`Met or exceeded the planned ${t.plannedMinutes} study minutes today.`);
    }

    return {
      topic: t.topicId || null,
      topicName: t.topicName,
      performance: t.testPercentage,
      understandingLevel: level,
      strengths,
      weaknesses,
      recommendation:
        level === 'weak' || level === 'developing'
          ? `Revisit "${t.topicName}" with focused practice before moving on.`
          : `Keep reinforcing "${t.topicName}" with periodic review.`,
    };
  });

  const rankedByPerformance = [...topicInsights].sort((a, b) => (a.performance ?? 0) - (b.performance ?? 0));
  const weakest = rankedByPerformance[0];
  const strongest = rankedByPerformance[rankedByPerformance.length - 1];

  const overallAssessment =
    `Overall test score was ${test.result.percentage}% across ${test.result.totalQuestions} question(s).` +
    (strongest ? ` Strongest performance was on "${strongest.topicName}" (${strongest.performance ?? 0}%).` : '') +
    (weakest && weakest !== strongest ? ` "${weakest.topicName}" needs the most attention (${weakest.performance ?? 0}%).` : '');

  const strengths = topicInsights.flatMap((t) => t.strengths).slice(0, MAX_LIST_ITEMS);
  const weaknesses = topicInsights.flatMap((t) => t.weaknesses).slice(0, MAX_LIST_ITEMS);

  const plannedVsActualInsight =
    context.totalPlannedMinutes > 0
      ? `Studied ${context.totalActualMinutes} of ${context.totalPlannedMinutes} planned minutes today ` +
        `(${Math.round((context.totalActualMinutes / context.totalPlannedMinutes) * 100)}%).`
      : `Studied ${context.totalActualMinutes} minutes today; no planned minutes were recorded for comparison.`;

  const studyConsistencyAssessment =
    `${context.roadmapEntryCounts.completed} roadmap item(s) completed, ${context.roadmapEntryCounts.partial} partial, ` +
    `${context.roadmapEntryCounts.missed} missed today.`;

  const recommendedFocusAreas = topicInsights
    .filter((t) => t.understandingLevel === 'weak' || t.understandingLevel === 'developing')
    .map((t) => t.topicName)
    .slice(0, MAX_LIST_ITEMS);

  const learningSummary =
    `Based on today's ${test.result.totalQuestions}-question test and ${context.totalActualMinutes} focused minutes, ` +
    `understanding is strongest in ${strongest ? strongest.topicName : 'the covered topics'} and needs reinforcement in ` +
    `${recommendedFocusAreas.length > 0 ? recommendedFocusAreas.join(', ') : 'no specific topic right now'}.`;

  return {
    overallAssessment,
    strengths: strengths.length > 0 ? strengths : ['No standout strengths identified from today\u2019s data yet.'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['No significant weaknesses identified from today\u2019s data.'],
    topicInsights,
    studyConsistencyAssessment,
    plannedVsActualInsight,
    recommendedFocusAreas: recommendedFocusAreas.length > 0 ? recommendedFocusAreas : ['General review'],
    learningSummary,
  };
};

// ---------------------------------------------------------------------------
// Evaluation generation entry point (Groq w/ deterministic fallback)
// ---------------------------------------------------------------------------

const generateEvaluationContent = async (context, test) => {
  if (isGroqConfigured()) {
    try {
      const { systemPrompt, userPrompt } = buildEvaluationPrompt(context, test);
      const groqResponse = await requestStudyPlanCompletion({ systemPrompt, userPrompt });
      const content = validateEvaluationOutput(groqResponse, context);
      return { content, source: 'ai', aiUsed: true, aiModel: env.groqModel, aiFallbackReason: null };
    } catch (err) {
      const reason =
        err instanceof GroqServiceError
          ? err.reason
          : err instanceof EvaluationValidationError
            ? err.message
            : 'unknown_error';
      return {
        content: generateFallbackEvaluation(context, test),
        source: 'algorithm',
        aiUsed: false,
        aiModel: null,
        aiFallbackReason: reason,
      };
    }
  }

  return {
    content: generateFallbackEvaluation(context, test),
    source: 'algorithm',
    aiUsed: false,
    aiModel: null,
    aiFallbackReason: 'missing_api_key',
  };
};

// ---------------------------------------------------------------------------
// Persistence — one evaluation per submitted test
// ---------------------------------------------------------------------------

const getOwnedSubmittedTestOrThrow = async (userId, testId) => {
  if (!isValidObjectId(testId)) {
    throw new ApiError(400, 'Invalid test id');
  }
  const test = await EndOfDayTest.findOne({ _id: testId, user: userId });
  if (!test) {
    throw new ApiError(404, 'End-of-day test not found.');
  }
  if (test.status !== 'submitted' || !test.result) {
    throw new ApiError(422, 'This test has not been submitted yet. Submit it before requesting an evaluation.');
  }
  return test;
};

const buildEvaluationFields = (userId, test, context, generated) => ({
  user: userId,
  subject: test.subject,
  studyDate: test.studyDate,
  endOfDayTest: test._id,
  source: generated.source,
  overallAssessment: generated.content.overallAssessment,
  strengths: generated.content.strengths,
  weaknesses: generated.content.weaknesses,
  topicInsights: generated.content.topicInsights,
  studyConsistency: {
    // Deterministic — computed by our code, not the AI. See
    // computeConsistencyScore above.
    consistencyScore: computeConsistencyScore(context),
    assessment: generated.content.studyConsistencyAssessment,
  },
  plannedVsActualInsight: generated.content.plannedVsActualInsight,
  recommendedFocusAreas: generated.content.recommendedFocusAreas,
  learningSummary: generated.content.learningSummary,
  generationMetadata: {
    aiUsed: generated.aiUsed,
    aiModel: generated.aiModel,
    aiFallbackReason: generated.aiFallbackReason,
  },
});

export const getEvaluationForTest = async (userId, testId) => {
  const test = await getOwnedSubmittedTestOrThrow(userId, testId);
  return Evaluation.findOne({ endOfDayTest: test._id, user: userId });
};

// Generates (or, if one already exists and regenerate isn't set, simply
// returns) the evaluation for a given submitted test. Regeneration updates
// the same document in place (bumping `version`) — it never creates a
// second evaluation for the same test, and it never touches the test's own
// persisted result.
export const generateEvaluation = async (userId, testId, { regenerate = false } = {}) => {
  const test = await getOwnedSubmittedTestOrThrow(userId, testId);

  const existing = await Evaluation.findOne({ endOfDayTest: test._id, user: userId });
  if (existing && !regenerate) {
    return existing;
  }

  const context = await gatherEvaluationContext(userId, test);
  const generated = await generateEvaluationContent(context, test);
  const fields = buildEvaluationFields(userId, test, context, generated);

  if (existing) {
    Object.assign(existing, fields);
    existing.version = (existing.version || 1) + 1;
    await existing.save();
    return existing;
  }

  return Evaluation.create({ ...fields, version: 1 });
};

// ---------------------------------------------------------------------------
// "Today" convenience wrappers, mirroring Part 4's eod-test/today endpoints
// ---------------------------------------------------------------------------

export const getTodayEvaluation = async (userId) => {
  const test = await getTodayTest(userId);
  if (!test || test.status !== 'submitted') {
    return { test: test ? sanitizeTest(test) : null, evaluation: null };
  }
  const evaluation = await Evaluation.findOne({ endOfDayTest: test._id, user: userId });
  return { test: sanitizeTest(test), evaluation };
};

export const generateTodayEvaluation = async (userId, { regenerate = false } = {}) => {
  const test = await getTodayTest(userId);
  if (!test) {
    throw new ApiError(404, "Today's test has not been generated yet.");
  }
  const evaluation = await generateEvaluation(userId, test._id, { regenerate });
  return { test: sanitizeTest(test), evaluation };
};
