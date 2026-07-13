import { rechercher, recommander } from '../services/recherche.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function globale(requete, reponse) {
  return envoyerSucces(reponse, await rechercher(requete.utilisateur.id, requete.validees.query.q), 200, undefined, 'Résultats chargés.');
}
export async function recommandations(requete, reponse) {
  return envoyerSucces(reponse, await recommander(requete.utilisateur.id), 200, undefined, 'Fil personnalisé chargé.');
}
