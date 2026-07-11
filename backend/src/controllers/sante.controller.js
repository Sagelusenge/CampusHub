import { obtenirEtatSante } from '../services/sante.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function verifierSante(_requete, reponse) {
  return envoyerSucces(reponse, await obtenirEtatSante());
}
