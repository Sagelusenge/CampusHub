import { Router } from 'express';
import * as c from '../controllers/notifications.controller.js';
import { authentifier } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import {
  schemaAbonnementPush,
  schemaCodeNotification,
  schemaDesabonnementPush,
  schemaListeNotifications,
} from '../schemas/notification.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeNotifications = Router();
routeNotifications.use(authentifier);
routeNotifications.get('/push/configuration', ga(c.obtenirConfigurationPush));
routeNotifications.post('/push/abonnement', valider(schemaAbonnementPush, 'body'), ga(c.abonnerPush));
routeNotifications.delete('/push/abonnement', valider(schemaDesabonnementPush, 'body'), ga(c.desabonnerPush));
routeNotifications.get('/', valider(schemaListeNotifications, 'query'), ga(c.lister));
routeNotifications.patch('/tout-lire', ga(c.marquerToutesLues));
routeNotifications.patch('/:code/lire', valider(schemaCodeNotification, 'params'), ga(c.marquerLue));
routeNotifications.delete('/:code', valider(schemaCodeNotification, 'params'), ga(c.supprimer));
