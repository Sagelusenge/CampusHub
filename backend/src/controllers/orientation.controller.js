import { analyserBulletin, configurationFinaliste, configurationOrientation, listerDossiers, obtenirDossier, orienter, orienterFinaliste } from '../services/orientation.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function configuration(_requete, reponse) { return envoyerSucces(reponse, await configurationOrientation()); }
export async function recommander(requete, reponse) { return envoyerSucces(reponse, await orienter(requete.utilisateur, requete.validees.body), 201, undefined, 'Dossier d’orientation créé.'); }
export async function analyser(requete, reponse) { return envoyerSucces(reponse, await analyserBulletin(requete.validees.body.urlImage)); }
export async function dossiers(requete, reponse) { return envoyerSucces(reponse, await listerDossiers(requete.utilisateur.id)); }
export async function dossier(requete, reponse) { return envoyerSucces(reponse, await obtenirDossier(requete.validees.params.code, requete.utilisateur)); }
export async function configurationFinalistes(_requete, reponse) { return envoyerSucces(reponse, configurationFinaliste()); }
export async function recommanderFinaliste(requete, reponse) { return envoyerSucces(reponse, await orienterFinaliste(requete.utilisateur, requete.validees.body), 201, undefined, 'Recommandations pour finaliste calculées.'); }
