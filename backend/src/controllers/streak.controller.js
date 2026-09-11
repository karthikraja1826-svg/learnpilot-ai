import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as streakService from '../services/streak.service.js';

export const getStreak = catchAsync(async (req, res) => {
  const streak = await streakService.getStreakInfo(req.userId);
  sendSuccess(res, 200, 'Streak information retrieved', { streak });
});
