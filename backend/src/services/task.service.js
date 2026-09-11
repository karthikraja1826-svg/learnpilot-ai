import { Task, TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from '../models/Task.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidObjectId } from '../utils/validators.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { verifySubjectOwnership } from './subject.service.js';
import { verifyTopicOwnership } from './topic.service.js';
import { verifyAssignmentOwnership } from './assignment.service.js';

const SORT_FIELDS = ['dueDate', 'priority', 'status', 'title', 'createdAt', 'updatedAt'];

const loadRelation = async (value, verifyFn, userId, label) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === '') {
    return null;
  }
  if (!isValidObjectId(value)) {
    throw new ApiError(400, `Invalid ${label} id`);
  }
  return verifyFn(value, userId);
};

const resolveTaskRelations = async (userId, body, base = {}) => {
  const subjectProvided = body.subject !== undefined;
  const topicProvided = body.topic !== undefined;
  const assignmentProvided = body.assignment !== undefined;

  if (!subjectProvided && !topicProvided && !assignmentProvided) {
    return { subjectId: undefined, topicId: undefined, assignmentId: undefined };
  }

  const [subjectDoc, topicDoc, assignmentDoc] = await Promise.all([
    subjectProvided
      ? loadRelation(body.subject, verifySubjectOwnership, userId, 'subject')
      : base.subject
        ? verifySubjectOwnership(base.subject, userId)
        : null,
    topicProvided
      ? loadRelation(body.topic, verifyTopicOwnership, userId, 'topic')
      : base.topic
        ? verifyTopicOwnership(base.topic, userId)
        : null,
    assignmentProvided
      ? loadRelation(body.assignment, verifyAssignmentOwnership, userId, 'assignment')
      : base.assignment
        ? verifyAssignmentOwnership(base.assignment, userId)
        : null,
  ]);

  if (subjectDoc && topicDoc && String(topicDoc.subject) !== String(subjectDoc._id)) {
    throw new ApiError(400, 'topic does not belong to the specified subject');
  }

  if (
    subjectDoc &&
    assignmentDoc &&
    assignmentDoc.subject &&
    String(assignmentDoc.subject) !== String(subjectDoc._id)
  ) {
    throw new ApiError(400, 'assignment does not belong to the specified subject');
  }

  if (
    topicDoc &&
    assignmentDoc &&
    assignmentDoc.subject &&
    String(topicDoc.subject) !== String(assignmentDoc.subject)
  ) {
    throw new ApiError(400, 'topic and assignment belong to different subjects');
  }

  let subjectId;
  if (topicDoc && topicDoc.subject) {
    subjectId = topicDoc.subject;
  } else if (subjectProvided) {
    subjectId = subjectDoc ? subjectDoc._id : null;
  } else if (assignmentProvided && assignmentDoc && assignmentDoc.subject) {
    subjectId = assignmentDoc.subject;
  } else {
    subjectId = undefined;
  }

  return {
    subjectId,
    topicId: topicProvided ? (topicDoc ? topicDoc._id : null) : undefined,
    assignmentId: assignmentProvided ? (assignmentDoc ? assignmentDoc._id : null) : undefined,
  };
};

const validateTaskInput = (body, { partial = false } = {}) => {
  const errors = [];
  const data = {};

  if (!partial || body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      errors.push('title is required');
    } else if (body.title.trim().length > 150) {
      errors.push('title must be at most 150 characters');
    } else {
      data.title = body.title.trim();
    }
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.length > 1000) {
      errors.push('description must be a string of at most 1000 characters');
    } else {
      data.description = body.description.trim();
    }
  }

  if (body.dueDate !== undefined) {
    if (body.dueDate === null || body.dueDate === '') {
      data.dueDate = null;
    } else {
      const date = new Date(body.dueDate);
      if (Number.isNaN(date.getTime())) {
        errors.push('dueDate must be a valid date');
      } else {
        data.dueDate = date;
      }
    }
  }

  if (body.estimatedMinutes !== undefined) {
    if (body.estimatedMinutes === null || body.estimatedMinutes === '') {
      data.estimatedMinutes = null;
    } else {
      const value = Number(body.estimatedMinutes);
      if (Number.isNaN(value) || value <= 0) {
        errors.push('estimatedMinutes must be a positive number');
      } else {
        data.estimatedMinutes = value;
      }
    }
  }

  if (body.priority !== undefined) {
    if (!TASK_PRIORITY_VALUES.includes(body.priority)) {
      errors.push(`priority must be one of: ${TASK_PRIORITY_VALUES.join(', ')}`);
    } else {
      data.priority = body.priority;
    }
  }

  if (body.status !== undefined) {
    if (!TASK_STATUS_VALUES.includes(body.status)) {
      errors.push(`status must be one of: ${TASK_STATUS_VALUES.join(', ')}`);
    } else {
      data.status = body.status;
    }
  }

  return { errors, data };
};

