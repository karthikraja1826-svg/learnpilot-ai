import { Subject } from '../models/Subject.js';
import { Topic } from '../models/Topic.js';
import { Exam } from '../models/Exam.js';
import { Assignment } from '../models/Assignment.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidObjectId, escapeRegex } from '../utils/validators.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';

const NUMERIC_RANGE_FIELDS = {
  difficulty: [1, 5],
  importance: [1, 5],
  targetPerformance: [0, 100],
  currentPerformance: [0, 100],
};

const SORT_FIELDS = ['name', 'difficulty', 'importance', 'currentPerformance', 'createdAt', 'updatedAt'];

const validateSubjectInput = (body, { partial = false } = {}) => {
  const errors = [];
  const data = {};

  if (!partial || body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      errors.push('name is required');
    } else if (body.name.trim().length > 100) {
      errors.push('name must be at most 100 characters');
    } else {
      data.name = body.name.trim();
    }
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.length > 1000) {
      errors.push('description must be a string of at most 1000 characters');
    } else {
      data.description = body.description.trim();
    }
  }

  Object.entries(NUMERIC_RANGE_FIELDS).forEach(([field, [min, max]]) => {
    if (body[field] !== undefined) {
      const value = Number(body[field]);
      if (Number.isNaN(value) || value < min || value > max) {
        errors.push(`${field} must be a number between ${min} and ${max}`);
      } else {
        data[field] = value;
      }
    }
  });

  if (body.color !== undefined && body.color !== null && body.color !== '') {
    if (typeof body.color !== 'string' || body.color.length > 20) {
      errors.push('color must be a valid string of at most 20 characters');
    } else {
      data.color = body.color.trim();
    }
  }

  return { errors, data };
};

const findDuplicateName = async (userId, name, excludeId) => {
  const filter = {
    user: userId,
    name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
  };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }
  return Subject.findOne(filter);
};

const getOwnedSubjectOrThrow = async (subjectId, userId) => {
  if (!isValidObjectId(subjectId)) {
    throw new ApiError(400, 'Invalid subject id');
  }
  const subject = await Subject.findOne({ _id: subjectId, user: userId });
  if (!subject) {
    throw new ApiError(404, 'Subject not found');
  }
  return subject;
};

export const verifySubjectOwnership = async (subjectId, userId) => getOwnedSubjectOrThrow(subjectId, userId);

export const createSubject = async (userId, body) => {
  const { errors, data } = validateSubjectInput(body);
  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  const duplicate = await findDuplicateName(userId, data.name);
  if (duplicate) {
    throw new ApiError(409, 'A subject with this name already exists');
  }

  return Subject.create({ ...data, user: userId });
};

export const listSubjects = async (userId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const sortField = SORT_FIELDS.includes(query.sortBy) ? query.sortBy : 'createdAt';
  const sortOrder = query.order === 'asc' ? 1 : -1;

  const filter = { user: userId };

  const [subjects, total] = await Promise.all([
    Subject.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit),
    Subject.countDocuments(filter),
  ]);

  return { subjects, pagination: buildPaginationMeta(page, limit, total) };
};

export const getSubjectById = async (subjectId, userId) => getOwnedSubjectOrThrow(subjectId, userId);

export const updateSubject = async (subjectId, userId, body) => {
  const subject = await getOwnedSubjectOrThrow(subjectId, userId);
  const { errors, data } = validateSubjectInput(body, { partial: true });
  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  if (data.name && data.name.toLowerCase() !== subject.name.toLowerCase()) {
    const duplicate = await findDuplicateName(userId, data.name, subject._id);
    if (duplicate) {
      throw new ApiError(409, 'A subject with this name already exists');
    }
  }

  Object.assign(subject, data);
  await subject.save();
  return subject;
};

export const deleteSubject = async (subjectId, userId) => {
  const subject = await getOwnedSubjectOrThrow(subjectId, userId);

  const [topicCount, examCount, assignmentCount, taskCount] = await Promise.all([
    Topic.countDocuments({ subject: subject._id, user: userId }),
    Exam.countDocuments({ subject: subject._id, user: userId }),
    Assignment.countDocuments({ subject: subject._id, user: userId }),
    Task.countDocuments({ subject: subject._id, user: userId }),
  ]);

  if (topicCount > 0 || examCount > 0 || assignmentCount > 0 || taskCount > 0) {
    throw new ApiError(409, 'Cannot delete subject with existing topics, exams, assignments, or tasks referencing it');
  }

  await subject.deleteOne();
  return subject;
};

// ---------------------------------------------------------------------------
// Subject optimization selection
//
// The user's chosen "optimization subject" is persisted on the User record
// (activeOptimizationSubject) so it survives refresh/navigation/re-login
// instead of living only in frontend state. Future AI roadmap/evaluation
// features (daily roadmap generation, testing, evaluation) will read this
// same field to know which subject to act on.
// ---------------------------------------------------------------------------

export const getActiveOptimizationSubject = async (userId) => {
  const user = await User.findById(userId).select('activeOptimizationSubject');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (!user.activeOptimizationSubject) {
    return { subject: null };
  }

  const subject = await Subject.findOne({ _id: user.activeOptimizationSubject, user: userId });

  if (!subject) {
    // The previously selected subject no longer exists (e.g. it was
    // deleted). Clear the stale reference so the user isn't stuck pointing
    // at nothing, and report back that there is no active subject.
    user.activeOptimizationSubject = null;
    await user.save();
    return { subject: null };
  }

  return { subject };
};

export const setActiveOptimizationSubject = async (userId, subjectId) => {
  if (subjectId === null || subjectId === undefined) {
    await User.findByIdAndUpdate(userId, { activeOptimizationSubject: null });
    return null;
  }

  // Confirms the subject exists and belongs to this user before persisting
  // it as the active optimization subject.
  const subject = await getOwnedSubjectOrThrow(subjectId, userId);

  await User.findByIdAndUpdate(userId, { activeOptimizationSubject: subject._id });

  return subject;
};
