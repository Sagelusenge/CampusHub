import { Router } from 'express';
import * as controller from '../controllers/offres.controller.js';
import { authentifier, autoriserRoles } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import {
  schemaCodeOffre, schemaCreationOffre, schemaListeMesOffres,
  schemaListeOffres, schemaModificationOffre,
} from '../schemas/offre.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeOffres = Router();

routeOffres.get('/', valider(schemaListeOffres, 'query'), ga(controller.lister));
routeOffres.get('/moi', authentifier, autoriserRoles('UNIVERSITE'), valider(schemaListeMesOffres, 'query'), ga(controller.listerMiennes));
routeOffres.post('/', authentifier, autoriserRoles('UNIVERSITE', 'ADMINISTRATEUR'), valider(schemaCreationOffre), ga(controller.creer));
routeOffres.get('/:code', valider(schemaCodeOffre, 'params'), ga(controller.afficher));
routeOffres.patch('/:code', authentifier, autoriserRoles('UNIVERSITE', 'ADMINISTRATEUR'), valider(schemaCodeOffre, 'params'), valider(schemaModificationOffre), ga(controller.modifier));
routeOffres.delete('/:code', authentifier, autoriserRoles('UNIVERSITE', 'ADMINISTRATEUR'), valider(schemaCodeOffre, 'params'), ga(controller.retirer));
