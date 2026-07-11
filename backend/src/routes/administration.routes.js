import { Router } from 'express';
import * as c from '../controllers/administration.controller.js';
import { authentifier, autoriserRoles } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import { schemaAudit, schemaCodeUniversiteAdmin, schemaVerificationUniversite } from '../schemas/administration.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeAdministration = Router();
routeAdministration.use(authentifier, autoriserRoles('ADMINISTRATEUR'));
routeAdministration.get('/tableau-de-bord', ga(c.tableauDeBord));
routeAdministration.get('/audit', valider(schemaAudit, 'query'), ga(c.audit));
routeAdministration.patch('/universites/:code/verification', valider(schemaCodeUniversiteAdmin, 'params'), valider(schemaVerificationUniversite), ga(c.verifierUniversite));
