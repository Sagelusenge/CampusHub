import * as service from '../services/communaute.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function suggestions(req, res) { return envoyerSucces(res, await service.suggestionsRelations(req.utilisateur.id, req.validees.query.recherche)); }
export async function invitations(req, res) { return envoyerSucces(res, await service.invitationsRelations(req.utilisateur.id)); }
export async function relations(req, res) { return envoyerSucces(res, await service.listerRelations(req.utilisateur.id)); }
export async function inviter(req, res) { return envoyerSucces(res, await service.inviterRelation(req.utilisateur, req.validees.body), 201); }
export async function repondre(req, res) { return envoyerSucces(res, await service.repondreInvitation(req.utilisateur.id, req.validees.params.code, req.validees.body.statut)); }
export async function retirer(req, res) { return envoyerSucces(res, await service.retirerRelation(req.utilisateur.id, req.validees.params.codeUtilisateur)); }
export async function formulairePublic(req, res) { return envoyerSucces(res, await service.obtenirFormulairePublic(req.validees.params.codeUniversite)); }
export async function formulaireGestionnaire(req, res) { return envoyerSucces(res, await service.obtenirFormulaireGestionnaire(req.utilisateur.id)); }
export async function enregistrerFormulaire(req, res) { return envoyerSucces(res, await service.enregistrerFormulaire(req.utilisateur.id, req.validees.body)); }
export async function soumettreInscription(req, res) { return envoyerSucces(res, await service.soumettreInscription(req.utilisateur, req.validees.params.codeUniversite, req.validees.body.reponses), 201); }
export async function demandesInscription(req, res) { return envoyerSucces(res, await service.listerDemandesGestionnaire(req.utilisateur.id)); }
export async function traiterInscription(req, res) { return envoyerSucces(res, await service.traiterInscription(req.utilisateur.id, req.validees.params.code, req.validees.body)); }
export async function partenairesPublics(req, res) { return envoyerSucces(res, await service.listerPartenairesPublics(req.validees.params.codeUniversite)); }
export async function partenairesGestionnaire(req, res) { return envoyerSucces(res, await service.listerPartenairesGestionnaire(req.utilisateur.id)); }
export async function creerPartenaire(req, res) { return envoyerSucces(res, await service.creerPartenaire(req.utilisateur.id, req.validees.body), 201); }
export async function supprimerPartenaire(req, res) { return envoyerSucces(res, await service.supprimerPartenaire(req.utilisateur.id, req.validees.params.code)); }
