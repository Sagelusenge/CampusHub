import { Router } from 'express';
import { afficher, creer, lister } from '../controllers/universites.controller.js';
import { authentifier, autoriserRoles } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import {
  schemaCodeUniversite,
  schemaCreationUniversite,
  schemaRechercheUniversites,
} from '../schemas/universite.schema.js';
import { gestionnaireAsync } from '../utils/gestionnaire-async.js';

export const routeUniversites = Router();

routeUniversites.get('/', valider(schemaRechercheUniversites, 'query'), gestionnaireAsync(lister));
routeUniversites.get('/:code', valider(schemaCodeUniversite, 'params'), gestionnaireAsync(afficher));
routeUniversites.post(
  '/',
  authentifier,
  autoriserRoles('ADMINISTRATEUR', 'UNIVERSITE'),
  valider(schemaCreationUniversite),
  gestionnaireAsync(creer),
);
