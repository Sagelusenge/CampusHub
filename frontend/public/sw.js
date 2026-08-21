const VERSION = 'campushub-v2';
const CACHE_STATIQUE = `${VERSION}-statique`;
const CACHE_PAGES = `${VERSION}-pages`;
const PRECACHE = ['/', '/offline.html', '/favicon.svg', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_STATIQUE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((cles) => Promise.all(cles.filter((cle) => ![CACHE_STATIQUE, CACHE_PAGES].includes(cle)).map((cle) => caches.delete(cle)))),
    self.clients.claim(),
  ]));
});

self.addEventListener('fetch', (event) => {
  const requete = event.request;
  if (requete.method !== 'GET') return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return;

  if (requete.mode === 'navigate') {
    event.respondWith(fetch(requete).then((reponse) => {
      const copie = reponse.clone();
      caches.open(CACHE_PAGES).then((cache) => cache.put(requete, copie));
      return reponse;
    }).catch(async () => (await caches.match(requete)) || (await caches.match('/offline.html'))));
    return;
  }

  if (['style', 'script', 'font', 'image'].includes(requete.destination) || url.pathname.endsWith('.webmanifest')) {
    event.respondWith(caches.match(requete).then((cachee) => {
      const reseau = fetch(requete).then((reponse) => {
        if (reponse.ok) caches.open(CACHE_STATIQUE).then((cache) => cache.put(requete, reponse.clone()));
        return reponse;
      }).catch(() => cachee);
      return cachee || reseau;
    }));
  }
});

self.addEventListener('push', (event) => {
  let donnees;
  try { donnees = event.data?.json() || {}; } catch { donnees = { message: event.data?.text() }; }
  const titre = donnees.titre || 'CampusHub';
  const options = {
    body: donnees.message || 'Une nouvelle activité vous attend.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: donnees.code || `campushub-${Date.now()}`,
    renotify: Boolean(donnees.renotify),
    data: { url: donnees.url || '/notifications' },
    actions: [{ action: 'ouvrir', title: 'Ouvrir CampusHub' }, { action: 'fermer', title: 'Plus tard' }],
  };
  event.waitUntil(self.registration.showNotification(titre, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'fermer') return;
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

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
