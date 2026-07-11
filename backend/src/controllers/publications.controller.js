import * as service from '../services/publications.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function lister(r, s) { const x = await service.listerPublications(r.validees.query); return envoyerSucces(s, x.publications, 200, x.meta); }
export async function afficher(r, s) { return envoyerSucces(s, await service.obtenirPublication(r.validees.params.code)); }
export async function creer(r, s) { return envoyerSucces(s, await service.creerPublication(r.utilisateur, r.validees.body), 201); }
export async function modifier(r, s) { return envoyerSucces(s, await service.modifierPublication(r.validees.params.code, r.validees.body, r.utilisateur)); }
export async function retirer(r, s) { return envoyerSucces(s, await service.retirerPublication(r.validees.params.code, r.utilisateur)); }
export async function ajouterMedia(r, s) { return envoyerSucces(s, await service.ajouterMedia(r.validees.params.code, r.validees.body, r.utilisateur), 201); }
export async function supprimerMedia(r, s) { return envoyerSucces(s, await service.supprimerMedia(r.validees.params.codeMedia, r.utilisateur)); }
export async function commenter(r, s) { return envoyerSucces(s, await service.ajouterCommentaire(r.validees.params.code, r.validees.body, r.utilisateur), 201); }
export async function modifierCommentaire(r, s) { return envoyerSucces(s, await service.modifierCommentaire(r.validees.params.codeCommentaire, r.validees.body.contenu, r.utilisateur)); }
export async function supprimerCommentaire(r, s) { return envoyerSucces(s, await service.supprimerCommentaire(r.validees.params.codeCommentaire, r.utilisateur)); }
