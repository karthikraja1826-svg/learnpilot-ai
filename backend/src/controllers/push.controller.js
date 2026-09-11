import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as pushService from '../services/push.service.js';
import * as notificationService from '../services/notification.service.js';

export const getVapidPublicKey = catchAsync(async (req, res) => {
  const publicKey = pushService.getVapidPublicKey();
  sendSuccess(res, 200, 'VAPID public key retrieved', { publicKey });
});

export const subscribe = catchAsync(async (req, res) => {
  const subscription = await pushService.subscribe(req.userId, req.body || {});
  sendSuccess(res, 201, 'Push subscription registered', { subscription });
});

export const unsubscribe = catchAsync(async (req, res) => {
  const endpoint = req.body?.endpoint || req.query?.endpoint;
  await pushService.unsubscribe(req.userId, endpoint);
  sendSuccess(res, 200, 'Push subscription removed', {});
});

export const getStatus = catchAsync(async (req, res) => {
  const status = await pushService.getStatus(req.userId);
  sendSuccess(res, 200, 'Push subscription status retrieved', status);
});

export const sendTestNotification = catchAsync(async (req, res) => {
  const { notification, delivery } = await notificationService.sendTestNotification(req.userId);
  sendSuccess(res, 200, 'Test notification dispatched', { notification, delivery });
});
