import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as availabilityService from '../services/availability.service.js';

export const getAvailability = catchAsync(async (req, res) => {
  const availability = await availabilityService.getAvailability(req.userId);
  sendSuccess(res, 200, 'Study availability retrieved', { availability });
});

export const createAvailability = catchAsync(async (req, res) => {
  const availability = await availabilityService.createAvailability(req.userId, req.body || {});
  sendSuccess(res, 201, 'Study availability created', { availability });
});

export const updateAvailability = catchAsync(async (req, res) => {
  const availability = await availabilityService.updateAvailability(req.userId, req.body || {});
  sendSuccess(res, 200, 'Study availability updated', { availability });
});

export const deleteAvailability = catchAsync(async (req, res) => {
  await availabilityService.deleteAvailability(req.userId);
  sendSuccess(res, 200, 'Study availability deleted', {});
});
