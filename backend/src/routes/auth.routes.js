import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { actualiser, connexion, deconnexion, inscription } from '../controllers/auth.controller.js';
import { valider } from '../middlewares/validation.middleware.js';
import {
  schemaConnexion,
  schemaInscription,
} from '../schemas/auth.schema.js';
import { gestionnaireAsync } from '../utils/gestionnaire-async.js';

export const routeAuthentification = Router();

const limiteAuthentification = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { succes: false, erreur: { message: 'Trop de tentatives. Réessayez plus tard.' } },
});
const limiteSession = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  message: { succes: false, erreur: { message: 'Trop d’actualisations de session. Réessayez plus tard.' } },
});

routeAuthentification.post('/inscription', limiteAuthentification, valider(schemaInscription), gestionnaireAsync(inscription));
routeAuthentification.post('/connexion', limiteAuthentification, valider(schemaConnexion), gestionnaireAsync(connexion));
routeAuthentification.post('/actualiser', limiteSession, gestionnaireAsync(actualiser));
routeAuthentification.post('/deconnexion', limiteSession, gestionnaireAsync(deconnexion));
