importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js"
);

workbox.core.skipWaiting();
workbox.core.clientsClaim();

workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let title = "Worker";
  let options = {
    body: event.data.text(),
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    silent: false,
    requireInteraction: true,
    data: { url: "/swaps" },
  };

  try {
    const data = event.data.json();
    title = data.title || title;
    options.body = data.body || options.body;
    options.icon = data.icon || options.icon;
    options.badge = data.badge || options.badge;
    options.silent = data.sound === false;
    options.data.url = data.url || options.data.url;
  } catch {}

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/swaps";

  const openWindow = () => {
    if (clients.openWindow) {
      return clients.openWindow(url);
    }
  };

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
        return openWindow();
      })
      .catch(() => openWindow())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    fetch("/api/vapid/public-key")
      .then((res) => res.json())
      .then((data) => {
        const vapidKey = data.publicKey;
        if (!vapidKey) throw new Error("No VAPID key");

        return self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
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

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}
