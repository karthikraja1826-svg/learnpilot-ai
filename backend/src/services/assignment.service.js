import { Assignment, ASSIGNMENT_PRIORITY_VALUES, ASSIGNMENT_STATUS_VALUES } from '../models/Assignment.js';
import { Task } from '../models/Task.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidObjectId } from '../utils/validators.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { verifySubjectOwnership } from './subject.service.js';

const SORT_FIELDS = ['deadline', 'priority', 'title', 'status', 'createdAt', 'updatedAt'];
const CLIENT_SETTABLE_STATUS_VALUES = ['pending', 'in_progress', 'completed'];

const validateAssignmentInput = (body, { partial = false } = {}) => {
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

  if (!partial || body.deadline !== undefined) {
    const date = new Date(body.deadline);
    if (!body.deadline || Number.isNaN(date.getTime())) {
      errors.push('deadline must be a valid date');
    } else {
      data.deadline = date;
    }
  }

  if (!partial || body.estimatedHours !== undefined) {
    const value = Number(body.estimatedHours);
    if (Number.isNaN(value) || value <= 0) {
      errors.push('estimatedHours must be a positive number');
    } else {
      data.estimatedHours = value;
    }
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.length > 1000) {
      errors.push('description must be a string of at most 1000 characters');
    } else {
      data.description = body.description.trim();
    }
  }

  if (body.priority !== undefined) {
    if (!ASSIGNMENT_PRIORITY_VALUES.includes(body.priority)) {
      errors.push(`priority must be one of: ${ASSIGNMENT_PRIORITY_VALUES.join(', ')}`);
    } else {
      data.priority = body.priority;
    }
  }

  if (body.status !== undefined) {
    if (!CLIENT_SETTABLE_STATUS_VALUES.includes(body.status)) {
      errors.push(`status must be one of: ${CLIENT_SETTABLE_STATUS_VALUES.join(', ')} (overdue is determined automatically)`);
    } else {
      data.status = body.status;
    }
  }

  return { errors, data };
};

const getOwnedAssignmentOrThrow = async (assignmentId, userId) => {
  if (!isValidObjectId(assignmentId)) {
    throw new ApiError(400, 'Invalid assignment id');
  }
  const assignment = await Assignment.findOne({ _id: assignmentId, user: userId });
  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }
  return assignment;
};

export const verifyAssignmentOwnership = async (assignmentId, userId) => getOwnedAssignmentOrThrow(assignmentId, userId);

const syncOverdueStatus = async (assignment) => {
  const isPastDeadline = assignment.deadline.getTime() < Date.now();
  if (isPastDeadline && ['pending', 'in_progress'].includes(assignment.status)) {
    assignment.status = 'overdue';
    await assignment.save();
  } else if (!isPastDeadline && assignment.status === 'overdue') {
    assignment.status = 'pending';
    await assignment.save();
  }
  return assignment;
};

const syncOverdueStatusMany = async (userId) => {
  const now = new Date();
  await Assignment.updateMany(
    { user: userId, deadline: { $lt: now }, status: { $in: ['pending', 'in_progress'] } },
    { $set: { status: 'overdue' } }
  );
};

export const createAssignment = async (userId, body) => {
  const { errors, data } = validateAssignmentInput(body);
  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  let subjectId = null;
  if (body.subject !== undefined && body.subject !== null && body.subject !== '') {
    if (!isValidObjectId(body.subject)) {
      throw new ApiError(400, 'Invalid subject id');
    }
    const subject = await verifySubjectOwnership(body.subject, userId);
    subjectId = subject._id;
  }

  const assignment = await Assignment.create({ ...data, subject: subjectId, user: userId });
  return syncOverdueStatus(assignment);
};

export const listAssignments = async (userId, query) => {
  await syncOverdueStatusMany(userId);

  const { page, limit, skip } = parsePagination(query);
  const sortField = SORT_FIELDS.includes(query.sortBy) ? query.sortBy : 'deadline';
  const sortOrder = query.order === 'desc' ? -1 : 1;

  const filter = { user: userId };
  const now = new Date();

  if (query.subjectId !== undefined) {
    if (!isValidObjectId(query.subjectId)) {
      throw new ApiError(400, 'Invalid subjectId');
    }
    await verifySubjectOwnership(query.subjectId, userId);
    filter.subject = query.subjectId;
  }

  if (query.filter === 'pending') {
    filter.status = 'pending';
  } else if (query.filter === 'completed') {
    filter.status = 'completed';
  } else if (query.filter === 'overdue') {
    filter.status = 'overdue';
  } else if (query.filter === 'upcoming') {
    filter.deadline = { $gte: now };
    filter.status = { $in: ['pending', 'in_progress'] };
  }

  const [assignments, total] = await Promise.all([
    Assignment.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit),
    Assignment.countDocuments(filter),
  ]);

  return { assignments, pagination: buildPaginationMeta(page, limit, total) };
};

export const getAssignmentById = async (assignmentId, userId) => {
  const assignment = await getOwnedAssignmentOrThrow(assignmentId, userId);
  return syncOverdueStatus(assignment);
};

export const updateAssignment = async (assignmentId, userId, body) => {
  const assignment = await getOwnedAssignmentOrThrow(assignmentId, userId);
  const { errors, data } = validateAssignmentInput(body, { partial: true });
  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  if (body.subject !== undefined) {
    if (body.subject === null || body.subject === '') {
      data.subject = null;
    } else {
      if (!isValidObjectId(body.subject)) {
        throw new ApiError(400, 'Invalid subject id');
      }
      const subject = await verifySubjectOwnership(body.subject, userId);
      data.subject = subject._id;
    }
  }

  Object.assign(assignment, data);
  await assignment.save();
  return syncOverdueStatus(assignment);
};

export const deleteAssignment = async (assignmentId, userId) => {
  const assignment = await getOwnedAssignmentOrThrow(assignmentId, userId);

  const taskCount = await Task.countDocuments({ assignment: assignment._id, user: userId });
  if (taskCount > 0) {
    throw new ApiError(409, 'Cannot delete assignment with existing tasks referencing it');
  }

  await assignment.deleteOne();
  return assignment;
};
