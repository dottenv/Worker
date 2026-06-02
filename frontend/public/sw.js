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
    const { title, body, url } = data;

    event.waitUntil(
      self.registration.showNotification(title || "Service App", {
        body: body || "",
        icon: "/icon-192.svg",
        badge: "/icon-192.svg",
        data: { url: url || "/swaps" },
      })
    );
  } catch {
    event.waitUntil(
      self.registration.showNotification("Service App", {
        body: event.data.text(),
        icon: "/icon-192.svg",
        badge: "/icon-192.svg",
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/swaps";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      const focused = windowClients.find((c) => "focus" in c);
      if (focused) {
        focused.focus();
        focused.navigate(url);
        return;
      }
      if (clients.openWindow) {
        clients.openWindow(url);
      }
    })
  );
});
