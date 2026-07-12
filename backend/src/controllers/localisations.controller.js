import * as service from '../services/localisations.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function suggerer(req, res) { return envoyerSucces(res, await service.creerSuggestion(req.validees.body, req.utilisateur?.id), 201); }
export async function lister(_req, res) { return envoyerSucces(res, await service.listerSuggestions()); }
export async function traiter(req, res) { return envoyerSucces(res, await service.traiterSuggestion(req.validees.params.code, req.validees.body.statut)); }
