import { api } from './api';
import type { ApiSuccess } from '../types/api';

export interface PushSubscriptionInfo {
  _id: string;
  endpoint: string;
  userAgent?: string;
  deviceLabel?: string;
  lastUsedAt?: string;
  createdAt?: string;
}

export interface PushStatus {
  configured: boolean;
  subscriptionCount: number;
  subscriptions: PushSubscriptionInfo[];
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  return navigator.serviceWorker.register('/service-worker.js');
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export async function getVapidPublicKey(): Promise<string> {
  const response = await api.get<ApiSuccess<{ publicKey: string }>>('/push/vapid-public-key');
  return response.data.data.publicKey;
}

export async function getPushStatus(): Promise<PushStatus> {
  const response = await api.get<ApiSuccess<PushStatus>>('/push/status');
  return response.data.data;
}

export async function subscribeToPush(): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    throw new Error('Could not register the service worker.');
  }
  await registration.update();

  const publicKey = await getVapidPublicKey();

  // A stale subscription (e.g. created against a previous VAPID key pair,
  // or left over from an earlier install) makes pushManager.subscribe()
  // throw InvalidStateError in Chrome. Clear it out locally before
  // requesting a fresh one so re-subscribing is always safe.
  const staleSubscription = await registration.pushManager.getSubscription();
  if (staleSubscription) {
    const staleEndpoint = staleSubscription.endpoint;
    await staleSubscription.unsubscribe();
    await api.delete('/push/unsubscribe', { data: { endpoint: staleEndpoint } }).catch(() => {
      // The stale record will also be cleaned up automatically the next
      // time a push delivery to it fails (404/410), so a failure here is
      // not fatal to subscribing fresh.
    });
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  const json = subscription.toJSON();

  await api.post('/push/subscribe', {
    endpoint: json.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: json.keys,
    userAgent: navigator.userAgent,
  });

  return subscription;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.getRegistration('/service-worker.js');
  const subscription = await registration?.pushManager.getSubscription();

  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await api.delete('/push/unsubscribe', { data: { endpoint } });
  }
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration('/service-worker.js');
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export interface TestNotificationDelivery {
  attempted: number;
  sent: number;
  failed: number;
}

export async function sendTestPushNotification(): Promise<TestNotificationDelivery> {
  const response = await api.post<ApiSuccess<{ delivery: TestNotificationDelivery }>>('/push/test');
  return response.data.data.delivery;
}
