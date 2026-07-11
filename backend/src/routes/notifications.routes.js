import { Router } from 'express';
import * as c from '../controllers/notifications.controller.js';
import { authentifier } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import { schemaCodeNotification, schemaListeNotifications } from '../schemas/notification.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeNotifications = Router();
routeNotifications.use(authentifier);
routeNotifications.get('/', valider(schemaListeNotifications, 'query'), ga(c.lister));
routeNotifications.patch('/tout-lire', ga(c.marquerToutesLues));
routeNotifications.patch('/:code/lire', valider(schemaCodeNotification, 'params'), ga(c.marquerLue));
routeNotifications.delete('/:code', valider(schemaCodeNotification, 'params'), ga(c.supprimer));
