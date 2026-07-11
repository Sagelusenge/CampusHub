import { Router } from 'express';
import { routeAuthentification } from './auth.routes.js';
import { routeAdministration } from './administration.routes.js';
import { routeCatalogue } from './catalogue.routes.js';
import { routeInteractions } from './interactions.routes.js';
import { routeModeration } from './moderation.routes.js';
import { routeNotifications } from './notifications.routes.js';
import { routeProfils } from './profils.routes.js';
import { routePublications } from './publications.routes.js';
import { routeSante } from './sante.routes.js';
import { routeUniversites } from './universites.routes.js';
import { routeUtilisateurs } from './utilisateurs.routes.js';

export const routesApi = Router();

routesApi.use('/sante', routeSante);
routesApi.use('/auth', routeAuthentification);
routesApi.use('/universites', routeUniversites);
routesApi.use('/utilisateurs', routeUtilisateurs);
routesApi.use('/profils', routeProfils);
routesApi.use('/catalogue', routeCatalogue);
routesApi.use('/publications', routePublications);
routesApi.use('/interactions', routeInteractions);
routesApi.use('/moderation', routeModeration);
routesApi.use('/notifications', routeNotifications);
routesApi.use('/administration', routeAdministration);
