import webpush from 'web-push';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { PushSubscription } from '../models/PushSubscription.js';

let configured = false;

const ensureConfigured = () => {
  if (configured) {
    return;
  }

  if (!env.vapidPublicKey || !env.vapidPrivateKey || !env.vapidSubject) {
    throw new ApiError(503, 'Push notifications are not configured on the server');
  }

  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
  configured = true;
};

export const isPushConfigured = () =>
  Boolean(env.vapidPublicKey && env.vapidPrivateKey && env.vapidSubject);

export const getVapidPublicKey = () => {
  ensureConfigured();
  return env.vapidPublicKey;
};

const toWebPushSubscription = (subscriptionDoc) => ({
  endpoint: subscriptionDoc.endpoint,
  expirationTime: subscriptionDoc.expirationTime ? subscriptionDoc.expirationTime.getTime() : null,
  keys: {
    p256dh: subscriptionDoc.keys.p256dh,
    auth: subscriptionDoc.keys.auth,
  },
});

const deactivateSubscription = async (subscriptionId) => {
  await PushSubscription.findByIdAndUpdate(subscriptionId, { isActive: false }).catch(() => {});
};

export const sendToSubscription = async (subscriptionDoc, payload) => {
  ensureConfigured();

  try {
    await webpush.sendNotification(toWebPushSubscription(subscriptionDoc), JSON.stringify(payload));
    await PushSubscription.findByIdAndUpdate(subscriptionDoc._id, { lastUsedAt: new Date() }).catch(() => {});
    return { subscriptionId: String(subscriptionDoc._id), success: true };
  } catch (err) {
    const statusCode = err?.statusCode;

    if (statusCode === 404 || statusCode === 410) {
      await deactivateSubscription(subscriptionDoc._id);
    }

    return {
      subscriptionId: String(subscriptionDoc._id),
      success: false,
      statusCode: statusCode || null,
      deactivated: statusCode === 404 || statusCode === 410,
    };
  }
};

export const subscribe = async (userId, subscriptionInput) => {
  const { endpoint, expirationTime, keys, userAgent, deviceLabel } = subscriptionInput || {};

  if (!endpoint || typeof endpoint !== 'string') {
    throw new ApiError(400, 'A valid subscription endpoint is required');
  }

  if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string' || !keys.p256dh || !keys.auth) {
    throw new ApiError(400, 'Subscription keys.p256dh and keys.auth are required');
  }

  const existing = await PushSubscription.findOne({ endpoint });

  if (existing) {
    if (String(existing.user) !== String(userId)) {
      throw new ApiError(403, 'This push subscription belongs to another user');
    }

    existing.keys = { p256dh: keys.p256dh, auth: keys.auth };
    existing.expirationTime = expirationTime ? new Date(expirationTime) : null;
    existing.userAgent = typeof userAgent === 'string' ? userAgent.slice(0, 500) : existing.userAgent;
    existing.deviceLabel = typeof deviceLabel === 'string' ? deviceLabel.slice(0, 150) : existing.deviceLabel;
    existing.isActive = true;
    existing.lastUsedAt = new Date();
    await existing.save();
    return existing;
  }

  try {
    return await PushSubscription.create({
      user: userId,
      endpoint,
      expirationTime: expirationTime ? new Date(expirationTime) : null,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 500) : '',
      deviceLabel: typeof deviceLabel === 'string' ? deviceLabel.slice(0, 150) : '',
      isActive: true,
      lastUsedAt: new Date(),
    });
  } catch (err) {
    if (err.code === 11000) {
      const raceExisting = await PushSubscription.findOne({ endpoint });

      if (!raceExisting) {
        throw err;
      }

      if (String(raceExisting.user) !== String(userId)) {
        throw new ApiError(403, 'This push subscription belongs to another user');
      }

      raceExisting.keys = { p256dh: keys.p256dh, auth: keys.auth };
      raceExisting.expirationTime = expirationTime ? new Date(expirationTime) : null;
      raceExisting.userAgent = typeof userAgent === 'string' ? userAgent.slice(0, 500) : raceExisting.userAgent;
      raceExisting.deviceLabel = typeof deviceLabel === 'string' ? deviceLabel.slice(0, 150) : raceExisting.deviceLabel;
      raceExisting.isActive = true;
      raceExisting.lastUsedAt = new Date();
      await raceExisting.save();
      return raceExisting;
    }

    throw err;
  }
};

export const unsubscribe = async (userId, endpoint) => {
  if (!endpoint || typeof endpoint !== 'string') {
    throw new ApiError(400, 'A valid subscription endpoint is required');
  }

  const subscription = await PushSubscription.findOne({ endpoint });

  if (!subscription) {
    throw new ApiError(404, 'Subscription not found');
  }

  if (String(subscription.user) !== String(userId)) {
    throw new ApiError(403, 'You cannot unsubscribe another user\'s subscription');
  }

  subscription.isActive = false;
  await subscription.save();
  return subscription;
};

export const getStatus = async (userId) => {
  const subscriptions = await PushSubscription.find({ user: userId, isActive: true }).select(
    'endpoint userAgent deviceLabel lastUsedAt createdAt'
  );

  return {
    configured: isPushConfigured(),
    subscriptionCount: subscriptions.length,
    subscriptions,
  };
};

export const sendToUser = async (userId, payload) => {
  const subscriptions = await PushSubscription.find({ user: userId, isActive: true });

  if (subscriptions.length === 0) {
    return { attempted: 0, sent: 0, failed: 0, results: [] };
  }

  const results = await Promise.all(subscriptions.map((sub) => sendToSubscription(sub, payload)));

  const sent = results.filter((r) => r.success).length;

  return {
    attempted: results.length,
    sent,
    failed: results.length - sent,
    results,
  };
};
