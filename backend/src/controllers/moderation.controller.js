import * as service from '../services/moderation.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export const signaler = async (r, s) => envoyerSucces(s, await service.creerSignalement(r.utilisateur.id, r.validees.body), 201);
export async function lister(r, s) { const x = await service.listerSignalements(r.validees.query); return envoyerSucces(s, x.signalements, 200, x.meta); }
export const traiter = async (r, s) => envoyerSucces(s, await service.traiterSignalement(r.validees.params.code, r.utilisateur.id, r.validees.body));
