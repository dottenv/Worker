self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      body: data.body || "",
      icon: "/icon-192.svg",
      badge: "/icon-192.svg",
      silent: data.sound === false,
      data: { url: data.url || "/swaps" },
    };
    event.waitUntil(
      self.registration.showNotification(data.title || "Worker", options)
    );
  } catch {
    event.waitUntil(
      self.registration.showNotification("Worker", {
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