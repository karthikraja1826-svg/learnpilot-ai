import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { isValidObjectId } from '../utils/validators.js';
import * as pushService from './push.service.js';

const TYPE_PREFERENCE_MAP = {
  study_session_start: 'studyReminders',
  study_session_reminder: 'studyReminders',
  study_session_missed: 'studyReminders',
  assignment_deadline: 'assignmentReminders',
  exam_reminder: 'examReminders',
  streak: 'streakNotifications',
};

const sanitizeUrl = (url) => {
  if (typeof url !== 'string' || url.length === 0) {
    return '/';
  }

  if (url.startsWith('/')) {
    return url.slice(0, 500);
  }

  return '/';
};

const isPreferenceEnabled = (user, type) => {
  const prefs = user?.notificationPreferences || {};

  if (prefs.pushEnabled === false) {
    return false;
  }

  const key = TYPE_PREFERENCE_MAP[type];

  if (!key) {
    return true;
  }

  return prefs[key] !== false;
};

export const dispatchNotification = async ({ userId, type, title, body, url, data, dedupeKey, expiresAt }) => {
  if (!dedupeKey) {
    throw new ApiError(500, 'A dedupeKey is required for notification dispatch');
  }

  let notification;

  try {
    notification = await Notification.create({
      user: userId,
      type,
      title,
      body,
      url: sanitizeUrl(url),
      data: data || {},
      dedupeKey,
      expiresAt: expiresAt || null,
      status: 'pending',
    });
  } catch (err) {
    if (err.code === 11000) {
      return null;
    }
    throw err;
  }

  const user = await User.findById(userId).select('notificationPreferences');

  if (!user || !isPreferenceEnabled(user, type)) {
    notification.status = 'failed';
    notification.deliveryInfo = { reason: 'notifications_disabled' };
    await notification.save();
    return notification;
  }

  const payload = {
    title,
    body,
    tag: type,
    url: notification.url,
    type,
    notificationId: String(notification._id),
    timestamp: Date.now(),
    data: data || {},
  };

  try {
    const deliveryResult = await pushService.sendToUser(userId, payload);
    notification.status = deliveryResult.sent > 0 ? 'sent' : 'failed';
    notification.sentAt = deliveryResult.sent > 0 ? new Date() : null;
    notification.deliveryInfo = deliveryResult;
  } catch (err) {
    notification.status = 'failed';
    notification.deliveryInfo = { error: err.message };
  }

  await notification.save();
  return notification;
};

export const sendTestNotification = async (userId) => {
  const dedupeKey = `${userId}:system_test:${Date.now()}`;

  const payload = {
    title: 'Test notification',
    body: 'Push notifications are working for your account.',
    tag: 'system',
    url: '/',
    type: 'system',
    notificationId: dedupeKey,
    timestamp: Date.now(),
    data: {},
  };

  const deliveryResult = await pushService.sendToUser(userId, payload);

  const notification = await Notification.create({
    user: userId,
    type: 'system',
    title: payload.title,
    body: payload.body,
    url: payload.url,
    data: {},
    dedupeKey,
    status: deliveryResult.sent > 0 ? 'sent' : 'failed',
    sentAt: deliveryResult.sent > 0 ? new Date() : null,
    deliveryInfo: deliveryResult,
  });

  return { notification, delivery: deliveryResult };
};

export const listNotifications = async (userId, query) => {
  const { page, limit, skip } = parsePagination(query || {});
  const filter = { user: userId };

  if (query?.status) {
    filter.status = query.status;
  }

  if (query?.type) {
    filter.type = query.type;
  }

  if (query?.unreadOnly === 'true') {
    filter.readAt = null;
  }

  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  return { notifications, pagination: buildPaginationMeta(page, limit, total) };
};

export const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({ user: userId, readAt: null });
  return { count };
};

const findOwnedNotification = async (notificationId, userId) => {
  if (!isValidObjectId(notificationId)) {
    throw new ApiError(400, 'Invalid notification id');
  }

  const notification = await Notification.findOne({ _id: notificationId, user: userId });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  return notification;
};

export const markRead = async (notificationId, userId) => {
  const notification = await findOwnedNotification(notificationId, userId);

  if (!notification.readAt) {
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
};

export const markAllRead = async (userId) => {
  const result = await Notification.updateMany(
    { user: userId, readAt: null },
    { $set: { readAt: new Date() } }
  );

  return { modifiedCount: result.modifiedCount || 0 };
};

export const deleteNotification = async (notificationId, userId) => {
  const notification = await findOwnedNotification(notificationId, userId);
  await notification.deleteOne();
};
