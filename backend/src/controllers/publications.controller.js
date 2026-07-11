import {
  ajouterCommentaire,
  ajouterMedia as ajouterMediaPublication,
  creerPublication,
  listerPublications,
  modifierCommentaire as modifierCommentairePublication,
  modifierPublication,
  obtenirPublication,
  retirerPublication,
  supprimerCommentaire as supprimerCommentairePublication,
  supprimerMedia as supprimerMediaPublication,
} from '../services/publications.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

// GET /api/v1/publications
export async function lister(requete, reponse) {
  const filtres = requete.validees.query;
  const resultat = await listerPublications(filtres);

  return envoyerSucces(reponse, resultat.publications, 200, resultat.meta, 'Publications chargées.');
}

// GET /api/v1/publications/:code
export async function afficher(requete, reponse) {
  const { code } = requete.validees.params;
  const publication = await obtenirPublication(code);

  return envoyerSucces(reponse, publication, 200, undefined, 'Publication chargée.');
}

// POST /api/v1/publications
export async function creer(requete, reponse) {
  const auteur = requete.utilisateur;
  const donneesPublication = requete.validees.body;
  const publication = await creerPublication(auteur, donneesPublication);

  return envoyerSucces(
    reponse,
    publication,
    201,
    undefined,
    donneesPublication.publier ? 'Publication publiée.' : 'Brouillon enregistré.',
  );
}

// PATCH /api/v1/publications/:code
export async function modifier(requete, reponse) {
  const { code } = requete.validees.params;
  const modifications = requete.validees.body;
  const utilisateur = requete.utilisateur;
  const publication = await modifierPublication(code, modifications, utilisateur);

  return envoyerSucces(reponse, publication, 200, undefined, 'Publication mise à jour.');
}

// DELETE /api/v1/publications/:code
export async function retirer(requete, reponse) {
  const { code } = requete.validees.params;
  const resultat = await retirerPublication(code, requete.utilisateur);

  return envoyerSucces(reponse, resultat, 200, undefined, 'Publication retirée du fil.');
}

// POST /api/v1/publications/:code/medias
export async function ajouterMedia(requete, reponse) {
  const { code } = requete.validees.params;
  const donneesMedia = requete.validees.body;
  const media = await ajouterMediaPublication(code, donneesMedia, requete.utilisateur);

  return envoyerSucces(reponse, media, 201, undefined, 'Média ajouté à la publication.');
}

// DELETE /api/v1/publications/medias/:codeMedia
export async function supprimerMedia(requete, reponse) {
  const { codeMedia } = requete.validees.params;
  const resultat = await supprimerMediaPublication(codeMedia, requete.utilisateur);

  return envoyerSucces(reponse, resultat, 200, undefined, 'Média supprimé.');
}

// POST /api/v1/publications/:code/commentaires
export async function commenter(requete, reponse) {
  const { code } = requete.validees.params;
  const donneesCommentaire = requete.validees.body;
  const commentaire = await ajouterCommentaire(code, donneesCommentaire, requete.utilisateur);

  return envoyerSucces(reponse, commentaire, 201, undefined, 'Commentaire publié.');
}

// PATCH /api/v1/publications/commentaires/:codeCommentaire
export async function modifierCommentaire(requete, reponse) {
  const { codeCommentaire } = requete.validees.params;
  const { contenu } = requete.validees.body;
  const commentaire = await modifierCommentairePublication(
    codeCommentaire,
    contenu,
    requete.utilisateur,
  );

  return envoyerSucces(reponse, commentaire, 200, undefined, 'Commentaire mis à jour.');
}

// DELETE /api/v1/publications/commentaires/:codeCommentaire
export async function supprimerCommentaire(requete, reponse) {
  const { codeCommentaire } = requete.validees.params;
  const resultat = await supprimerCommentairePublication(codeCommentaire, requete.utilisateur);

  return envoyerSucces(reponse, resultat, 200, undefined, 'Commentaire supprimé.');
}
