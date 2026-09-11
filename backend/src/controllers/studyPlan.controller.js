import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as studyPlanService from '../services/studyPlan.service.js';

export const generateDailyPlan = catchAsync(async (req, res) => {
  const plan = await studyPlanService.generateDailyPlan(req.userId, req.body || {});
  sendSuccess(res, 201, 'Daily study plan generated', { plan });
});

export const generateWeeklyPlan = catchAsync(async (req, res) => {
  const plan = await studyPlanService.generateWeeklyPlan(req.userId, req.body || {});
  sendSuccess(res, 201, 'Weekly study plan generated', { plan });
});

export const generateRoadmap = catchAsync(async (req, res) => {
  const plan = await studyPlanService.generateSubjectRoadmap(req.userId, req.body || {});
  sendSuccess(res, 201, "Today's study roadmap generated", { plan });
});

export const getRoadmapToday = catchAsync(async (req, res) => {
  const { plan, subject } = await studyPlanService.getTodayRoadmap(req.userId);
  if (!subject) {
    return sendSuccess(res, 200, 'No active optimization subject selected', { plan: null, subject: null });
  }
  if (!plan) {
    return sendSuccess(res, 200, 'No roadmap found for today', { plan: null, subject });
  }
  sendSuccess(res, 200, "Today's study roadmap retrieved", { plan, subject });
});

export const listPlans = catchAsync(async (req, res) => {
  const { plans, pagination } = await studyPlanService.listPlans(req.userId, req.query || {});
  sendSuccess(res, 200, 'Study plans retrieved', { plans, pagination });
});

export const getPlan = catchAsync(async (req, res) => {
  const plan = await studyPlanService.getPlanById(req.params.id, req.userId);
  sendSuccess(res, 200, 'Study plan retrieved', { plan });
});

export const getTodayPlan = catchAsync(async (req, res) => {
  const plan = await studyPlanService.getTodayPlan(req.userId);
  if (!plan) {
    return sendSuccess(res, 200, 'No study plan found for today', { plan: null });
  }
  sendSuccess(res, 200, "Today's study plan retrieved", { plan });
});

export const getCurrentWeekPlan = catchAsync(async (req, res) => {
  const plan = await studyPlanService.getCurrentWeekPlan(req.userId);
  if (!plan) {
    return sendSuccess(res, 200, 'No study plan found for the current week', { plan: null });
  }
  sendSuccess(res, 200, "Current week's study plan retrieved", { plan });
});

export const regeneratePlan = catchAsync(async (req, res) => {
  const plan = await studyPlanService.regeneratePlan(req.params.id, req.userId);
  sendSuccess(res, 201, 'Study plan regenerated', { plan });
});

export const updatePlan = catchAsync(async (req, res) => {
  const plan = await studyPlanService.updatePlan(req.params.id, req.userId, req.body || {});
  sendSuccess(res, 200, 'Study plan updated', { plan });
});
