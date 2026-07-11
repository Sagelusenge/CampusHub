import { obtenirEtatSante } from '../services/sante.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

// GET /api/v1/sante
export async function verifierSante(_requete, reponse) {
  const etat = await obtenirEtatSante();

  return envoyerSucces(
    reponse,
    etat,
    200,
    undefined,
    'L’API et la base de données fonctionnent correctement.',
  );
}
