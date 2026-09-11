import { Exam, EXAM_PRIORITY_VALUES } from '../models/Exam.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidObjectId } from '../utils/validators.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { verifySubjectOwnership } from './subject.service.js';

const SORT_FIELDS = ['examDate', 'priority', 'title', 'createdAt', 'updatedAt'];

const validateExamInput = (body, { partial = false } = {}) => {
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

  if (!partial || body.examDate !== undefined) {
    const date = new Date(body.examDate);
    if (!body.examDate || Number.isNaN(date.getTime())) {
      errors.push('examDate must be a valid date');
    } else {
      data.examDate = date;
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
    if (!EXAM_PRIORITY_VALUES.includes(body.priority)) {
      errors.push(`priority must be one of: ${EXAM_PRIORITY_VALUES.join(', ')}`);
    } else {
      data.priority = body.priority;
    }
  }

  return { errors, data };
};

const getOwnedExamOrThrow = async (examId, userId) => {
  if (!isValidObjectId(examId)) {
    throw new ApiError(400, 'Invalid exam id');
  }
  const exam = await Exam.findOne({ _id: examId, user: userId });
  if (!exam) {
    throw new ApiError(404, 'Exam not found');
  }
  return exam;
};

export const createExam = async (userId, body) => {
  const { errors, data } = validateExamInput(body);
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

  return Exam.create({ ...data, subject: subjectId, user: userId });
};

export const listExams = async (userId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const sortField = SORT_FIELDS.includes(query.sortBy) ? query.sortBy : 'examDate';
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

  if (query.filter === 'upcoming') {
    filter.examDate = { $gte: now };
  } else if (query.filter === 'past' || query.filter === 'completed') {
    filter.examDate = { $lt: now };
  }

  const [exams, total] = await Promise.all([
    Exam.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit),
    Exam.countDocuments(filter),
  ]);

  return { exams, pagination: buildPaginationMeta(page, limit, total) };
};

export const getExamById = async (examId, userId) => getOwnedExamOrThrow(examId, userId);

export const updateExam = async (examId, userId, body) => {
  const exam = await getOwnedExamOrThrow(examId, userId);
  const { errors, data } = validateExamInput(body, { partial: true });
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

  Object.assign(exam, data);
  await exam.save();
  return exam;
};

export const deleteExam = async (examId, userId) => {
  const exam = await getOwnedExamOrThrow(examId, userId);
  await exam.deleteOne();
  return exam;
};
