import {
  listerAudit,
  tableauDeBord as obtenirTableauDeBord,
  verifierUniversite as modifierVerificationUniversite,
} from '../services/administration.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

// GET /api/v1/administration/tableau-de-bord
export async function tableauDeBord(_requete, reponse) {
  const donnees = await obtenirTableauDeBord();

  return envoyerSucces(
    reponse,
    donnees,
    200,
    undefined,
    'Tableau de bord administratif chargé.',
  );
}

// GET /api/v1/administration/audit
export async function audit(requete, reponse) {
  const filtres = requete.validees.query;
  const resultat = await listerAudit(filtres);

  return envoyerSucces(
    reponse,
    resultat.entrees,
    200,
    resultat.meta,
    'Journal d’audit chargé.',
  );
}

// PATCH /api/v1/administration/universites/:code/verification
export async function verifierUniversite(requete, reponse) {
  const { code } = requete.validees.params;
  const { statut } = requete.validees.body;
  const universite = await modifierVerificationUniversite(code, statut);

  return envoyerSucces(
    reponse,
    universite,
    200,
    undefined,
    `Le statut de vérification est maintenant ${statut}.`,
  );
}
