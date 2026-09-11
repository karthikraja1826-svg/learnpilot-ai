import { EndOfDayTest } from '../models/EndOfDayTest.js';
import { StudyPlan } from '../models/StudyPlan.js';
import { StudySession } from '../models/StudySession.js';
import { StudyAvailability } from '../models/StudyAvailability.js';
import { Topic } from '../models/Topic.js';
import { ApiError } from '../utils/ApiError.js';
import { startOfLocalDay, resolveTimezone, localDateTimeToUTC, addCalendarDays } from '../utils/timezone.js';
import { requestStudyPlanCompletion, isGroqConfigured, GroqServiceError } from './groq.service.js';
import * as subjectService from './subject.service.js';
import { env } from '../config/env.js';

const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 12;
const MAX_OPTIONS = 6;
const SHORT_ANSWER_MATCH_THRESHOLD = 0.5;
const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are', 'that', 'this']);

// UI-only estimate of how long each question type takes to answer. Used
// solely to render an estimated test duration on the intro screen — never
// persisted, never counted as StudySession/analytics time.
const QUESTION_TIME_ESTIMATE_SECONDS = {
  multiple_choice: 40,
  short_answer: 90,
};

class GroqOutputValidationError extends Error {
  constructor(reason) {
    super(reason);
    this.name = 'GroqOutputValidationError';
  }
}

const getUserTimezone = async (userId) => {
  const availability = await StudyAvailability.findOne({ user: userId }).select('timezone');
  return resolveTimezone(availability?.timezone);
};

// ---------------------------------------------------------------------------
// Gathering today's real study context (Part 2 roadmap + Part 3 sessions)
// ---------------------------------------------------------------------------

const gatherTodayContext = async (userId) => {
  const { subject } = await subjectService.getActiveOptimizationSubject(userId);
  if (!subject) {
    throw new ApiError(
      422,
      'No active optimization subject selected. Choose a subject to optimize before taking today\u2019s test.'
    );
  }

  const timezone = await getUserTimezone(userId);
  const today = startOfLocalDay(new Date(), timezone);
  const dayStartUTC = localDateTimeToUTC(today, '00:00', timezone);
  const dayEndUTC = localDateTimeToUTC(addCalendarDays(today, 1), '00:00', timezone);

  const roadmapPlan = await StudyPlan.findOne({
    user: userId,
    planType: 'daily',
    optimizationSubject: subject._id,
    startDate: today,
    status: { $ne: 'archived' },
  }).sort({ generatedAt: -1 });

  const todaySessions = await StudySession.find({
    user: userId,
    subject: subject._id,
    startTime: { $gte: dayStartUTC, $lt: dayEndUTC },
  }).sort({ startTime: 1 });

  const topicIdSet = new Set();
  (roadmapPlan?.entries ?? []).forEach((entry) => {
    if (entry.topic) topicIdSet.add(String(entry.topic));
  });
  todaySessions.forEach((session) => {
    if (session.topic) topicIdSet.add(String(session.topic));
  });

  const topics = topicIdSet.size > 0
    ? await Topic.find({ _id: { $in: [...topicIdSet] }, user: userId, subject: subject._id })
    : [];
  const topicById = new Map(topics.map((topic) => [String(topic._id), topic]));

  const plannedMinutesByTopic = new Map();
  (roadmapPlan?.entries ?? []).forEach((entry) => {
    if (!entry.topic) return;
    const key = String(entry.topic);
    plannedMinutesByTopic.set(key, (plannedMinutesByTopic.get(key) || 0) + entry.durationMinutes);
  });

  const actualMinutesByTopic = new Map();
  const completedByTopic = new Map();
  todaySessions.forEach((session) => {
    if (!session.topic) return;
    const key = String(session.topic);
    actualMinutesByTopic.set(key, (actualMinutesByTopic.get(key) || 0) + (session.actualDurationMinutes || 0));
    if (session.status === 'completed') {
      completedByTopic.set(key, true);
    }
  });

  const topicSummaries = [...topicIdSet].map((key) => {
    const topic = topicById.get(key);
    return {
      topicId: key,
      topicName: topic?.name || (roadmapPlan?.entries ?? []).find((e) => String(e.topic) === key)?.topicName || 'General',
      difficulty: topic?.difficulty ?? null,
      currentMastery: topic?.currentMastery ?? null,
      targetMastery: topic?.targetMastery ?? null,
      plannedMinutes: Math.round(plannedMinutesByTopic.get(key) || 0),
      actualMinutes: Math.round(actualMinutesByTopic.get(key) || 0),
      completed: completedByTopic.get(key) || false,
    };
  });

  if (topicSummaries.length === 0) {
    throw new ApiError(
      422,
      'No study activity recorded for today yet. Study something from today\u2019s roadmap before taking the test.'
    );
  }

  const totalPlannedMinutes = topicSummaries.reduce((sum, t) => sum + t.plannedMinutes, 0);
  const totalActualMinutes = topicSummaries.reduce((sum, t) => sum + t.actualMinutes, 0);

  return {
    subject,
    roadmapPlan,
    today,
    topicSummaries,
    totalPlannedMinutes,
    totalActualMinutes,
    sessionCount: todaySessions.length,
  };
};

