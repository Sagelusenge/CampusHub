import { Router } from 'express';
import * as c from '../controllers/moderation.controller.js';
import { authentifier, autoriserRoles } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import { schemaCodeSignalement, schemaListeSignalements, schemaSignalement, schemaTraitementSignalement } from '../schemas/moderation.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeModeration = Router();
routeModeration.post('/signalements', authentifier, valider(schemaSignalement), ga(c.signaler));
routeModeration.get('/signalements', authentifier, autoriserRoles('ADMINISTRATEUR'), valider(schemaListeSignalements, 'query'), ga(c.lister));
routeModeration.patch('/signalements/:code', authentifier, autoriserRoles('ADMINISTRATEUR'), valider(schemaCodeSignalement, 'params'), valider(schemaTraitementSignalement), ga(c.traiter));
