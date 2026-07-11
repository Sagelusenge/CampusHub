import { Router } from 'express';
import * as c from '../controllers/catalogue.controller.js';
import { authentifier, autoriserRoles } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import {
  schemaCampus, schemaCampusModification, schemaCode, schemaCondition, schemaConditionModification,
  schemaDeuxCodes, schemaFaculte, schemaFaculteModification, schemaFiliere, schemaFiliereModification,
  schemaInfrastructure, schemaInfrastructureModification, schemaMembre, schemaService, schemaServiceModification,
} from '../schemas/catalogue.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeCatalogue = Router();
const gestionnaire = [authentifier, autoriserRoles('ADMINISTRATEUR', 'UNIVERSITE')];

routeCatalogue.get('/universites/:code/campus', valider(schemaCode, 'params'), ga(c.listerCampus));
routeCatalogue.post('/universites/:code/campus', ...gestionnaire, valider(schemaCode, 'params'), valider(schemaCampus), ga(c.creerCampus));
routeCatalogue.patch('/campus/:code', ...gestionnaire, valider(schemaCode, 'params'), valider(schemaCampusModification), ga(c.modifierCampus));
routeCatalogue.delete('/campus/:code', ...gestionnaire, valider(schemaCode, 'params'), ga(c.supprimerCampus));

routeCatalogue.get('/universites/:code/facultes', valider(schemaCode, 'params'), ga(c.listerFacultes));
routeCatalogue.post('/universites/:code/facultes', ...gestionnaire, valider(schemaCode, 'params'), valider(schemaFaculte), ga(c.creerFaculte));
routeCatalogue.patch('/facultes/:code', ...gestionnaire, valider(schemaCode, 'params'), valider(schemaFaculteModification), ga(c.modifierFaculte));
routeCatalogue.delete('/facultes/:code', ...gestionnaire, valider(schemaCode, 'params'), ga(c.supprimerFaculte));

routeCatalogue.get('/facultes/:code/filieres', valider(schemaCode, 'params'), ga(c.listerFilieres));
routeCatalogue.post('/facultes/:code/filieres', ...gestionnaire, valider(schemaCode, 'params'), valider(schemaFiliere), ga(c.creerFiliere));
routeCatalogue.patch('/filieres/:code', ...gestionnaire, valider(schemaCode, 'params'), valider(schemaFiliereModification), ga(c.modifierFiliere));
routeCatalogue.delete('/filieres/:code', ...gestionnaire, valider(schemaCode, 'params'), ga(c.supprimerFiliere));
routeCatalogue.post('/campus/:codeCampus/filieres/:codeFiliere', ...gestionnaire, valider(schemaDeuxCodes, 'params'), ga(c.associerFiliere));
routeCatalogue.delete('/campus/:codeCampus/filieres/:codeFiliere', ...gestionnaire, valider(schemaDeuxCodes, 'params'), ga(c.dissocierFiliere));

routeCatalogue.get('/universites/:code/services', valider(schemaCode, 'params'), ga(c.listerServices));
routeCatalogue.post('/universites/:code/services', ...gestionnaire, valider(schemaCode, 'params'), valider(schemaService), ga(c.creerService));
routeCatalogue.patch('/services/:code', ...gestionnaire, valider(schemaCode, 'params'), valider(schemaServiceModification), ga(c.modifierService));
routeCatalogue.delete('/services/:code', ...gestionnaire, valider(schemaCode, 'params'), ga(c.supprimerService));

routeCatalogue.get('/universites/:code/infrastructures', valider(schemaCode, 'params'), ga(c.listerInfrastructures));
routeCatalogue.post('/universites/:code/infrastructures', ...gestionnaire, valider(schemaCode, 'params'), valider(schemaInfrastructure), ga(c.creerInfrastructure));
routeCatalogue.patch('/infrastructures/:code', ...gestionnaire, valider(schemaCode, 'params'), valider(schemaInfrastructureModification), ga(c.modifierInfrastructure));
routeCatalogue.delete('/infrastructures/:code', ...gestionnaire, valider(schemaCode, 'params'), ga(c.supprimerInfrastructure));

routeCatalogue.get('/universites/:code/conditions-admission', valider(schemaCode, 'params'), ga(c.listerConditions));
routeCatalogue.post('/universites/:code/conditions-admission', ...gestionnaire, valider(schemaCode, 'params'), valider(schemaCondition), ga(c.creerCondition));
routeCatalogue.patch('/conditions-admission/:code', ...gestionnaire, valider(schemaCode, 'params'), valider(schemaConditionModification), ga(c.modifierCondition));
routeCatalogue.delete('/conditions-admission/:code', ...gestionnaire, valider(schemaCode, 'params'), ga(c.supprimerCondition));

routeCatalogue.get('/universites/:code/membres', ...gestionnaire, valider(schemaCode, 'params'), ga(c.listerMembres));
routeCatalogue.post('/universites/:code/membres', ...gestionnaire, valider(schemaCode, 'params'), valider(schemaMembre), ga(c.ajouterMembre));
routeCatalogue.delete('/membres/:code', ...gestionnaire, valider(schemaCode, 'params'), ga(c.retirerMembre));