// ---------------------------------------------------------------------------
// Groq question generation + strict validation
// ---------------------------------------------------------------------------

const buildGroqPrompt = (context) => {
  const systemPrompt = [
    'You are an assessment generator for a study app called LearnPilot AI.',
    'Generate an end-of-day test strictly for what the student actually studied today.',
    'Respond ONLY with a JSON object of the form:',
    '{ "questions": [ { "questionText": string, "questionType": "multiple_choice" | "short_answer",',
    '"topicName": string, "options": string[] (only for multiple_choice, 2-6 items),',
    '"correctAnswer": string, "explanation": string } ] }',
    'Rules:',
    '- Generate between 4 and 8 questions total.',
    '- Every "topicName" MUST exactly match one of the provided topic names, or the subject name for a general question.',
    '- For multiple_choice, "correctAnswer" MUST exactly equal one of the strings in "options".',
    '- For short_answer, "correctAnswer" is the expected concise answer (1-2 sentences or a key phrase).',
    '- Prioritize topics with more actual focused minutes today.',
    '- Do not invent topics outside the provided list.',
    '- Do not include any text outside the JSON object.',
  ].join('\n');

  const userPrompt = JSON.stringify({
    subject: context.subject.name,
    topics: context.topicSummaries.map((t) => ({
      name: t.topicName,
      difficulty: t.difficulty,
      currentMastery: t.currentMastery,
      targetMastery: t.targetMastery,
      plannedMinutesToday: t.plannedMinutes,
      actualFocusedMinutesToday: t.actualMinutes,
      completedToday: t.completed,
    })),
    totalPlannedMinutesToday: context.totalPlannedMinutes,
    totalActualFocusedMinutesToday: context.totalActualMinutes,
  });

  return { systemPrompt, userPrompt };
};

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const validateGroqQuestions = (raw, context) => {
  const allowedTopicNames = new Set(
    [...context.topicSummaries.map((t) => t.topicName.toLowerCase()), context.subject.name.toLowerCase()]
  );

  if (!raw || !Array.isArray(raw.questions)) {
    throw new GroqOutputValidationError('missing_questions_array');
  }

  if (raw.questions.length < MIN_QUESTIONS || raw.questions.length > MAX_QUESTIONS) {
    throw new GroqOutputValidationError('invalid_question_count');
  }

  const topicByName = new Map(context.topicSummaries.map((t) => [t.topicName.toLowerCase(), t]));

  const questions = raw.questions.map((q) => {
    const questionText = normalizeText(q.questionText);
    const questionType = q.questionType;
    const topicName = normalizeText(q.topicName);
    const correctAnswer = normalizeText(q.correctAnswer);
    const explanation = normalizeText(q.explanation).slice(0, 500);

    if (!questionText || questionText.length > 500) {
      throw new GroqOutputValidationError('invalid_question_text');
    }
    if (!['multiple_choice', 'short_answer'].includes(questionType)) {
      throw new GroqOutputValidationError('invalid_question_type');
    }
    if (!topicName || !allowedTopicNames.has(topicName.toLowerCase())) {
      throw new GroqOutputValidationError('topic_not_allowed');
    }
    if (!correctAnswer || correctAnswer.length > 300) {
      throw new GroqOutputValidationError('invalid_correct_answer');
    }

    let options = [];
    if (questionType === 'multiple_choice') {
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > MAX_OPTIONS) {
        throw new GroqOutputValidationError('invalid_options');
      }
      options = q.options.map((opt) => normalizeText(opt)).filter(Boolean);
      if (options.length !== q.options.length) {
        throw new GroqOutputValidationError('empty_option');
      }
      const uniqueOptions = new Set(options.map((o) => o.toLowerCase()));
      if (uniqueOptions.size !== options.length) {
        throw new GroqOutputValidationError('duplicate_options');
      }
      if (!options.some((opt) => opt.toLowerCase() === correctAnswer.toLowerCase())) {
        throw new GroqOutputValidationError('correct_answer_not_in_options');
      }
    }

    const matchedTopic = topicByName.get(topicName.toLowerCase());

    return {
      questionText,
      questionType,
      topic: matchedTopic ? matchedTopic.topicId : null,
      topicName,
      options,
      correctAnswer,
      explanation,
    };
  });

  return questions;
};

