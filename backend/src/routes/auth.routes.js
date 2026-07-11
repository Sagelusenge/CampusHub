import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { connexion, inscription } from '../controllers/auth.controller.js';
import { valider } from '../middlewares/validation.middleware.js';
import { schemaConnexion, schemaInscription } from '../schemas/auth.schema.js';
import { gestionnaireAsync } from '../utils/gestionnaire-async.js';

export const routeAuthentification = Router();

const limiteAuthentification = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { succes: false, erreur: { message: 'Trop de tentatives. Réessayez plus tard.' } },
});

routeAuthentification.use(limiteAuthentification);
routeAuthentification.post('/inscription', valider(schemaInscription), gestionnaireAsync(inscription));
routeAuthentification.post('/connexion', valider(schemaConnexion), gestionnaireAsync(connexion));
