import { Router } from 'express';
import { afficher, comparer, creer, lister, maFiche, modifier, statistiques, supprimer } from '../controllers/universites.controller.js';
import { authentifier, autoriserRoles } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import {
  schemaCodeUniversite,
  schemaComparaisonUniversites,
  schemaCreationUniversite,
  schemaModificationUniversite,
  schemaRechercheUniversites,
} from '../schemas/universite.schema.js';
import { gestionnaireAsync } from '../utils/gestionnaire-async.js';

export const routeUniversites = Router();

routeUniversites.get('/', valider(schemaRechercheUniversites, 'query'), gestionnaireAsync(lister));
routeUniversites.get('/comparer', valider(schemaComparaisonUniversites, 'query'), gestionnaireAsync(comparer));
routeUniversites.get('/moi', authentifier, autoriserRoles('UNIVERSITE'), gestionnaireAsync(maFiche));
routeUniversites.get('/:code/statistiques', valider(schemaCodeUniversite, 'params'), gestionnaireAsync(statistiques));
routeUniversites.get('/:code', valider(schemaCodeUniversite, 'params'), gestionnaireAsync(afficher));
routeUniversites.post(
  '/',
  authentifier,
  autoriserRoles('ADMINISTRATEUR', 'UNIVERSITE'),
  valider(schemaCreationUniversite),
  gestionnaireAsync(creer),
);
routeUniversites.patch('/:code', authentifier, autoriserRoles('ADMINISTRATEUR', 'UNIVERSITE'), valider(schemaCodeUniversite, 'params'), valider(schemaModificationUniversite), gestionnaireAsync(modifier));
routeUniversites.delete('/:code', authentifier, autoriserRoles('ADMINISTRATEUR'), valider(schemaCodeUniversite, 'params'), gestionnaireAsync(supprimer));
