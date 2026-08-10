self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const cible = new URL(event.notification.data?.url || '/notifications', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const ouverte = clients.find((client) => client.url.startsWith(self.location.origin));
    if (ouverte) {
      ouverte.navigate(cible);
      return ouverte.focus();
    }
    return self.clients.openWindow(cible);
  }));
});
