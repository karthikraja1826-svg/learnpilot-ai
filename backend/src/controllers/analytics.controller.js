import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as analyticsService from '../services/analytics.service.js';

export const getOverview = catchAsync(async (req, res) => {
  const overview = await analyticsService.getOverview(req.userId);
  sendSuccess(res, 200, 'Analytics overview retrieved', { overview });
});

export const getDaily = catchAsync(async (req, res) => {
  const daily = await analyticsService.getDailyAnalytics(req.userId, req.query?.date);
  sendSuccess(res, 200, 'Daily analytics retrieved', { daily });
});

export const getWeekly = catchAsync(async (req, res) => {
  const weekly = await analyticsService.getWeeklyAnalytics(req.userId, req.query?.startDate);
  sendSuccess(res, 200, 'Weekly analytics retrieved', { weekly });
});

export const getSubjects = catchAsync(async (req, res) => {
  const subjects = await analyticsService.getSubjectsAnalytics(req.userId);
  sendSuccess(res, 200, 'Subject analytics retrieved', { subjects });
});

export const getTopics = catchAsync(async (req, res) => {
  const topics = await analyticsService.getTopicsAnalytics(req.userId);
  sendSuccess(res, 200, 'Topic analytics retrieved', { topics });
});

export const getProductivity = catchAsync(async (req, res) => {
  const productivity = await analyticsService.getProductivityAnalytics(req.userId);
  sendSuccess(res, 200, 'Productivity analytics retrieved', { productivity });
});
