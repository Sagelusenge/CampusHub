import * as service from '../services/abonnements.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function plans(_req, res) { return envoyerSucces(res, await service.listerPlans()); }
export async function soumettre(req, res) { return envoyerSucces(res, await service.soumettrePaiement(req.validees.body), 201, undefined, 'Preuve de paiement envoyée.'); }
export async function paiements(req, res) { const r = await service.listerPaiements(req.validees.query); return envoyerSucces(res, r.paiements, 200, r.meta); }
export async function traiter(req, res) { return envoyerSucces(res, await service.traiterPaiement(req.validees.params.code, req.utilisateur.id, req.validees.body)); }
export async function monAbonnement(req, res) { return envoyerSucces(res, await service.obtenirMonAbonnement(req.utilisateur.id)); }
export async function abonnements(_req, res) { return envoyerSucces(res, await service.listerAbonnements()); }
