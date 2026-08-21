import { apiRequest } from '../api/client.js';

const cleDerniereNotification = 'campushub_derniere_notification_push';

function convertirCleVapid(cle) {
  const remplissage = '='.repeat((4 - (cle.length % 4)) % 4);
  const base64 = (cle + remplissage).replace(/-/g, '+').replace(/_/g, '/');
  const brute = window.atob(base64);
  return Uint8Array.from([...brute].map((caractere) => caractere.charCodeAt(0)));
}

export function statutNotificationsNavigateur() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'NON_SUPPORTE';
  return Notification.permission;
}

export async function statutAbonnementPush() {
  const permission = statutNotificationsNavigateur();
  if (permission !== 'granted') return permission;
  const registration = await navigator.serviceWorker.ready;
  return (await registration.pushManager.getSubscription()) ? 'ACTIVE' : 'granted';
}

export async function activerNotificationsNavigateur(token) {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    throw new Error('Ce navigateur ne prend pas en charge les notifications push.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Les notifications ont été refusées dans le navigateur.');
  const registration = await navigator.serviceWorker.ready;
  const configuration = await apiRequest('/notifications/push/configuration', { token });
  if (!configuration.donnees?.disponible || !configuration.donnees?.clePublique) {
    throw new Error('Les notifications push ne sont pas encore configurées sur le serveur CampusHub.');
  }
  let abonnement = await registration.pushManager.getSubscription();
  if (!abonnement) abonnement = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertirCleVapid(configuration.donnees.clePublique),
  });
  await apiRequest('/notifications/push/abonnement', {
    method: 'POST',
    token,
    body: abonnement.toJSON(),
  });
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
