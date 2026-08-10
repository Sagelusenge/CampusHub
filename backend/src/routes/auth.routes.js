import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  actualiser, confirmerEmail, connexion, deconnexion, inscription, renvoyerCodeEmail,
} from '../controllers/auth.controller.js';
import { valider } from '../middlewares/validation.middleware.js';
import {
  schemaConnexion,
  schemaConfirmationEmail,
  schemaInscription,
  schemaRenvoiCodeEmail,
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
const limiteVerification = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  message: { succes: false, erreur: { message: 'Trop de tentatives de confirmation. Réessayez plus tard.' } },
});

routeAuthentification.post('/inscription', limiteAuthentification, valider(schemaInscription), gestionnaireAsync(inscription));
routeAuthentification.post('/connexion', limiteAuthentification, valider(schemaConnexion), gestionnaireAsync(connexion));
routeAuthentification.post('/verification-email/confirmer', limiteVerification, valider(schemaConfirmationEmail), gestionnaireAsync(confirmerEmail));
routeAuthentification.post('/verification-email/renvoyer', limiteVerification, valider(schemaRenvoiCodeEmail), gestionnaireAsync(renvoyerCodeEmail));
routeAuthentification.post('/actualiser', limiteSession, gestionnaireAsync(actualiser));
routeAuthentification.post('/deconnexion', limiteSession, gestionnaireAsync(deconnexion));
