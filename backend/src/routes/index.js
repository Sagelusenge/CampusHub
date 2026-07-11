import { Router } from 'express';
import { routeAuthentification } from './auth.routes.js';
import { routeSante } from './sante.routes.js';
import { routeUniversites } from './universites.routes.js';

export const routesApi = Router();

routesApi.use('/sante', routeSante);
routesApi.use('/auth', routeAuthentification);
routesApi.use('/universites', routeUniversites);
