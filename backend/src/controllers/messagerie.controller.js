import * as service from '../services/messagerie.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function contacts(req, res) { return envoyerSucces(res, await service.rechercherContacts(req.utilisateur.id, req.validees.query.recherche)); }
export async function conversations(req, res) { return envoyerSucces(res, await service.listerConversations(req.utilisateur.id)); }
export async function creer(req, res) { return envoyerSucces(res, await service.creerConversation(req.utilisateur.id, req.validees.body.codeDestinataire), 201); }
export async function messages(req, res) { return envoyerSucces(res, await service.listerMessages(req.validees.params.code, req.utilisateur.id)); }
export async function envoyer(req, res) { return envoyerSucces(res, await service.envoyerMessage(req.validees.params.code, req.utilisateur, req.validees.body), 201); }
