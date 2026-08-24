/* DeFi Alpha — service worker (push notifications).
 * Served from /sw.js (client/public is copied into the build output).
 * Registration happens in client/src/lib/push.ts — this file only handles
 * incoming push events and notification clicks.
 */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // ignore malformed payloads — still show a generic notification
  }

  const title = data.title || "DeFi Alpha";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "defi-alpha",
    renotify: true,
    data: { url: data.url || "/watchlist" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/watchlist";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // Focus an existing tab of our app if one is open
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client && new URL(client.url).origin === self.location.origin) {
            client.navigate(url);
          }
          return;
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
