import { Router } from 'express';
import * as c from '../controllers/contact.controller.js';
import { authentifier, autoriserRoles } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import { schemaCodeContact, schemaContact, schemaFiltreContact, schemaTraitementContact } from '../schemas/contact.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeContact = Router();
routeContact.post('/', valider(schemaContact), ga(c.creer));
routeContact.get('/administration', authentifier, autoriserRoles('ADMINISTRATEUR'), valider(schemaFiltreContact, 'query'), ga(c.lister));
routeContact.patch('/administration/:code', authentifier, autoriserRoles('ADMINISTRATEUR'), valider(schemaCodeContact, 'params'), valider(schemaTraitementContact), ga(c.traiter));
