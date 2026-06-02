importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js"
);

workbox.core.skipWaiting();
workbox.core.clientsClaim();

workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      silent: data.sound === false,
      requireInteraction: true,
      data: { url: data.url || "/swaps" },
    };
    event.waitUntil(
      self.registration.showNotification(data.title || "Worker", options)
    );
  } catch {
    event.waitUntil(
      self.registration.showNotification("Worker", {
        body: event.data.text(),
        icon: "/icon-192.png",
        badge: "/icon-192.png",
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/swaps";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            client.focus();
            try { client.navigate(url); } catch {}
            return;
          }
        }
        if (clients.openWindow) {
          clients.openWindow(url);
        }
      })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("pushsubscriptionchange", (event) => {
  const vapidKey =
    event.oldSubscription?.options?.applicationServerKey ||
    new Uint8Array([
      4, 154, 180, 151, 49, 71, 23, 170, 107, 148, 236, 218, 2, 24, 82, 142,
      40, 186, 136, 99, 18, 178, 39, 232, 109, 124, 136, 218, 163, 25, 208,
      213, 106, 55, 252, 164, 63, 22, 41, 81, 228, 108, 188, 31, 65, 232, 222,
      45, 77, 134, 194, 229, 154, 32, 73, 27, 26, 55, 116, 130, 75, 66, 172,
      208, 20,
    ]);
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      })
      .then((newSub) => {
        const toBase64Url = (buf) =>
          btoa(String.fromCharCode(...new Uint8Array(buf)))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: newSub.endpoint,
            keys: {
              p256dh: toBase64Url(newSub.getKey("p256dh")),
              auth: toBase64Url(newSub.getKey("auth")),
            },
          }),
        });
      })
      .catch(() => {})
  );
});
