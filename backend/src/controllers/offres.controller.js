import {
  creerOffre, listerMesOffres, listerOffresPubliques, modifierOffre,
  obtenirOffrePublique, retirerOffre,
} from '../services/offres.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function lister(requete, reponse) {
  const resultat = await listerOffresPubliques(requete.validees.query);
  return envoyerSucces(reponse, resultat.offres, 200, resultat.meta, 'Offres chargées.');
}

export async function afficher(requete, reponse) {
  const offre = await obtenirOffrePublique(requete.validees.params.code);
  return envoyerSucces(reponse, offre, 200, undefined, 'Offre chargée.');
}

export async function listerMiennes(requete, reponse) {
  const resultat = await listerMesOffres(requete.utilisateur, requete.validees.query);
  return envoyerSucces(reponse, resultat.offres, 200, resultat.meta, 'Offres de l’établissement chargées.');
}

export async function creer(requete, reponse) {
  const offre = await creerOffre(requete.utilisateur, requete.validees.body);
  return envoyerSucces(reponse, offre, 201, undefined,
    requete.validees.body.publier ? 'Offre publiée.' : 'Brouillon enregistré.');
}

export async function modifier(requete, reponse) {
  const offre = await modifierOffre(requete.validees.params.code, requete.validees.body, requete.utilisateur);
  return envoyerSucces(reponse, offre, 200, undefined, 'Offre mise à jour.');
}

export async function retirer(requete, reponse) {
  const resultat = await retirerOffre(requete.validees.params.code, requete.utilisateur);
  return envoyerSucces(reponse, resultat, 200, undefined, 'Offre retirée.');
}
