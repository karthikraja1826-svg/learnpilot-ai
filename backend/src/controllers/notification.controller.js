import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as notificationService from '../services/notification.service.js';

export const listNotifications = catchAsync(async (req, res) => {
  const { notifications, pagination } = await notificationService.listNotifications(req.userId, req.query || {});
  sendSuccess(res, 200, 'Notifications retrieved', { notifications, pagination });
});

export const getUnreadCount = catchAsync(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.userId);
  sendSuccess(res, 200, 'Unread notification count retrieved', result);
});

export const markRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markRead(req.params.id, req.userId);
  sendSuccess(res, 200, 'Notification marked as read', { notification });
});

export const markAllRead = catchAsync(async (req, res) => {
  const result = await notificationService.markAllRead(req.userId);
  sendSuccess(res, 200, 'All notifications marked as read', result);
});

export const deleteNotification = catchAsync(async (req, res) => {
  await notificationService.deleteNotification(req.params.id, req.userId);
  sendSuccess(res, 200, 'Notification deleted', {});
});
