const CACHE = "sposta-auto-v2-shell-v2";

const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE)
            .map((key) => caches.delete(key))
        )
      )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  // Le chiamate alle Netlify Functions non devono essere salvate in cache.
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (
          url.origin === self.location.origin &&
          response.ok
        ) {
          const copy = response.clone();

          caches
            .open(CACHE)
            .then((cache) => cache.put(event.request, copy));
        }

        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);

        if (cachedResponse) {
          return cachedResponse;
        }

        if (event.request.mode === "navigate") {
          return caches.match("/");
        }

        return Response.error();
      })
  );
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data
      ? event.data.json()
      : {};
  } catch {
    data = {
      body: event.data?.text() || "",
    };
  }

  const title = data.title || "Sposta l'auto";

  const options = {
    body:
      data.body ||
      "Controlla il prossimo spazzamento.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "sposta-auto",
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(async (windows) => {
        for (const windowClient of windows) {
          if (
            windowClient.url.startsWith(self.location.origin) &&
            "focus" in windowClient
          ) {
            if ("navigate" in windowClient) {
              await windowClient.navigate(targetUrl);
            }

            return windowClient.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }

        return undefined;
      })
  );
});