// ---------------------------------------------------------------------------
// Deterministic fallback — grounded in the same real per-topic data, used
// whenever Groq is not configured, fails, or returns invalid output.
// ---------------------------------------------------------------------------

const generateFallbackQuestions = (context) => {
  const sorted = [...context.topicSummaries].sort((a, b) => b.actualMinutes - a.actualMinutes);
  const questions = [];

  sorted.forEach((topic) => {
    questions.push({
      questionText: `What is your current mastery band for "${topic.topicName}"?`,
      questionType: 'multiple_choice',
      topic: topic.topicId,
      topicName: topic.topicName,
      options: ['Below 40% (Needs work)', '40\u201369% (Developing)', '70\u201389% (Proficient)', '90\u2013100% (Mastered)'],
      correctAnswer: masteryBandLabel(topic.currentMastery),
      explanation: `Based on your recorded mastery of ${topic.currentMastery ?? 0}% for this topic.`,
    });

    questions.push({
      questionText: `In one or two sentences, summarize the key idea you studied today in "${topic.topicName}".`,
      questionType: 'short_answer',
      topic: topic.topicId,
      topicName: topic.topicName,
      options: [],
      correctAnswer: topic.topicName,
      explanation: 'Graded on whether you provided a substantive recall of the topic you actually studied.',
    });
  });

  const busiest = sorted[0];
  if (busiest && sorted.length >= 2) {
    questions.unshift({
      questionText: 'Which topic did you spend the most actual focused time on today?',
      questionType: 'multiple_choice',
      topic: null,
      topicName: context.subject.name,
      options: sorted.slice(0, Math.min(4, sorted.length)).map((t) => t.topicName),
      correctAnswer: busiest.topicName,
      explanation: `You logged ${busiest.actualMinutes} focused minutes on this topic today.`,
    });
  }

  return questions.slice(0, MAX_QUESTIONS);
};

const masteryBandLabel = (mastery) => {
  const value = typeof mastery === 'number' ? mastery : 0;
  if (value >= 90) return '90\u2013100% (Mastered)';
  if (value >= 70) return '70\u201389% (Proficient)';
  if (value >= 40) return '40\u201369% (Developing)';
  return 'Below 40% (Needs work)';
};

// ---------------------------------------------------------------------------
// Question generation entry point (Groq w/ deterministic fallback)
// ---------------------------------------------------------------------------

const generateQuestions = async (context) => {
  if (isGroqConfigured()) {
    try {
      const { systemPrompt, userPrompt } = buildGroqPrompt(context);
      const groqResponse = await requestStudyPlanCompletion({ systemPrompt, userPrompt });
      const questions = validateGroqQuestions(groqResponse, context);
      return { questions, source: 'ai', aiUsed: true, aiModel: env.groqModel, aiFallbackReason: null };
    } catch (err) {
      const reason =
        err instanceof GroqServiceError
          ? err.reason
          : err instanceof GroqOutputValidationError
            ? err.message
            : 'unknown_error';
      return {
        questions: generateFallbackQuestions(context),
        source: 'algorithm',
        aiUsed: false,
        aiModel: null,
        aiFallbackReason: reason,
      };
    }
  }

  return {
    questions: generateFallbackQuestions(context),
    source: 'algorithm',
    aiUsed: false,
    aiModel: null,
    aiFallbackReason: 'missing_api_key',
  };
};

