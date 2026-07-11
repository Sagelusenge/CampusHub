import {
  creerUniversite,
  obtenirUniversiteParCode,
  rechercherUniversites,
} from '../services/universites.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function lister(requete, reponse) {
  return envoyerSucces(reponse, await rechercherUniversites(requete.validees.query));
}

export async function afficher(requete, reponse) {
  return envoyerSucces(reponse, await obtenirUniversiteParCode(requete.validees.params.code));
}

export async function creer(requete, reponse) {
  return envoyerSucces(reponse, await creerUniversite(requete.validees.body), 201);
}
