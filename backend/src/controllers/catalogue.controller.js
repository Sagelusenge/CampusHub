import * as catalogueService from '../services/catalogue.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

// ---------- Campus ----------

// GET /api/v1/catalogue/universites/:code/campus
export async function listerCampus(requete, reponse) {
  const { code } = requete.validees.params;
  const campus = await catalogueService.listerCampus(code);
  return envoyerSucces(reponse, campus, 200, undefined, 'Campus chargés.');
}

// POST /api/v1/catalogue/universites/:code/campus
export async function creerCampus(requete, reponse) {
  const { code } = requete.validees.params;
  const donneesCampus = requete.validees.body;
  const campus = await catalogueService.creerCampus(code, donneesCampus, requete.utilisateur);
  return envoyerSucces(reponse, campus, 201, undefined, 'Campus créé.');
}

// PATCH /api/v1/catalogue/campus/:code
export async function modifierCampus(requete, reponse) {
  const { code } = requete.validees.params;
  const modifications = requete.validees.body;
  const campus = await catalogueService.modifierCampus(code, modifications, requete.utilisateur);
  return envoyerSucces(reponse, campus, 200, undefined, 'Campus mis à jour.');
}

// DELETE /api/v1/catalogue/campus/:code
export async function supprimerCampus(requete, reponse) {
  const { code } = requete.validees.params;
  const resultat = await catalogueService.supprimerCampus(code, requete.utilisateur);
  return envoyerSucces(reponse, resultat, 200, undefined, 'Campus supprimé.');
}

// ---------- Facultés ----------

export async function listerFacultes(requete, reponse) {
  const { code } = requete.validees.params;
  const facultes = await catalogueService.listerFacultes(code);
  return envoyerSucces(reponse, facultes, 200, undefined, 'Facultés chargées.');
}

export async function creerFaculte(requete, reponse) {
  const { code } = requete.validees.params;
  const donneesFaculte = requete.validees.body;
  const faculte = await catalogueService.creerFaculte(code, donneesFaculte, requete.utilisateur);
  return envoyerSucces(reponse, faculte, 201, undefined, 'Faculté créée.');
}

export async function modifierFaculte(requete, reponse) {
  const { code } = requete.validees.params;
  const faculte = await catalogueService.modifierFaculte(
    code,
    requete.validees.body,
    requete.utilisateur,
  );
  return envoyerSucces(reponse, faculte, 200, undefined, 'Faculté mise à jour.');
}

export async function supprimerFaculte(requete, reponse) {
  const { code } = requete.validees.params;
  const resultat = await catalogueService.supprimerFaculte(code, requete.utilisateur);
  return envoyerSucces(reponse, resultat, 200, undefined, 'Faculté supprimée.');
}

// ---------- Filières ----------

export async function listerFilieres(requete, reponse) {
  const { code } = requete.validees.params;
  const filieres = await catalogueService.listerFilieres(code);
  return envoyerSucces(reponse, filieres, 200, undefined, 'Filières chargées.');
}

export async function creerFiliere(requete, reponse) {
  const { code } = requete.validees.params;
  const donneesFiliere = requete.validees.body;
  const filiere = await catalogueService.creerFiliere(code, donneesFiliere, requete.utilisateur);
  return envoyerSucces(reponse, filiere, 201, undefined, 'Filière créée.');
}

export async function modifierFiliere(requete, reponse) {
  const { code } = requete.validees.params;
  const filiere = await catalogueService.modifierFiliere(
    code,
    requete.validees.body,
    requete.utilisateur,
  );
  return envoyerSucces(reponse, filiere, 200, undefined, 'Filière mise à jour.');
}

export async function supprimerFiliere(requete, reponse) {
  const { code } = requete.validees.params;
  const resultat = await catalogueService.supprimerFiliere(code, requete.utilisateur);
  return envoyerSucces(reponse, resultat, 200, undefined, 'Filière supprimée.');
}

export async function associerFiliere(requete, reponse) {
  const { codeCampus, codeFiliere } = requete.validees.params;
  const resultat = await catalogueService.associerFiliereCampus(
    codeCampus,
    codeFiliere,
    requete.utilisateur,
  );
  return envoyerSucces(reponse, resultat, 200, undefined, 'Filière associée au campus.');
}

export async function dissocierFiliere(requete, reponse) {
  const { codeCampus, codeFiliere } = requete.validees.params;
  const resultat = await catalogueService.dissocierFiliereCampus(
    codeCampus,
    codeFiliere,
    requete.utilisateur,
  );
  return envoyerSucces(reponse, resultat, 200, undefined, 'Filière retirée du campus.');
}

