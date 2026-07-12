import { Router } from 'express';
import * as c from '../controllers/affiliations.controller.js';
import { authentifier, autoriserRoles } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import { schemaCodeAffiliation, schemaCreationAffiliation, schemaTraitementAffiliation } from '../schemas/affiliation.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeAffiliations = Router();
routeAffiliations.use(authentifier);
routeAffiliations.post('/', autoriserRoles('ETUDIANT'), valider(schemaCreationAffiliation), ga(c.creer));
routeAffiliations.get('/moi', autoriserRoles('ETUDIANT'), ga(c.mesDemandes));
routeAffiliations.get('/universite', autoriserRoles('UNIVERSITE'), ga(c.demandesUniversite));
routeAffiliations.patch('/:code', autoriserRoles('UNIVERSITE'), valider(schemaCodeAffiliation, 'params'), valider(schemaTraitementAffiliation), ga(c.traiter));
