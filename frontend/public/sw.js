self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "Nueva reserva en TuAgendaYa";
  const options = {
    body: data.body || "Tenés una nueva reserva pendiente.",
    icon: data.icon || "/tuagendaya-logo.png",
    badge: data.badge || "/tuagendaya-logo.png",
    data: {
      url: data.url || "/profesional/dashboard",
      bookingId: data.bookingId || null,
    },
    tag: data.bookingId ? `booking-${data.bookingId}` : "tuagendaya-booking",
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification?.data?.url || "/profesional/dashboard", self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/profesional") && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return null;
    })
  );
});