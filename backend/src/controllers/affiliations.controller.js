import * as service from '../services/affiliations.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function creer(req, res) { return envoyerSucces(res, await service.creerDemandeAffiliation(req.utilisateur.id, req.validees.body), 201); }
export async function mesDemandes(req, res) { return envoyerSucces(res, await service.listerMesDemandes(req.utilisateur.id)); }
export async function demandesUniversite(req, res) { return envoyerSucces(res, await service.listerDemandesUniversite(req.utilisateur.id)); }
export async function traiter(req, res) { return envoyerSucces(res, await service.traiterDemandeAffiliation(req.validees.params.code, req.utilisateur.id, req.validees.body)); }
