self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = {};
  }

  const title = payload.title || 'LearnPilot AI';
  const options = {
    body: payload.body || '',
    tag: payload.tag || 'system',
    data: {
      url: payload.url || '/',
      type: payload.type || 'system',
      notificationId: payload.notificationId || null,
      timestamp: payload.timestamp || Date.now(),
      ...(payload.data || {}),
    },
  };

  // Only set icon/badge when the push payload explicitly provides one.
  // Referencing a static asset path that doesn't exist in the app would
  // otherwise silently fail to render in Chrome's notification.
  if (payload.icon) options.icon = payload.icon;
  if (payload.badge) options.badge = payload.badge;

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const clientUrl = new URL(client.url);

        if (clientUrl.pathname === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});

self.addEventListener('notificationclose', (event) => {});
