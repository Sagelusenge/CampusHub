const cleDerniereNotification = 'campushub_derniere_notification_push';

export function statutNotificationsNavigateur() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'NON_SUPPORTE';
  return Notification.permission;
}

export async function activerNotificationsNavigateur() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    throw new Error('Ce navigateur ne prend pas en charge les notifications push.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Les notifications ont été refusées dans le navigateur.');
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification('Notifications CampusHub activées', {
    body: 'Vous serez averti des nouveaux messages, invitations et activités importantes.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'campushub-activation',
    data: { url: '/notifications' },
  });
  return permission;
}

export async function notifierNouvelleActivite(notification) {
  if (!notification?.code_notification || statutNotificationsNavigateur() !== 'granted') return;
  const derniere = localStorage.getItem(cleDerniereNotification);
  localStorage.setItem(cleDerniereNotification, notification.code_notification);
  if (!derniere || derniere === notification.code_notification) return;
  const registration = await navigator.serviceWorker.ready;
  let url = notification.url_action || '/notifications';
  if (url === '/messages') {
    if (window.location.pathname.startsWith('/espace-universite')) url = '/espace-universite/messages';
    else if (window.location.pathname.startsWith('/espace-etudiant')) url = '/espace-etudiant/messages';
    else url = '/chat';
  }
  await registration.showNotification(notification.titre || 'Nouvelle activité CampusHub', {
    body: notification.message || 'Une nouvelle activité vous attend.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: notification.code_notification,
    data: { url },
  });
}
