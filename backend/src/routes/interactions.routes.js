import { Router } from 'express';
import * as c from '../controllers/interactions.controller.js';
import { authentifier } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import { schemaCode } from '../schemas/catalogue.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeInteractions = Router();
routeInteractions.use(authentifier);
routeInteractions.post('/publications/:code/jaime', valider(schemaCode, 'params'), ga(c.basculerJaime));
routeInteractions.get('/favoris', ga(c.listerFavoris));
routeInteractions.post('/publications/:code/favori', valider(schemaCode, 'params'), ga(c.ajouterFavori));
routeInteractions.delete('/publications/:code/favori', valider(schemaCode, 'params'), ga(c.retirerFavori));
routeInteractions.get('/universites-suivies', ga(c.listerUniversitesSuivies));
routeInteractions.post('/universites/:code/suivre', valider(schemaCode, 'params'), ga(c.suivreUniversite));
routeInteractions.delete('/universites/:code/suivre', valider(schemaCode, 'params'), ga(c.nePlusSuivreUniversite));
