import { Topic, TOPIC_STATUS_VALUES } from '../models/Topic.js';
import { Task } from '../models/Task.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidObjectId } from '../utils/validators.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { verifySubjectOwnership } from './subject.service.js';

const PERCENT_RANGE_FIELDS = ['currentMastery', 'targetMastery'];
const SORT_FIELDS = ['name', 'difficulty', 'currentMastery', 'targetMastery', 'createdAt', 'updatedAt', 'lastStudiedAt'];

const validateTopicInput = (body, { partial = false } = {}) => {
  const errors = [];
  const data = {};

  if (!partial || body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      errors.push('name is required');
    } else if (body.name.trim().length > 150) {
      errors.push('name must be at most 150 characters');
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

  if (body.difficulty !== undefined) {
    const value = Number(body.difficulty);
    if (Number.isNaN(value) || value < 1 || value > 5) {
      errors.push('difficulty must be a number between 1 and 5');
    } else {
      data.difficulty = value;
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

  PERCENT_RANGE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      const value = Number(body[field]);
      if (Number.isNaN(value) || value < 0 || value > 100) {
        errors.push(`${field} must be a number between 0 and 100`);
      } else {
        data[field] = value;
      }
    }
  });

  if (body.status !== undefined) {
    if (!TOPIC_STATUS_VALUES.includes(body.status)) {
      errors.push(`status must be one of: ${TOPIC_STATUS_VALUES.join(', ')}`);
    } else {
      data.status = body.status;
    }
  }

  if (body.lastStudiedAt !== undefined) {
    if (body.lastStudiedAt === null) {
      data.lastStudiedAt = null;
    } else {
      const date = new Date(body.lastStudiedAt);
      if (Number.isNaN(date.getTime())) {
        errors.push('lastStudiedAt must be a valid date');
      } else {
        data.lastStudiedAt = date;
      }
    }
  }

  return { errors, data };
};

const getOwnedTopicOrThrow = async (topicId, userId) => {
  if (!isValidObjectId(topicId)) {
    throw new ApiError(400, 'Invalid topic id');
  }
  const topic = await Topic.findOne({ _id: topicId, user: userId });
  if (!topic) {
    throw new ApiError(404, 'Topic not found');
  }
  return topic;
};

export const verifyTopicOwnership = async (topicId, userId) => getOwnedTopicOrThrow(topicId, userId);

export const createTopic = async (userId, body) => {
  if (!body.subject || !isValidObjectId(body.subject)) {
    throw new ApiError(400, 'A valid subject id is required');
  }

  const { errors, data } = validateTopicInput(body);
  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  const subject = await verifySubjectOwnership(body.subject, userId);

  return Topic.create({ ...data, subject: subject._id, user: userId });
};

export const listTopics = async (userId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const sortField = SORT_FIELDS.includes(query.sortBy) ? query.sortBy : 'createdAt';
  const sortOrder = query.order === 'asc' ? 1 : -1;

  const filter = { user: userId };

  if (query.subjectId !== undefined) {
    if (!isValidObjectId(query.subjectId)) {
      throw new ApiError(400, 'Invalid subjectId');
    }
    await verifySubjectOwnership(query.subjectId, userId);
    filter.subject = query.subjectId;
  }

  if (query.status !== undefined) {
    if (!TOPIC_STATUS_VALUES.includes(query.status)) {
      throw new ApiError(400, `status must be one of: ${TOPIC_STATUS_VALUES.join(', ')}`);
    }
    filter.status = query.status;
  }

  const [topics, total] = await Promise.all([
    Topic.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit),
    Topic.countDocuments(filter),
  ]);

  return { topics, pagination: buildPaginationMeta(page, limit, total) };
};

export const getTopicById = async (topicId, userId) => getOwnedTopicOrThrow(topicId, userId);

export const updateTopic = async (topicId, userId, body) => {
  const topic = await getOwnedTopicOrThrow(topicId, userId);
  const { errors, data } = validateTopicInput(body, { partial: true });
  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  if (body.subject !== undefined) {
    if (!isValidObjectId(body.subject)) {
      throw new ApiError(400, 'Invalid subject id');
    }
    const subject = await verifySubjectOwnership(body.subject, userId);
    data.subject = subject._id;
  }

  Object.assign(topic, data);
  await topic.save();
  return topic;
};

export const deleteTopic = async (topicId, userId) => {
  const topic = await getOwnedTopicOrThrow(topicId, userId);

  const taskCount = await Task.countDocuments({ topic: topic._id, user: userId });
  if (taskCount > 0) {
    throw new ApiError(409, 'Cannot delete topic with existing tasks referencing it');
  }

  await topic.deleteOne();
  return topic;
};
