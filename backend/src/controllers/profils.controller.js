import {
  creerProfil,
  listerProfils,
  masquerProfil,
  modifierProfil,
  obtenirMonProfil,
  obtenirProfilParCode,
} from '../services/profils.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

// GET /api/v1/profils
export async function lister(requete, reponse) {
  const filtres = requete.validees.query;
  const resultat = await listerProfils(filtres);

  return envoyerSucces(reponse, resultat.profils, 200, resultat.meta, 'Profils étudiants chargés.');
}

// GET /api/v1/profils/:code
export async function afficher(requete, reponse) {
  const { code } = requete.validees.params;
  const profil = await obtenirProfilParCode(code);
  return envoyerSucces(reponse, profil, 200, undefined, 'Profil étudiant chargé.');
}

// GET /api/v1/profils/moi
export async function moi(requete, reponse) {
  const profil = await obtenirMonProfil(requete.utilisateur.id);
  return envoyerSucces(reponse, profil, 200, undefined, 'Votre profil étudiant est chargé.');
}

// POST /api/v1/profils
export async function creer(requete, reponse) {
  const utilisateurId = requete.utilisateur.id;
  const donneesProfil = requete.validees.body;
  const profil = await creerProfil(utilisateurId, donneesProfil);

  return envoyerSucces(reponse, profil, 201, undefined, 'Profil étudiant créé.');
}

// PATCH /api/v1/profils/moi
export async function modifier(requete, reponse) {
  const utilisateurId = requete.utilisateur.id;
  const modifications = requete.validees.body;
  const profil = await modifierProfil(utilisateurId, modifications);

  return envoyerSucces(reponse, profil, 200, undefined, 'Profil étudiant mis à jour.');
}

// DELETE /api/v1/profils/moi
export async function masquer(requete, reponse) {
  const resultat = await masquerProfil(requete.utilisateur.id);
  return envoyerSucces(reponse, resultat, 200, undefined, 'Profil étudiant masqué.');
}
