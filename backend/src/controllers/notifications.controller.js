import * as service from '../services/notifications.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function lister(r, s) {
  const x = await service.listerNotifications(r.utilisateur.id, r.validees.query);
  return envoyerSucces(s, { notifications: x.notifications, nonLues: x.nonLues }, 200, x.meta);
}
export const marquerLue = async (r, s) => envoyerSucces(s, await service.marquerLue(r.utilisateur.id, r.validees.params.code));
export const marquerToutesLues = async (r, s) => envoyerSucces(s, await service.marquerToutesLues(r.utilisateur.id));
export const supprimer = async (r, s) => envoyerSucces(s, await service.supprimerNotification(r.utilisateur.id, r.validees.params.code));
