import { Router } from 'express';
import * as controller from '../controllers/copilote-institution.controller.js';
import { authentifier, autoriserRoles } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import { schemaGenerationCopilote } from '../schemas/copilote-institution.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeCopiloteInstitution = Router();
routeCopiloteInstitution.use(authentifier, autoriserRoles('UNIVERSITE'));
routeCopiloteInstitution.get('/configuration', ga(controller.configuration));
routeCopiloteInstitution.get('/contexte', ga(controller.contexte));
routeCopiloteInstitution.get('/historique', ga(controller.historique));
routeCopiloteInstitution.post('/generer', valider(schemaGenerationCopilote), ga(controller.generer));
