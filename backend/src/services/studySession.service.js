import { StudySession, SESSION_TYPE_VALUES, SESSION_STATUS_VALUES } from '../models/StudySession.js';
import { StudyPlan } from '../models/StudyPlan.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidObjectId } from '../utils/validators.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { verifySubjectOwnership } from './subject.service.js';
import { verifyTopicOwnership } from './topic.service.js';
import { verifyAssignmentOwnership } from './assignment.service.js';
import { verifyTaskOwnership } from './task.service.js';
import {
  recordSessionStart,
  recordSessionCompletion,
  recordSessionAbandon,
  recordSessionCancel,
} from './studyPerformance.service.js';

const DURATION_MIN = 1;
const DURATION_MAX = 480;
const CYCLES_MAX = 20;
const MINUTE_MS = 60000;

const round2 = (value) => Math.round(value * 100) / 100;

const elapsedMinutes = (from, to) => Math.max(0, (to.getTime() - from.getTime()) / MINUTE_MS);

const loadRelation = async (value, verifyFn, userId, label) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (!isValidObjectId(value)) {
    throw new ApiError(400, `Invalid ${label} id`);
  }
  return verifyFn(value, userId);
};

const getOwnedPlanEntry = async (studyPlanId, studyPlanEntryId, userId) => {
  if (!isValidObjectId(studyPlanId)) {
    throw new ApiError(400, 'Invalid studyPlan id');
  }
  const plan = await StudyPlan.findOne({ _id: studyPlanId, user: userId });
  if (!plan) {
    throw new ApiError(404, 'Study plan not found');
  }

  if (studyPlanEntryId === undefined || studyPlanEntryId === null || studyPlanEntryId === '') {
    return { plan, entry: null };
  }

  if (!isValidObjectId(studyPlanEntryId)) {
    throw new ApiError(400, 'Invalid studyPlanEntry id');
  }

  const entry = plan.entries.id(studyPlanEntryId);
  if (!entry) {
    throw new ApiError(404, 'Study plan entry not found');
  }

  return { plan, entry };
};

const resolveSessionRelations = async (userId, body) => {
  let plan = null;
  let entry = null;

  if (body.studyPlan !== undefined && body.studyPlan !== null && body.studyPlan !== '') {
    const result = await getOwnedPlanEntry(body.studyPlan, body.studyPlanEntry, userId);
    plan = result.plan;
    entry = result.entry;
  } else if (body.studyPlanEntry !== undefined && body.studyPlanEntry !== null && body.studyPlanEntry !== '') {
    throw new ApiError(400, 'studyPlan is required when studyPlanEntry is provided');
  }

  const [subjectDoc, topicDoc, assignmentDoc, taskDoc] = await Promise.all([
    loadRelation(body.subject !== undefined ? body.subject : entry?.subject, verifySubjectOwnership, userId, 'subject'),
    loadRelation(body.topic !== undefined ? body.topic : entry?.topic, verifyTopicOwnership, userId, 'topic'),
    loadRelation(
      body.assignment !== undefined ? body.assignment : entry?.assignment,
      verifyAssignmentOwnership,
      userId,
      'assignment'
    ),
    loadRelation(body.task !== undefined ? body.task : entry?.task, verifyTaskOwnership, userId, 'task'),
  ]);

  if (entry) {
    if (entry.subject && subjectDoc && String(entry.subject) !== String(subjectDoc._id)) {
      throw new ApiError(400, 'subject does not match the referenced study plan entry');
    }
    if (entry.topic && topicDoc && String(entry.topic) !== String(topicDoc._id)) {
      throw new ApiError(400, 'topic does not match the referenced study plan entry');
    }
    if (entry.assignment && assignmentDoc && String(entry.assignment) !== String(assignmentDoc._id)) {
      throw new ApiError(400, 'assignment does not match the referenced study plan entry');
    }
    if (entry.task && taskDoc && String(entry.task) !== String(taskDoc._id)) {
      throw new ApiError(400, 'task does not match the referenced study plan entry');
    }
  }

  if (subjectDoc && topicDoc && String(topicDoc.subject) !== String(subjectDoc._id)) {
    throw new ApiError(400, 'topic does not belong to the specified subject');
  }
  if (subjectDoc && assignmentDoc && assignmentDoc.subject && String(assignmentDoc.subject) !== String(subjectDoc._id)) {
    throw new ApiError(400, 'assignment does not belong to the specified subject');
  }
  if (subjectDoc && taskDoc && taskDoc.subject && String(taskDoc.subject) !== String(subjectDoc._id)) {
    throw new ApiError(400, 'task does not belong to the specified subject');
  }
  if (topicDoc && taskDoc && taskDoc.topic && String(taskDoc.topic) !== String(topicDoc._id)) {
    throw new ApiError(400, 'task does not belong to the specified topic');
  }
  if (assignmentDoc && taskDoc && taskDoc.assignment && String(taskDoc.assignment) !== String(assignmentDoc._id)) {
    throw new ApiError(400, 'task does not belong to the specified assignment');
  }

  return {
    plan,
    entry,
    subjectId: subjectDoc ? subjectDoc._id : null,
    topicId: topicDoc ? topicDoc._id : null,
    assignmentId: assignmentDoc ? assignmentDoc._id : null,
    taskId: taskDoc ? taskDoc._id : null,
  };
};

