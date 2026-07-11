import {
  creerUniversite,
  comparerUniversites,
  modifierUniversite,
  obtenirUniversiteParCode,
  rechercherUniversites,
  statistiquesUniversite,
  supprimerUniversite,
} from '../services/universites.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function lister(requete, reponse) {
  return envoyerSucces(reponse, await rechercherUniversites(requete.validees.query));
}

export async function modifier(requete, reponse) {
  return envoyerSucces(reponse, await modifierUniversite(requete.validees.params.code, requete.validees.body, requete.utilisateur));
}
export async function supprimer(requete, reponse) {
  return envoyerSucces(reponse, await supprimerUniversite(requete.validees.params.code));
}
export async function comparer(requete, reponse) {
  return envoyerSucces(reponse, await comparerUniversites(requete.validees.query.codes));
}
export async function statistiques(requete, reponse) {
  return envoyerSucces(reponse, await statistiquesUniversite(requete.validees.params.code));
}

export async function afficher(requete, reponse) {
  return envoyerSucces(reponse, await obtenirUniversiteParCode(requete.validees.params.code));
}

export async function creer(requete, reponse) {
  return envoyerSucces(
    reponse,
    await creerUniversite(requete.validees.body, requete.utilisateur),
    201,
  );
}
