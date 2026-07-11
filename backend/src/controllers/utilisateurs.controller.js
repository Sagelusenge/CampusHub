import {
  changerStatutUtilisateur,
  listerUtilisateurs,
  modifierMonCompte,
  nePlusSuivreUtilisateur,
  obtenirUtilisateurPublic,
  suivreUtilisateur,
} from '../services/utilisateurs-gestion.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

// GET /api/v1/utilisateurs/moi
export async function moi(requete, reponse) {
  const utilisateurConnecte = requete.utilisateur;
  return envoyerSucces(reponse, utilisateurConnecte, 200, undefined, 'Compte utilisateur chargé.');
}

// PATCH /api/v1/utilisateurs/moi
export async function modifierMoi(requete, reponse) {
  const utilisateurId = requete.utilisateur.id;
  const modifications = requete.validees.body;
  const utilisateur = await modifierMonCompte(utilisateurId, modifications);

  return envoyerSucces(reponse, utilisateur, 200, undefined, 'Compte mis à jour.');
}

// GET /api/v1/utilisateurs
export async function lister(requete, reponse) {
  const filtres = requete.validees.query;
  const resultat = await listerUtilisateurs(filtres);

  return envoyerSucces(
    reponse,
    resultat.utilisateurs,
    200,
    resultat.meta,
    'Utilisateurs chargés.',
  );
}

// GET /api/v1/utilisateurs/:code
export async function afficher(requete, reponse) {
  const { code } = requete.validees.params;
  const utilisateur = await obtenirUtilisateurPublic(code);

  return envoyerSucces(reponse, utilisateur, 200, undefined, 'Profil utilisateur chargé.');
}

// PATCH /api/v1/utilisateurs/:code/statut
export async function changerStatut(requete, reponse) {
  const { code } = requete.validees.params;
  const nouveauStatut = requete.validees.body;
  const utilisateur = await changerStatutUtilisateur(code, nouveauStatut);

  return envoyerSucces(reponse, utilisateur, 200, undefined, 'Statut du compte mis à jour.');
}

// POST /api/v1/utilisateurs/:code/suivre
export async function suivre(requete, reponse) {
  const abonneId = requete.utilisateur.id;
  const { code } = requete.validees.params;
  const resultat = await suivreUtilisateur(abonneId, code);

  return envoyerSucces(reponse, resultat, 200, undefined, 'Utilisateur suivi.');
}

// DELETE /api/v1/utilisateurs/:code/suivre
export async function nePlusSuivre(requete, reponse) {
  const abonneId = requete.utilisateur.id;
  const { code } = requete.validees.params;
  const resultat = await nePlusSuivreUtilisateur(abonneId, code);

  return envoyerSucces(reponse, resultat, 200, undefined, 'Abonnement utilisateur retiré.');
}