const validateCreateInput = (body) => {
  const errors = [];
  const data = {};

  if (!SESSION_TYPE_VALUES.includes(body.sessionType)) {
    errors.push(`sessionType must be one of: ${SESSION_TYPE_VALUES.join(', ')}`);
  } else {
    data.sessionType = body.sessionType;
  }

  const plannedDurationMinutes = Number(body.plannedDurationMinutes);
  if (!Number.isFinite(plannedDurationMinutes) || plannedDurationMinutes < DURATION_MIN || plannedDurationMinutes > DURATION_MAX) {
    errors.push(`plannedDurationMinutes must be a number between ${DURATION_MIN} and ${DURATION_MAX}`);
  } else {
    data.plannedDurationMinutes = plannedDurationMinutes;
  }

  ['focusDurationMinutes', 'shortBreakDurationMinutes', 'longBreakDurationMinutes'].forEach((field) => {
    if (body[field] !== undefined) {
      const value = Number(body[field]);
      if (!Number.isFinite(value) || value <= 0) {
        errors.push(`${field} must be a positive number`);
      } else {
        data[field] = value;
      }
    }
  });

  if (body.cyclesPlanned !== undefined) {
    const value = Number(body.cyclesPlanned);
    if (!Number.isInteger(value) || value < 1 || value > CYCLES_MAX) {
      errors.push(`cyclesPlanned must be an integer between 1 and ${CYCLES_MAX}`);
    } else {
      data.cyclesPlanned = value;
    }
  }

  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string' || body.notes.length > 1000) {
      errors.push('notes must be a string of at most 1000 characters');
    } else {
      data.notes = body.notes.trim();
    }
  }

  return { errors, data };
};

const getOwnedSessionOrThrow = async (sessionId, userId) => {
  if (!isValidObjectId(sessionId)) {
    throw new ApiError(400, 'Invalid study session id');
  }
  const session = await StudySession.findOne({ _id: sessionId, user: userId });
  if (!session) {
    throw new ApiError(404, 'Study session not found');
  }
  return session;
};

const ENTRY_STATUS_PRIORITY = {
  scheduled: 0,
  in_progress: 1,
  skipped: 1,
  missed: 1,
  completed: 2,
};

const syncPlanEntryStatus = async (planId, entryId, userId, targetStatus) => {
  const plan = await StudyPlan.findOne({ _id: planId, user: userId });
  if (!plan) {
    return;
  }
  const entry = plan.entries.id(entryId);
  if (!entry) {
    return;
  }

  if (targetStatus === 'in_progress' && entry.status !== 'scheduled') {
    return;
  }
  if (targetStatus !== 'completed' && entry.status === 'completed') {
    return;
  }

  const currentPriority = ENTRY_STATUS_PRIORITY[entry.status] ?? 0;
  const targetPriority = ENTRY_STATUS_PRIORITY[targetStatus] ?? 0;
  if (targetPriority < currentPriority) {
    return;
  }

  entry.status = targetStatus;
  await plan.save();
};

const updateCompletionPercentage = (session) => {
  if (!session.plannedDurationMinutes) {
    session.completionPercentage = 0;
    return;
  }
  const percentage = (session.actualDurationMinutes / session.plannedDurationMinutes) * 100;
  session.completionPercentage = Math.max(0, Math.min(100, Math.round(percentage)));
};

const accumulateActiveTime = (session, now) => {
  if (session.status === 'active' && session.lastResumedAt) {
    session.actualDurationMinutes = round2(session.actualDurationMinutes + elapsedMinutes(session.lastResumedAt, now));
  }
};

