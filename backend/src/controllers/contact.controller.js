import { creerContact, listerContacts, traiterContact } from '../services/contact.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function creer(requete, reponse) {
  return envoyerSucces(reponse, await creerContact(requete.validees.body), 201, undefined, 'Votre message a été transmis à l’administration.');
}
export async function lister(requete, reponse) {
  return envoyerSucces(reponse, await listerContacts(requete.validees.query.statut));
}
export async function traiter(requete, reponse) {
  return envoyerSucces(reponse, await traiterContact(requete.validees.params.code, requete.validees.body, requete.utilisateur.id), 200, undefined, 'Demande mise à jour.');
}
