import {
  listerNotifications,
  marquerLue as marquerNotificationLue,
  marquerToutesLues as marquerToutesNotificationsLues,
  supprimerNotification,
} from '../services/notifications.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

// GET /api/v1/notifications
export async function lister(requete, reponse) {
  const utilisateurId = requete.utilisateur.id;
  const filtres = requete.validees.query;
  const resultat = await listerNotifications(utilisateurId, filtres);

  return envoyerSucces(
    reponse,
    { notifications: resultat.notifications, nonLues: resultat.nonLues },
    200,
    resultat.meta,
    'Notifications chargées.',
  );
}

// PATCH /api/v1/notifications/:code/lire
export async function marquerLue(requete, reponse) {
  const utilisateurId = requete.utilisateur.id;
  const { code } = requete.validees.params;
  const resultat = await marquerNotificationLue(utilisateurId, code);

  return envoyerSucces(reponse, resultat, 200, undefined, 'Notification marquée comme lue.');
}

// PATCH /api/v1/notifications/tout-lire
export async function marquerToutesLues(requete, reponse) {
  const utilisateurId = requete.utilisateur.id;
  const resultat = await marquerToutesNotificationsLues(utilisateurId);

  return envoyerSucces(
    reponse,
    resultat,
    200,
    undefined,
    `${resultat.nombre} notification(s) marquée(s) comme lue(s).`,
  );
}

// DELETE /api/v1/notifications/:code
export async function supprimer(requete, reponse) {
  const utilisateurId = requete.utilisateur.id;
  const { code } = requete.validees.params;
  const resultat = await supprimerNotification(utilisateurId, code);

  return envoyerSucces(reponse, resultat, 200, undefined, 'Notification supprimée.');
}
