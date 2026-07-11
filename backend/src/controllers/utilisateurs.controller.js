import {
  changerStatutUtilisateur,
  listerUtilisateurs,
  modifierMonCompte,
  nePlusSuivreUtilisateur,
  obtenirUtilisateurPublic,
  suivreUtilisateur,
} from '../services/utilisateurs-gestion.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function moi(requete, reponse) { return envoyerSucces(reponse, requete.utilisateur); }
export async function modifierMoi(requete, reponse) {
  return envoyerSucces(reponse, await modifierMonCompte(requete.utilisateur.id, requete.validees.body));
}
export async function lister(requete, reponse) {
  const resultat = await listerUtilisateurs(requete.validees.query);
  return envoyerSucces(reponse, resultat.utilisateurs, 200, resultat.meta);
}
export async function afficher(requete, reponse) {
  return envoyerSucces(reponse, await obtenirUtilisateurPublic(requete.validees.params.code));
}
export async function changerStatut(requete, reponse) {
  return envoyerSucces(reponse, await changerStatutUtilisateur(requete.validees.params.code, requete.validees.body));
}
export async function suivre(requete, reponse) {
  return envoyerSucces(reponse, await suivreUtilisateur(requete.utilisateur.id, requete.validees.params.code));
}
export async function nePlusSuivre(requete, reponse) {
  return envoyerSucces(reponse, await nePlusSuivreUtilisateur(requete.utilisateur.id, requete.validees.params.code));
}
