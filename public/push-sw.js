/* Service Worker dedicado a notificacoes push do EVO Training Club.
   Nao faz cache de app shell — apenas recebe e abre notificacoes. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { title: "EVO Training Club", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "EVO Training Club";
  const options = {
    body: data.body || "",
    icon: "/favicon.png",
    badge: "/favicon.png",
    tag: data.tag || "evo",
    data: { url: data.url || "/" },
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client && target) {
            try { await client.navigate(target); } catch (_e) { /* ignora */ }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
