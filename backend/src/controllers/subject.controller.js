import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import * as subjectService from '../services/subject.service.js';

export const createSubject = catchAsync(async (req, res) => {
  const subject = await subjectService.createSubject(req.userId, req.body || {});
  sendSuccess(res, 201, 'Subject created', { subject });
});

export const listSubjects = catchAsync(async (req, res) => {
  const { subjects, pagination } = await subjectService.listSubjects(req.userId, req.query || {});
  sendSuccess(res, 200, 'Subjects retrieved', { subjects, pagination });
});

export const getSubject = catchAsync(async (req, res) => {
  const subject = await subjectService.getSubjectById(req.params.id, req.userId);
  sendSuccess(res, 200, 'Subject retrieved', { subject });
});

export const updateSubject = catchAsync(async (req, res) => {
  const subject = await subjectService.updateSubject(req.params.id, req.userId, req.body || {});
  sendSuccess(res, 200, 'Subject updated', { subject });
});

export const deleteSubject = catchAsync(async (req, res) => {
  await subjectService.deleteSubject(req.params.id, req.userId);
  sendSuccess(res, 200, 'Subject deleted', {});
});

export const getActiveSubject = catchAsync(async (req, res) => {
  const { subject } = await subjectService.getActiveOptimizationSubject(req.userId);
  sendSuccess(res, 200, 'Active optimization subject retrieved', { subject });
});

export const setActiveSubject = catchAsync(async (req, res) => {
  const { subjectId } = req.body || {};

  if (subjectId !== null && subjectId !== undefined && typeof subjectId !== 'string') {
    throw new ApiError(400, 'subjectId must be a string or null');
  }

  const subject = await subjectService.setActiveOptimizationSubject(req.userId, subjectId ?? null);
  sendSuccess(res, 200, 'Active optimization subject updated', { subject });
});
