import * as service from '../services/profils.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function lister(requete, reponse) {
  const resultat = await service.listerProfils(requete.validees.query);
  return envoyerSucces(reponse, resultat.profils, 200, resultat.meta);
}
export async function afficher(requete, reponse) { return envoyerSucces(reponse, await service.obtenirProfilParCode(requete.validees.params.code)); }
export async function moi(requete, reponse) { return envoyerSucces(reponse, await service.obtenirMonProfil(requete.utilisateur.id)); }
export async function creer(requete, reponse) { return envoyerSucces(reponse, await service.creerProfil(requete.utilisateur.id, requete.validees.body), 201); }
export async function modifier(requete, reponse) { return envoyerSucces(reponse, await service.modifierProfil(requete.utilisateur.id, requete.validees.body)); }
export async function masquer(requete, reponse) { return envoyerSucces(reponse, await service.masquerProfil(requete.utilisateur.id)); }
