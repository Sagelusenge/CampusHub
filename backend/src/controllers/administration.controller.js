import * as service from '../services/administration.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export const tableauDeBord = async (_r, s) => envoyerSucces(s, await service.tableauDeBord());
export async function audit(r, s) { const x = await service.listerAudit(r.validees.query); return envoyerSucces(s, x.entrees, 200, x.meta); }
export const verifierUniversite = async (r, s) => envoyerSucces(s, await service.verifierUniversite(r.validees.params.code, r.validees.body.statut));