export const createSession = async (userId, body) => {
  const { errors, data } = validateCreateInput(body);
  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  const relations = await resolveSessionRelations(userId, body);

  return StudySession.create({
    ...data,
    user: userId,
    studyPlan: relations.plan ? relations.plan._id : null,
    studyPlanEntry: relations.entry ? relations.entry._id : null,
    subject: relations.subjectId,
    topic: relations.topicId,
    assignment: relations.assignmentId,
    task: relations.taskId,
    status: 'planned',
  });
};

export const listSessions = async (userId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { user: userId };

  if (query.status !== undefined) {
    if (!SESSION_STATUS_VALUES.includes(query.status)) {
      throw new ApiError(400, `status must be one of: ${SESSION_STATUS_VALUES.join(', ')}`);
    }
    filter.status = query.status;
  }

  if (query.sessionType !== undefined) {
    if (!SESSION_TYPE_VALUES.includes(query.sessionType)) {
      throw new ApiError(400, `sessionType must be one of: ${SESSION_TYPE_VALUES.join(', ')}`);
    }
    filter.sessionType = query.sessionType;
  }

  if (query.subjectId !== undefined) {
    if (!isValidObjectId(query.subjectId)) {
      throw new ApiError(400, 'Invalid subjectId');
    }
    filter.subject = query.subjectId;
  }

  if (query.topicId !== undefined) {
    if (!isValidObjectId(query.topicId)) {
      throw new ApiError(400, 'Invalid topicId');
    }
    filter.topic = query.topicId;
  }

  if (query.studyPlanId !== undefined) {
    if (!isValidObjectId(query.studyPlanId)) {
      throw new ApiError(400, 'Invalid studyPlanId');
    }
    filter.studyPlan = query.studyPlanId;
  }

  if (query.startDate !== undefined) {
    const start = new Date(query.startDate);
    if (Number.isNaN(start.getTime())) {
      throw new ApiError(400, 'Invalid startDate');
    }
    filter.startTime = { ...filter.startTime, $gte: start };
  }

  if (query.endDate !== undefined) {
    const end = new Date(query.endDate);
    if (Number.isNaN(end.getTime())) {
      throw new ApiError(400, 'Invalid endDate');
    }
    filter.startTime = { ...filter.startTime, $lte: end };
  }

  const [sessions, total] = await Promise.all([
    StudySession.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    StudySession.countDocuments(filter),
  ]);

  return { sessions, pagination: buildPaginationMeta(page, limit, total) };
};

export const getActiveSession = async (userId) => StudySession.findOne({ user: userId, status: 'active' });

export const getSessionById = async (sessionId, userId) => getOwnedSessionOrThrow(sessionId, userId);

export const updateSession = async (sessionId, userId, body) => {
  const session = await getOwnedSessionOrThrow(sessionId, userId);

  if (['completed', 'cancelled', 'abandoned'].includes(session.status)) {
    throw new ApiError(409, 'Cannot update a session that has already ended');
  }

  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string' || body.notes.length > 1000) {
      throw new ApiError(400, 'notes must be a string of at most 1000 characters');
    }
    session.notes = body.notes.trim();
  }

  if (body.plannedDurationMinutes !== undefined) {
    if (session.status !== 'planned') {
      throw new ApiError(409, 'plannedDurationMinutes can only be changed before the session starts');
    }
    const value = Number(body.plannedDurationMinutes);
    if (!Number.isFinite(value) || value < DURATION_MIN || value > DURATION_MAX) {
      throw new ApiError(400, `plannedDurationMinutes must be a number between ${DURATION_MIN} and ${DURATION_MAX}`);
    }
    session.plannedDurationMinutes = value;
  }

  await session.save();
  return session;
};

export const startSession = async (sessionId, userId) => {
  const session = await getOwnedSessionOrThrow(sessionId, userId);

  if (session.status !== 'planned') {
    throw new ApiError(409, 'Only a planned session can be started');
  }

  const activeExisting = await StudySession.findOne({ user: userId, status: 'active', _id: { $ne: session._id } });
  if (activeExisting) {
    throw new ApiError(409, 'Another study session is already active');
  }

  const now = new Date();
  session.status = 'active';
  session.startTime = now;
  session.lastResumedAt = now;
  session.pausedAt = null;
  await session.save();

  await recordSessionStart(session, userId);

  if (session.studyPlan && session.studyPlanEntry) {
    await syncPlanEntryStatus(session.studyPlan, session.studyPlanEntry, userId, 'in_progress');
  }

  return session;
};

