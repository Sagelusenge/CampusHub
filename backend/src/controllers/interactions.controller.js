import {
  ajouterFavori as enregistrerFavori,
  basculerJaime as modifierJaime,
  listerFavoris as obtenirFavoris,
  listerUniversitesSuivies as obtenirUniversitesSuivies,
  nePlusSuivreUniversite as retirerAbonnementUniversite,
  retirerFavori as supprimerFavori,
  suivreUniversite as ajouterAbonnementUniversite,
} from '../services/interactions.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

// POST /api/v1/interactions/publications/:code/jaime
export async function basculerJaime(requete, reponse) {
  const utilisateurId = requete.utilisateur.id;
  const { code } = requete.validees.params;
  const resultat = await modifierJaime(utilisateurId, code);

  return envoyerSucces(reponse, resultat, 200, undefined, 'Mention J’aime mise à jour.');
}

// POST /api/v1/interactions/publications/:code/favori
export async function ajouterFavori(requete, reponse) {
  const utilisateurId = requete.utilisateur.id;
  const { code } = requete.validees.params;
  const resultat = await enregistrerFavori(utilisateurId, code);

  return envoyerSucces(reponse, resultat, 200, undefined, 'Publication ajoutée aux favoris.');
}

// DELETE /api/v1/interactions/publications/:code/favori
export async function retirerFavori(requete, reponse) {
  const utilisateurId = requete.utilisateur.id;
  const { code } = requete.validees.params;
  const resultat = await supprimerFavori(utilisateurId, code);

  return envoyerSucces(reponse, resultat, 200, undefined, 'Publication retirée des favoris.');
}

// GET /api/v1/interactions/favoris
export async function listerFavoris(requete, reponse) {
  const favoris = await obtenirFavoris(requete.utilisateur.id);
  return envoyerSucces(reponse, favoris, 200, undefined, 'Favoris chargés.');
}

// POST /api/v1/interactions/universites/:code/suivre
export async function suivreUniversite(requete, reponse) {
  const utilisateurId = requete.utilisateur.id;
  const { code } = requete.validees.params;
  const resultat = await ajouterAbonnementUniversite(utilisateurId, code);

  return envoyerSucces(reponse, resultat, 200, undefined, 'Université suivie.');
}

// DELETE /api/v1/interactions/universites/:code/suivre
export async function nePlusSuivreUniversite(requete, reponse) {
  const utilisateurId = requete.utilisateur.id;
  const { code } = requete.validees.params;
  const resultat = await retirerAbonnementUniversite(utilisateurId, code);

  return envoyerSucces(reponse, resultat, 200, undefined, 'Abonnement universitaire retiré.');
}

// GET /api/v1/interactions/universites-suivies
export async function listerUniversitesSuivies(requete, reponse) {
  const universites = await obtenirUniversitesSuivies(requete.utilisateur.id);
  return envoyerSucces(reponse, universites, 200, undefined, 'Universités suivies chargées.');
}
