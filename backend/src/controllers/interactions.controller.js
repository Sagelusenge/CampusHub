import * as service from '../services/interactions.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export const basculerJaime = async (r, s) => envoyerSucces(s, await service.basculerJaime(r.utilisateur.id, r.validees.params.code));
export const ajouterFavori = async (r, s) => envoyerSucces(s, await service.ajouterFavori(r.utilisateur.id, r.validees.params.code));
export const retirerFavori = async (r, s) => envoyerSucces(s, await service.retirerFavori(r.utilisateur.id, r.validees.params.code));
export const listerFavoris = async (r, s) => envoyerSucces(s, await service.listerFavoris(r.utilisateur.id));
export const suivreUniversite = async (r, s) => envoyerSucces(s, await service.suivreUniversite(r.utilisateur.id, r.validees.params.code));
export const nePlusSuivreUniversite = async (r, s) => envoyerSucces(s, await service.nePlusSuivreUniversite(r.utilisateur.id, r.validees.params.code));
export const listerUniversitesSuivies = async (r, s) => envoyerSucces(s, await service.listerUniversitesSuivies(r.utilisateur.id));
