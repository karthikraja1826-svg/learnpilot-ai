import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as adaptiveScheduleService from '../services/adaptiveSchedule.service.js';

export const getRecommendations = catchAsync(async (req, res) => {
  const analysis = await adaptiveScheduleService.analyzeAdaptiveNeeds(req.userId);
  sendSuccess(res, 200, 'Adaptive recommendations retrieved', { analysis });
});

export const applyAdjustments = catchAsync(async (req, res) => {
  const plan = await adaptiveScheduleService.applyAdaptiveAdjustments(req.userId, req.params.planId);
  sendSuccess(res, 200, 'Adaptive adjustments applied', { plan });
});