const applyCompletionState = (task, previousStatus) => {
  if (task.status === 'completed' && previousStatus !== 'completed') {
    task.completedAt = new Date();
  } else if (task.status !== 'completed' && previousStatus === 'completed') {
    task.completedAt = null;
  }
};

const getOwnedTaskOrThrow = async (taskId, userId) => {
  if (!isValidObjectId(taskId)) {
    throw new ApiError(400, 'Invalid task id');
  }
  const task = await Task.findOne({ _id: taskId, user: userId });
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }
  return task;
};

export const createTask = async (userId, body) => {
  const { errors, data } = validateTaskInput(body);
  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  const { subjectId, topicId, assignmentId } = await resolveTaskRelations(userId, body);

  const task = new Task({
    ...data,
    user: userId,
    subject: subjectId ?? null,
    topic: topicId ?? null,
    assignment: assignmentId ?? null,
  });

  applyCompletionState(task, null);
  await task.save();
  return task;
};

export const listTasks = async (userId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const sortField = SORT_FIELDS.includes(query.sortBy) ? query.sortBy : 'dueDate';
  const sortOrder = query.order === 'desc' ? -1 : 1;

  const filter = { user: userId };
  const now = new Date();

  if (query.status !== undefined) {
    if (!TASK_STATUS_VALUES.includes(query.status)) {
      throw new ApiError(400, `status must be one of: ${TASK_STATUS_VALUES.join(', ')}`);
    }
    filter.status = query.status;
  }

  if (query.priority !== undefined) {
    if (!TASK_PRIORITY_VALUES.includes(query.priority)) {
      throw new ApiError(400, `priority must be one of: ${TASK_PRIORITY_VALUES.join(', ')}`);
    }
    filter.priority = query.priority;
  }

  if (query.subjectId !== undefined) {
    if (!isValidObjectId(query.subjectId)) {
      throw new ApiError(400, 'Invalid subjectId');
    }
    await verifySubjectOwnership(query.subjectId, userId);
    filter.subject = query.subjectId;
  }

  if (query.topicId !== undefined) {
    if (!isValidObjectId(query.topicId)) {
      throw new ApiError(400, 'Invalid topicId');
    }
    await verifyTopicOwnership(query.topicId, userId);
    filter.topic = query.topicId;
  }

  if (query.dueDate !== undefined) {
    const date = new Date(query.dueDate);
    if (Number.isNaN(date.getTime())) {
      throw new ApiError(400, 'Invalid dueDate');
    }
    const start = new Date(date.setHours(0, 0, 0, 0));
    const end = new Date(new Date(start).setHours(23, 59, 59, 999));
    filter.dueDate = { $gte: start, $lte: end };
  }

  if (query.filter === 'today') {
    const start = new Date(now.setHours(0, 0, 0, 0));
    const end = new Date(new Date(start).setHours(23, 59, 59, 999));
    filter.dueDate = { $gte: start, $lte: end };
  } else if (query.filter === 'upcoming') {
    filter.dueDate = { $gt: new Date() };
    filter.status = { $nin: ['completed', 'cancelled'] };
  } else if (query.filter === 'overdue') {
    filter.dueDate = { $lt: new Date() };
    filter.status = { $nin: ['completed', 'cancelled'] };
  }

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit),
    Task.countDocuments(filter),
  ]);

  return { tasks, pagination: buildPaginationMeta(page, limit, total) };
};

export const getTaskById = async (taskId, userId) => getOwnedTaskOrThrow(taskId, userId);

export const verifyTaskOwnership = async (taskId, userId) => getOwnedTaskOrThrow(taskId, userId);

export const updateTask = async (taskId, userId, body) => {
  const task = await getOwnedTaskOrThrow(taskId, userId);
  const previousStatus = task.status;
  const { errors, data } = validateTaskInput(body, { partial: true });
  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  const { subjectId, topicId, assignmentId } = await resolveTaskRelations(userId, body, {
    subject: task.subject,
    topic: task.topic,
    assignment: task.assignment,
  });

  if (subjectId !== undefined) data.subject = subjectId;
  if (topicId !== undefined) data.topic = topicId;
  if (assignmentId !== undefined) data.assignment = assignmentId;

  Object.assign(task, data);
  applyCompletionState(task, previousStatus);
  await task.save();
  return task;
};

export const updateTaskStatus = async (taskId, userId, status) => {
  if (!TASK_STATUS_VALUES.includes(status)) {
    throw new ApiError(400, `status must be one of: ${TASK_STATUS_VALUES.join(', ')}`);
  }

  const task = await getOwnedTaskOrThrow(taskId, userId);
  const previousStatus = task.status;
  task.status = status;
  applyCompletionState(task, previousStatus);
  await task.save();
  return task;
};

export const deleteTask = async (taskId, userId) => {
  const task = await getOwnedTaskOrThrow(taskId, userId);
  await task.deleteOne();
  return task;
};
