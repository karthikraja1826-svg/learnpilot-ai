import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as progressService from '../services/progress.service.js';

export const getOverallProgress = catchAsync(async (req, res) => {
  const progress = await progressService.getOverallProgress(req.userId);
  sendSuccess(res, 200, 'Overall progress retrieved', { progress });
});

export const getSubjectProgress = catchAsync(async (req, res) => {
  const progress = await progressService.getSubjectProgress(req.userId, req.params.subjectId);
  sendSuccess(res, 200, 'Subject progress retrieved', { progress });
});

export const getTopicProgress = catchAsync(async (req, res) => {
  const progress = await progressService.getTopicProgress(req.userId, req.params.topicId);
  sendSuccess(res, 200, 'Topic progress retrieved', { progress });
});

export const getWeeklyProgress = catchAsync(async (req, res) => {
  const progress = await progressService.getWeeklyProgress(req.userId, req.query?.startDate);
  sendSuccess(res, 200, 'Weekly progress retrieved', { progress });
});

export const getExamProgress = catchAsync(async (req, res) => {
  const progress = await progressService.getExamProgress(req.userId, req.params.examId);
  sendSuccess(res, 200, 'Exam progress retrieved', { progress });
});