export const pauseSession = async (sessionId, userId) => {
  const session = await getOwnedSessionOrThrow(sessionId, userId);

  if (session.status !== 'active') {
    throw new ApiError(409, 'Only an active session can be paused');
  }

  const now = new Date();
  accumulateActiveTime(session, now);
  session.status = 'paused';
  session.pausedAt = now;
  session.lastResumedAt = null;
  session.interruptionCount += 1;
  updateCompletionPercentage(session);
  await session.save();

  return session;
};

export const resumeSession = async (sessionId, userId) => {
  const session = await getOwnedSessionOrThrow(sessionId, userId);

  if (session.status !== 'paused') {
    throw new ApiError(409, 'Only a paused session can be resumed');
  }

  const activeExisting = await StudySession.findOne({ user: userId, status: 'active', _id: { $ne: session._id } });
  if (activeExisting) {
    throw new ApiError(409, 'Another study session is already active');
  }

  const now = new Date();
  if (session.pausedAt) {
    session.pauseDurationMinutes = round2(session.pauseDurationMinutes + elapsedMinutes(session.pausedAt, now));
  }
  session.status = 'active';
  session.lastResumedAt = now;
  session.pausedAt = null;
  await session.save();

  return session;
};

export const completeSession = async (sessionId, userId, body = {}) => {
  const session = await getOwnedSessionOrThrow(sessionId, userId);

  if (!['active', 'paused'].includes(session.status)) {
    throw new ApiError(409, 'Only an active or paused session can be completed');
  }

  const now = new Date();
  accumulateActiveTime(session, now);

  session.status = 'completed';
  session.endTime = now;
  session.lastResumedAt = null;
  session.pausedAt = null;
  session.completedDurationMinutes = session.actualDurationMinutes;
  updateCompletionPercentage(session);

  if (body.focusRating !== undefined && body.focusRating !== null) {
    const rating = Number(body.focusRating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new ApiError(400, 'focusRating must be a number between 1 and 5');
    }
    session.focusRating = rating;
  }

  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string' || body.notes.length > 1000) {
      throw new ApiError(400, 'notes must be a string of at most 1000 characters');
    }
    session.notes = body.notes.trim();
  }

  await session.save();

  await recordSessionCompletion(session, userId);

  if (session.studyPlan && session.studyPlanEntry) {
    await syncPlanEntryStatus(session.studyPlan, session.studyPlanEntry, userId, 'completed');
  }

  return session;
};

export const cancelSession = async (sessionId, userId) => {
  const session = await getOwnedSessionOrThrow(sessionId, userId);

  if (!['planned', 'active', 'paused'].includes(session.status)) {
    throw new ApiError(409, 'Session cannot be cancelled from its current status');
  }

  const now = new Date();
  accumulateActiveTime(session, now);

  session.status = 'cancelled';
  session.endTime = now;
  session.lastResumedAt = null;
  session.pausedAt = null;
  updateCompletionPercentage(session);
  await session.save();

  await recordSessionCancel(session, userId);

  if (session.studyPlan && session.studyPlanEntry) {
    await syncPlanEntryStatus(session.studyPlan, session.studyPlanEntry, userId, 'skipped');
  }

  return session;
};

export const abandonSession = async (sessionId, userId) => {
  const session = await getOwnedSessionOrThrow(sessionId, userId);

  if (!['active', 'paused'].includes(session.status)) {
    throw new ApiError(409, 'Only an active or paused session can be abandoned');
  }

  const now = new Date();
  accumulateActiveTime(session, now);

  session.status = 'abandoned';
  session.endTime = now;
  session.lastResumedAt = null;
  session.pausedAt = null;
  updateCompletionPercentage(session);
  await session.save();

  await recordSessionAbandon(session, userId);

  if (session.studyPlan && session.studyPlanEntry) {
    await syncPlanEntryStatus(session.studyPlan, session.studyPlanEntry, userId, 'missed');
  }

  return session;
};

export const completeCycle = async (sessionId, userId) => {
  const session = await getOwnedSessionOrThrow(sessionId, userId);

  if (session.status !== 'active') {
    throw new ApiError(409, 'Only an active session can complete a cycle');
  }

  if (session.cyclesCompleted >= session.cyclesPlanned) {
    throw new ApiError(409, 'All planned cycles have already been completed');
  }

  session.cyclesCompleted += 1;
  await session.save();
  return session;
};

export const deleteSession = async (sessionId, userId) => {
  const session = await getOwnedSessionOrThrow(sessionId, userId);

  if (session.status === 'active') {
    throw new ApiError(409, 'Cannot delete an active session');
  }

  await session.deleteOne();
  return session;
};
