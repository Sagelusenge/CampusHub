import { creerStory, listerStories, marquerVue, supprimerStory } from '../services/stories.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function lister(requete, reponse) {
  return envoyerSucces(reponse, await listerStories(requete.utilisateur.id), 200, undefined, 'Stories chargées.');
}
export async function creer(requete, reponse) {
  return envoyerSucces(reponse, await creerStory(requete.utilisateur.id, requete.validees.body), 201, undefined, 'Story publiée pour 24 heures.');
}
export async function voir(requete, reponse) {
  return envoyerSucces(reponse, await marquerVue(requete.validees.params.code, requete.utilisateur.id));
}
export async function supprimer(requete, reponse) {
  return envoyerSucces(reponse, await supprimerStory(requete.validees.params.code, requete.utilisateur));
}
