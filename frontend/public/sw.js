const APP_CACHE = "tuagendaya-app-v1";
const APP_SHELL = [
  "/",
  "/profesional/login",
  "/manifest.webmanifest",
  "/tuagendaya-logo.png",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => null))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== APP_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();

        caches.open(APP_CACHE).then((cache) => {
          cache.put(request, responseClone).catch(() => null);
        });

        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;

          if (request.mode === "navigate") {
            return caches.match("/profesional/login");
          }

          return null;
        })
      )
  );
});

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
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
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

  const targetUrl = new URL(
    event.notification?.data?.url || "/profesional/dashboard",
    self.location.origin
  ).href;

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