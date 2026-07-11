import * as service from '../services/catalogue.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export const listerCampus = async (r, s) => envoyerSucces(s, await service.listerCampus(r.validees.params.code));
export const creerCampus = async (r, s) => envoyerSucces(s, await service.creerCampus(r.validees.params.code, r.validees.body, r.utilisateur), 201);
export const modifierCampus = async (r, s) => envoyerSucces(s, await service.modifierCampus(r.validees.params.code, r.validees.body, r.utilisateur));
export const supprimerCampus = async (r, s) => envoyerSucces(s, await service.supprimerCampus(r.validees.params.code, r.utilisateur));

export const listerFacultes = async (r, s) => envoyerSucces(s, await service.listerFacultes(r.validees.params.code));
export const creerFaculte = async (r, s) => envoyerSucces(s, await service.creerFaculte(r.validees.params.code, r.validees.body, r.utilisateur), 201);
export const modifierFaculte = async (r, s) => envoyerSucces(s, await service.modifierFaculte(r.validees.params.code, r.validees.body, r.utilisateur));
export const supprimerFaculte = async (r, s) => envoyerSucces(s, await service.supprimerFaculte(r.validees.params.code, r.utilisateur));

export const listerFilieres = async (r, s) => envoyerSucces(s, await service.listerFilieres(r.validees.params.code));
export const creerFiliere = async (r, s) => envoyerSucces(s, await service.creerFiliere(r.validees.params.code, r.validees.body, r.utilisateur), 201);
export const modifierFiliere = async (r, s) => envoyerSucces(s, await service.modifierFiliere(r.validees.params.code, r.validees.body, r.utilisateur));
export const supprimerFiliere = async (r, s) => envoyerSucces(s, await service.supprimerFiliere(r.validees.params.code, r.utilisateur));
export const associerFiliere = async (r, s) => envoyerSucces(s, await service.associerFiliereCampus(r.validees.params.codeCampus, r.validees.params.codeFiliere, r.utilisateur));
export const dissocierFiliere = async (r, s) => envoyerSucces(s, await service.dissocierFiliereCampus(r.validees.params.codeCampus, r.validees.params.codeFiliere, r.utilisateur));

export const listerServices = async (r, s) => envoyerSucces(s, await service.listerServices(r.validees.params.code));
export const creerService = async (r, s) => envoyerSucces(s, await service.creerService(r.validees.params.code, r.validees.body, r.utilisateur), 201);
export const modifierService = async (r, s) => envoyerSucces(s, await service.modifierService(r.validees.params.code, r.validees.body, r.utilisateur));
export const supprimerService = async (r, s) => envoyerSucces(s, await service.supprimerService(r.validees.params.code, r.utilisateur));

export const listerInfrastructures = async (r, s) => envoyerSucces(s, await service.listerInfrastructures(r.validees.params.code));
export const creerInfrastructure = async (r, s) => envoyerSucces(s, await service.creerInfrastructure(r.validees.params.code, r.validees.body, r.utilisateur), 201);
export const modifierInfrastructure = async (r, s) => envoyerSucces(s, await service.modifierInfrastructure(r.validees.params.code, r.validees.body, r.utilisateur));
export const supprimerInfrastructure = async (r, s) => envoyerSucces(s, await service.supprimerInfrastructure(r.validees.params.code, r.utilisateur));

export const listerConditions = async (r, s) => envoyerSucces(s, await service.listerConditions(r.validees.params.code));
export const creerCondition = async (r, s) => envoyerSucces(s, await service.creerCondition(r.validees.params.code, r.validees.body, r.utilisateur), 201);
export const modifierCondition = async (r, s) => envoyerSucces(s, await service.modifierCondition(r.validees.params.code, r.validees.body, r.utilisateur));
export const supprimerCondition = async (r, s) => envoyerSucces(s, await service.supprimerCondition(r.validees.params.code, r.utilisateur));

export const listerMembres = async (r, s) => envoyerSucces(s, await service.listerMembres(r.validees.params.code, r.utilisateur));
export const ajouterMembre = async (r, s) => envoyerSucces(s, await service.ajouterMembre(r.validees.params.code, r.validees.body, r.utilisateur), 201);
export const retirerMembre = async (r, s) => envoyerSucces(s, await service.retirerMembre(r.validees.params.code, r.utilisateur));
