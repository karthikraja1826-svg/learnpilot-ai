import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as eodTestService from '../services/eodTest.service.js';

export const getPreview = catchAsync(async (req, res) => {
  const preview = await eodTestService.getTodayTestPreview(req.userId);
  sendSuccess(res, 200, "Today's test preview retrieved", { preview });
});

export const getToday = catchAsync(async (req, res) => {
  const test = await eodTestService.getTodayTest(req.userId);
  sendSuccess(res, 200, "Today's test retrieved", {
    test: test ? eodTestService.sanitizeTest(test) : null,
  });
});

export const generateToday = catchAsync(async (req, res) => {
  const test = await eodTestService.generateTodayTest(req.userId);
  sendSuccess(res, 201, "Today's test is ready", { test });
});

export const startToday = catchAsync(async (req, res) => {
  const test = await eodTestService.startTodayTest(req.userId);
  sendSuccess(res, 200, "Today's test started", { test });
});

export const submitToday = catchAsync(async (req, res) => {
  const test = await eodTestService.submitTodayTest(req.userId, req.body || {});
  sendSuccess(res, 200, "Today's test submitted", { test });
});

export const getResult = catchAsync(async (req, res) => {
  const { test, result } = await eodTestService.getTodayResult(req.userId);
  sendSuccess(res, 200, "Today's test result retrieved", { test, result });
});