// ---------------------------------------------------------------------------
// Sanitization — correctAnswer/explanation never leave the server pre-submission
// ---------------------------------------------------------------------------

const sanitizeQuestion = (question, revealAnswers) => {
  const base = {
    _id: question._id,
    questionText: question.questionText,
    questionType: question.questionType,
    topic: question.topic,
    topicName: question.topicName,
    options: question.options,
  };
  if (revealAnswers) {
    base.correctAnswer = question.correctAnswer;
    base.explanation = question.explanation;
  }
  return base;
};

export const sanitizeTest = (test) => {
  const revealAnswers = test.status === 'submitted';
  const obj = test.toObject ? test.toObject() : test;
  return {
    ...obj,
    questions: obj.questions.map((q) => sanitizeQuestion(q, revealAnswers)),
  };
};

// UI-only estimate (minutes) for the intro screen. Not stored, not added to
// study time or analytics — see QUESTION_TIME_ESTIMATE_SECONDS above.
const estimateTestDurationMinutes = (questions) => {
  const totalSeconds = (questions || []).reduce((sum, q) => {
    const perQuestionSeconds =
      QUESTION_TIME_ESTIMATE_SECONDS[q.questionType] ?? QUESTION_TIME_ESTIMATE_SECONDS.short_answer;
    return sum + perQuestionSeconds;
  }, 0);
  return Math.max(1, Math.round(totalSeconds / 60));
};

// ---------------------------------------------------------------------------
// Public service API
// ---------------------------------------------------------------------------

export const getTodayTest = async (userId) => {
  const { subject } = await subjectService.getActiveOptimizationSubject(userId);
  if (!subject) {
    return null;
  }
  const timezone = await getUserTimezone(userId);
  const today = startOfLocalDay(new Date(), timezone);
  return EndOfDayTest.findOne({ user: userId, subject: subject._id, studyDate: today });
};

// Returns the persisted test for today, creating it if (and only if) it does
// not already exist yet. Safe to call repeatedly — the existing-test lookup
// plus the unique (user, subject, studyDate) index mean this never creates a
// duplicate test.
const ensureGeneratedTest = async (userId, context) => {
  const existing = await EndOfDayTest.findOne({
    user: userId,
    subject: context.subject._id,
    studyDate: context.today,
  });
  if (existing) {
    return existing;
  }

  const { questions, source, aiUsed, aiModel, aiFallbackReason } = await generateQuestions(context);

  return EndOfDayTest.create({
    user: userId,
    subject: context.subject._id,
    studyPlan: context.roadmapPlan ? context.roadmapPlan._id : null,
    studyDate: context.today,
    topicsCovered: context.topicSummaries.filter((t) => t.topicId).map((t) => t.topicId),
    status: 'not_started',
    questions,
    answers: [],
    source,
    generationMetadata: { aiUsed, aiModel, aiFallbackReason },
  });
};

export const getTodayTestPreview = async (userId) => {
  const context = await gatherTodayContext(userId);
  // The intro screen needs the real question count and a duration estimate
  // grounded in the actual generated test, so make sure that test exists
  // (reusing it if it already does) rather than showing placeholder values.
  const test = await ensureGeneratedTest(userId, context);

  return {
    subject: { _id: context.subject._id, name: context.subject.name },
    testDate: context.today,
    topics: context.topicSummaries.map((t) => ({ topicName: t.topicName, actualMinutes: t.actualMinutes })),
    totalActualMinutes: context.totalActualMinutes,
    questionCount: test.questions.length,
    estimatedTestDurationMinutes: estimateTestDurationMinutes(test.questions),
    testStatus: test.status,
  };
};

export const generateTodayTest = async (userId) => {
  const context = await gatherTodayContext(userId);
  const test = await ensureGeneratedTest(userId, context);
  return sanitizeTest(test);
};

