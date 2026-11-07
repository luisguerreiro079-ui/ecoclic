// Service worker d'ÉcoClic.
// Pour l'instant, il rend l'appli installable. À l'étape des notifications,
// c'est lui qui recevra et affichera les rappels, même appli fermée.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Préparé pour l'étape 6 (notifications) :
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.titre || "ÉcoClic", {
      body: data.texte || "Pensez à sortir votre poubelle.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
