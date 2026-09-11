import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as studyPerformanceService from '../services/studyPerformance.service.js';

export const getDaily = catchAsync(async (req, res) => {
  const performance = await studyPerformanceService.getDailyPerformance(req.userId, req.query?.date);
  sendSuccess(res, 200, 'Daily performance retrieved', { performance });
});

export const getWeekly = catchAsync(async (req, res) => {
  const performance = await studyPerformanceService.getWeeklyPerformance(req.userId, req.query?.startDate);
  sendSuccess(res, 200, 'Weekly performance retrieved', { performance });
});

export const getTopicPerformance = catchAsync(async (req, res) => {
  const performance = await studyPerformanceService.getTopicPerformance(req.userId, req.params.topicId);
  sendSuccess(res, 200, 'Topic performance retrieved', { performance });
});

export const getSubjectPerformance = catchAsync(async (req, res) => {
  const performance = await studyPerformanceService.getSubjectPerformance(req.userId, req.params.subjectId);
  sendSuccess(res, 200, 'Subject performance retrieved', { performance });
});