const getOwnedTodayTestOrThrow = async (userId) => {
  const { subject } = await subjectService.getActiveOptimizationSubject(userId);
  if (!subject) {
    throw new ApiError(422, 'No active optimization subject selected.');
  }
  const timezone = await getUserTimezone(userId);
  const today = startOfLocalDay(new Date(), timezone);
  const test = await EndOfDayTest.findOne({ user: userId, subject: subject._id, studyDate: today });
  if (!test) {
    throw new ApiError(404, "Today's test has not been generated yet.");
  }
  return test;
};

export const startTodayTest = async (userId) => {
  const test = await getOwnedTodayTestOrThrow(userId);

  if (test.status === 'not_started') {
    test.status = 'started';
    test.startedAt = new Date();
    await test.save();
  }

  return sanitizeTest(test);
};

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

const significantWords = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word));

const gradeShortAnswer = (correctAnswer, answerText) => {
  const trimmed = answerText.trim();
  if (!trimmed) return false;

  const expectedWords = significantWords(correctAnswer);
  if (expectedWords.length === 0) {
    return trimmed.length >= 15;
  }

  const givenWords = new Set(significantWords(answerText));
  const matched = expectedWords.filter((word) => givenWords.has(word)).length;
  const ratio = matched / expectedWords.length;

  return ratio >= SHORT_ANSWER_MATCH_THRESHOLD;
};

const gradeQuestion = (question, answerText) => {
  const trimmed = (answerText || '').trim();
  if (!trimmed) return false;

  if (question.questionType === 'multiple_choice') {
    return trimmed.toLowerCase() === question.correctAnswer.trim().toLowerCase();
  }

  return gradeShortAnswer(question.correctAnswer, trimmed);
};

export const submitTodayTest = async (userId, body) => {
  const test = await getOwnedTodayTestOrThrow(userId);

  if (test.status === 'submitted') {
    throw new ApiError(409, 'This test has already been submitted.');
  }

  const submittedAnswers = Array.isArray(body?.answers) ? body.answers : [];
  const questionIds = new Set(test.questions.map((q) => String(q._id)));

  const invalid = submittedAnswers.some((a) => !a || !questionIds.has(String(a.questionId)));
  if (invalid) {
    throw new ApiError(400, 'One or more submitted answers reference an invalid question.');
  }

  const answerByQuestionId = new Map(
    submittedAnswers.map((a) => [String(a.questionId), typeof a.answerText === 'string' ? a.answerText : ''])
  );

  const topicStatsByKey = new Map();
  const answers = test.questions.map((question) => {
    const answerText = answerByQuestionId.get(String(question._id)) ?? '';
    const isCorrect = gradeQuestion(question, answerText);

    const key = question.topic ? String(question.topic) : `name:${question.topicName}`;
    if (!topicStatsByKey.has(key)) {
      topicStatsByKey.set(key, { topic: question.topic, topicName: question.topicName, correct: 0, total: 0 });
    }
    const stats = topicStatsByKey.get(key);
    stats.total += 1;
    if (isCorrect) stats.correct += 1;

    return { question: question._id, answerText: answerText.trim(), isCorrect };
  });

  const attemptedQuestions = answers.filter((a) => a.answerText.length > 0).length;
  const correctAnswers = answers.filter((a) => a.isCorrect).length;
  const totalQuestions = test.questions.length;
  const incorrectAnswers = totalQuestions - correctAnswers;
  const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  const topicPerformance = [...topicStatsByKey.values()].map((stats) => ({
    topic: stats.topic,
    topicName: stats.topicName,
    correct: stats.correct,
    total: stats.total,
    percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
  }));

  test.answers = answers;
  test.status = 'submitted';
  test.submittedAt = new Date();
  test.result = {
    totalQuestions,
    attemptedQuestions,
    correctAnswers,
    incorrectAnswers,
    score: correctAnswers,
    percentage,
    topicPerformance,
    completionStatus: attemptedQuestions === totalQuestions ? 'completed' : 'partial',
  };

  await test.save();

  return sanitizeTest(test);
};

export const getTodayResult = async (userId) => {
  const test = await getOwnedTodayTestOrThrow(userId);
  if (test.status !== 'submitted' || !test.result) {
    throw new ApiError(404, "Today's test has not been submitted yet.");
  }
  return { test: sanitizeTest(test), result: test.result };
};
