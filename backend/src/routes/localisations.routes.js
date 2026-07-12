import { Router } from 'express';
import * as c from '../controllers/localisations.controller.js';
import { authentifier, autoriserRoles } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import { schemaCodeSuggestion, schemaSuggestionLocalisation, schemaTraitementSuggestion } from '../schemas/localisation.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeLocalisations = Router();
routeLocalisations.post('/suggestions', valider(schemaSuggestionLocalisation), ga(c.suggerer));
routeLocalisations.get('/suggestions', authentifier, autoriserRoles('ADMINISTRATEUR'), ga(c.lister));
routeLocalisations.patch('/suggestions/:code', authentifier, autoriserRoles('ADMINISTRATEUR'), valider(schemaCodeSuggestion, 'params'), valider(schemaTraitementSuggestion), ga(c.traiter));
