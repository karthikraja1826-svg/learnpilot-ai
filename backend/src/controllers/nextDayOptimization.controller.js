import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as nextDayOptimizationService from '../services/nextDayOptimization.service.js';

export const getOptimizationStatus = catchAsync(async (req, res) => {
  const status = await nextDayOptimizationService.getOptimizationStatus(req.userId);
  sendSuccess(res, 200, 'Next-day optimization status retrieved', status);
});

export const getNextDayPlan = catchAsync(async (req, res) => {
  const { plan, subject } = await nextDayOptimizationService.getNextDayPlan(req.userId);
  if (!subject) {
    return sendSuccess(res, 200, 'No active optimization subject selected', { plan: null, subject: null });
  }
  if (!plan) {
    return sendSuccess(res, 200, 'No optimized next-day roadmap found yet', { plan: null, subject });
  }
  sendSuccess(res, 200, 'Optimized next-day roadmap retrieved', { plan, subject });
});

export const optimizeNextDay = catchAsync(async (req, res) => {
  const regenerate = req.body?.regenerate === true;
  const { plan, subject, created, changes } = await nextDayOptimizationService.optimizeNextDay(req.userId, { regenerate });
  sendSuccess(res, created ? 201 : 200, created ? 'Next-day roadmap optimized' : 'Existing optimized next-day roadmap retrieved', {
    plan,
    subject,
    changes,
  });
});
