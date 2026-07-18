import { Router } from 'express';
import * as controller from '../controllers/orientation.controller.js';
import { authentifier } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import { schemaAnalyseBulletin, schemaCodeDossier, schemaOrientation } from '../schemas/orientation.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeOrientation = Router();
routeOrientation.use(authentifier);
routeOrientation.get('/configuration', controller.configuration);
routeOrientation.get('/dossiers', ga(controller.dossiers));
routeOrientation.get('/dossiers/:code', valider(schemaCodeDossier, 'params'), ga(controller.dossier));
routeOrientation.post('/analyser-bulletin', valider(schemaAnalyseBulletin), ga(controller.analyser));
routeOrientation.post('/recommandations', valider(schemaOrientation), ga(controller.recommander));