// ---------- Services universitaires ----------

export async function listerServices(requete, reponse) {
  const { code } = requete.validees.params;
  const services = await catalogueService.listerServices(code);
  return envoyerSucces(reponse, services, 200, undefined, 'Services universitaires chargés.');
}

export async function creerService(requete, reponse) {
  const { code } = requete.validees.params;
  const service = await catalogueService.creerService(
    code,
    requete.validees.body,
    requete.utilisateur,
  );
  return envoyerSucces(reponse, service, 201, undefined, 'Service universitaire créé.');
}

export async function modifierService(requete, reponse) {
  const { code } = requete.validees.params;
  const service = await catalogueService.modifierService(
    code,
    requete.validees.body,
    requete.utilisateur,
  );
  return envoyerSucces(reponse, service, 200, undefined, 'Service universitaire mis à jour.');
}

export async function supprimerService(requete, reponse) {
  const { code } = requete.validees.params;
  const resultat = await catalogueService.supprimerService(code, requete.utilisateur);
  return envoyerSucces(reponse, resultat, 200, undefined, 'Service universitaire supprimé.');
}

// ---------- Infrastructures ----------

export async function listerInfrastructures(requete, reponse) {
  const { code } = requete.validees.params;
  const infrastructures = await catalogueService.listerInfrastructures(code);
  return envoyerSucces(reponse, infrastructures, 200, undefined, 'Infrastructures chargées.');
}

export async function creerInfrastructure(requete, reponse) {
  const { code } = requete.validees.params;
  const infrastructure = await catalogueService.creerInfrastructure(
    code,
    requete.validees.body,
    requete.utilisateur,
  );
  return envoyerSucces(reponse, infrastructure, 201, undefined, 'Infrastructure créée.');
}

export async function modifierInfrastructure(requete, reponse) {
  const { code } = requete.validees.params;
  const infrastructure = await catalogueService.modifierInfrastructure(
    code,
    requete.validees.body,
    requete.utilisateur,
  );
  return envoyerSucces(reponse, infrastructure, 200, undefined, 'Infrastructure mise à jour.');
}

export async function supprimerInfrastructure(requete, reponse) {
  const { code } = requete.validees.params;
  const resultat = await catalogueService.supprimerInfrastructure(code, requete.utilisateur);
  return envoyerSucces(reponse, resultat, 200, undefined, 'Infrastructure supprimée.');
}

// ---------- Conditions d’admission ----------

export async function listerConditions(requete, reponse) {
  const { code } = requete.validees.params;
  const conditions = await catalogueService.listerConditions(code);
  return envoyerSucces(reponse, conditions, 200, undefined, 'Conditions d’admission chargées.');
}

export async function creerCondition(requete, reponse) {
  const { code } = requete.validees.params;
  const condition = await catalogueService.creerCondition(
    code,
    requete.validees.body,
    requete.utilisateur,
  );
  return envoyerSucces(reponse, condition, 201, undefined, 'Condition d’admission créée.');
}

export async function modifierCondition(requete, reponse) {
  const { code } = requete.validees.params;
  const condition = await catalogueService.modifierCondition(
    code,
    requete.validees.body,
    requete.utilisateur,
  );
  return envoyerSucces(reponse, condition, 200, undefined, 'Condition d’admission mise à jour.');
}

export async function supprimerCondition(requete, reponse) {
  const { code } = requete.validees.params;
  const resultat = await catalogueService.supprimerCondition(code, requete.utilisateur);
  return envoyerSucces(reponse, resultat, 200, undefined, 'Condition d’admission supprimée.');
}

// ---------- Membres institutionnels ----------

export async function listerMembres(requete, reponse) {
  const { code } = requete.validees.params;
  const membres = await catalogueService.listerMembres(code, requete.utilisateur);
  return envoyerSucces(reponse, membres, 200, undefined, 'Membres institutionnels chargés.');
}

export async function ajouterMembre(requete, reponse) {
  const { code } = requete.validees.params;
  const membre = await catalogueService.ajouterMembre(
    code,
    requete.validees.body,
    requete.utilisateur,
  );
  return envoyerSucces(reponse, membre, 201, undefined, 'Membre institutionnel ajouté.');
}

export async function retirerMembre(requete, reponse) {
  const { code } = requete.validees.params;
  const resultat = await catalogueService.retirerMembre(code, requete.utilisateur);
  return envoyerSucces(reponse, resultat, 200, undefined, 'Membre institutionnel retiré.');
}
