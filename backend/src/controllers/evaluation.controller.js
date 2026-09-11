import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as evaluationService from '../services/evaluation.service.js';

export const getTodayEvaluation = catchAsync(async (req, res) => {
  const { test, evaluation } = await evaluationService.getTodayEvaluation(req.userId);
  sendSuccess(res, 200, "Today's evaluation retrieved", { test, evaluation });
});

export const generateTodayEvaluation = catchAsync(async (req, res) => {
  const regenerate = req.body?.regenerate === true;
  const { test, evaluation } = await evaluationService.generateTodayEvaluation(req.userId, { regenerate });
  sendSuccess(res, 201, "Today's evaluation is ready", { test, evaluation });
});
