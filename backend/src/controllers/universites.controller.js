import {
  comparerUniversites,
  creerUniversite,
  modifierUniversite,
  obtenirUniversiteParCode,
  rechercherUniversites,
  statistiquesUniversite,
  supprimerUniversite,
} from '../services/universites.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

// GET /api/v1/universites
export async function lister(requete, reponse) {
  const filtres = requete.validees.query;
  const universites = await rechercherUniversites(filtres);

  return envoyerSucces(reponse, universites, 200, undefined, 'Universités chargées.');
}

// GET /api/v1/universites/:code
export async function afficher(requete, reponse) {
  const { code } = requete.validees.params;
  const universite = await obtenirUniversiteParCode(code);

  return envoyerSucces(reponse, universite, 200, undefined, 'Fiche universitaire chargée.');
}

// POST /api/v1/universites
export async function creer(requete, reponse) {
  const donneesUniversite = requete.validees.body;
  const gestionnaire = requete.utilisateur;
  const universite = await creerUniversite(donneesUniversite, gestionnaire);

  return envoyerSucces(reponse, universite, 201, undefined, 'Université créée.');
}

// PATCH /api/v1/universites/:code
export async function modifier(requete, reponse) {
  const { code } = requete.validees.params;
  const modifications = requete.validees.body;
  const gestionnaire = requete.utilisateur;
  const universite = await modifierUniversite(code, modifications, gestionnaire);

  return envoyerSucces(reponse, universite, 200, undefined, 'Université mise à jour.');
}

// DELETE /api/v1/universites/:code
export async function supprimer(requete, reponse) {
  const { code } = requete.validees.params;
  const resultat = await supprimerUniversite(code);

  return envoyerSucces(reponse, resultat, 200, undefined, 'Université supprimée.');
}

// GET /api/v1/universites/comparer?codes=...
export async function comparer(requete, reponse) {
  const { codes } = requete.validees.query;
  const comparaison = await comparerUniversites(codes);

  return envoyerSucces(reponse, comparaison, 200, undefined, 'Comparaison universitaire générée.');
}

// GET /api/v1/universites/:code/statistiques
export async function statistiques(requete, reponse) {
  const { code } = requete.validees.params;
  const donnees = await statistiquesUniversite(code);

  return envoyerSucces(reponse, donnees, 200, undefined, 'Statistiques universitaires chargées.');
}
