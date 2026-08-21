let invitationInstallation = null;
const observateurs = new Set();

function notifier() {
  observateurs.forEach((observateur) => observateur(etatInstallationPwa()));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    invitationInstallation = event;
    notifier();
  });
  window.addEventListener('appinstalled', () => {
    invitationInstallation = null;
    notifier();
  });
}

export function estPwaInstallee() {
  return typeof window !== 'undefined'
    && (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
}

export function etatInstallationPwa() {
  const ios = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  return { installee: estPwaInstallee(), disponible: Boolean(invitationInstallation), ios };
}

export function observerInstallationPwa(observateur) {
  observateurs.add(observateur);
  observateur(etatInstallationPwa());
  return () => observateurs.delete(observateur);
}

export async function installerPwa() {
  if (!invitationInstallation) return { installee: estPwaInstallee(), resultat: 'INDISPONIBLE' };
  await invitationInstallation.prompt();
  const choix = await invitationInstallation.userChoice;
  invitationInstallation = null;
  notifier();
  return { installee: choix.outcome === 'accepted', resultat: choix.outcome.toUpperCase() };
}
