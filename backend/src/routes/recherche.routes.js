import { Router } from 'express';
import * as c from '../controllers/recherche.controller.js';
import { authentifier } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import { schemaRecherche } from '../schemas/recherche.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeRecherche = Router();
routeRecherche.use(authentifier);
routeRecherche.get('/globale', valider(schemaRecherche, 'query'), ga(c.globale));
routeRecherche.get('/recommandations', ga(c.recommandations));
