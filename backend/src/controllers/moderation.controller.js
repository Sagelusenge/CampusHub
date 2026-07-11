import {
  creerSignalement,
  listerSignalements,
  traiterSignalement,
} from '../services/moderation.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

// POST /api/v1/moderation/signalements
export async function signaler(requete, reponse) {
  const utilisateurId = requete.utilisateur.id;
  const donnees = requete.validees.body;
  const signalement = await creerSignalement(utilisateurId, donnees);

  return envoyerSucces(reponse, signalement, 201, undefined, 'Signalement enregistré.');
}

// GET /api/v1/moderation/signalements
export async function lister(requete, reponse) {
  const filtres = requete.validees.query;
  const resultat = await listerSignalements(filtres);

  return envoyerSucces(
    reponse,
    resultat.signalements,
    200,
    resultat.meta,
    'Signalements chargés.',
  );
}

// PATCH /api/v1/moderation/signalements/:code
export async function traiter(requete, reponse) {
  const { code } = requete.validees.params;
  const moderateurId = requete.utilisateur.id;
  const decision = requete.validees.body;
  const signalement = await traiterSignalement(code, moderateurId, decision);

  return envoyerSucces(reponse, signalement, 200, undefined, 'Signalement traité.');
}
