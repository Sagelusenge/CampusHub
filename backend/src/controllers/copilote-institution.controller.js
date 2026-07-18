import * as service from '../services/copilote-institution.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function configuration(_requete, reponse) {
  return envoyerSucces(reponse, service.configurationCopilote());
}

export async function contexte(requete, reponse) {
  return envoyerSucces(reponse, await service.obtenirContexteCopilote(requete.utilisateur.id));
}

export async function generer(requete, reponse) {
  const resultat = await service.genererContenu(requete.utilisateur, requete.validees.body);
  return envoyerSucces(reponse, resultat, 201, undefined, 'Brouillon institutionnel créé.');
}

export async function historique(requete, reponse) {
  return envoyerSucces(reponse, await service.listerGenerations(requete.utilisateur.id));
}
