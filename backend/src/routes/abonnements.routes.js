import { Router } from 'express';
import * as c from '../controllers/abonnements.controller.js';
import { authentifier, autoriserRoles } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import { schemaCodePaiement, schemaListePaiements, schemaPaiementAbonnement, schemaTraitementPaiement } from '../schemas/abonnement.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeAbonnements = Router();
routeAbonnements.get('/plans', ga(c.plans));
routeAbonnements.post('/paiements', valider(schemaPaiementAbonnement), ga(c.soumettre));
routeAbonnements.get('/moi', authentifier, autoriserRoles('UNIVERSITE'), ga(c.monAbonnement));
routeAbonnements.get('/paiements', authentifier, autoriserRoles('ADMINISTRATEUR'), valider(schemaListePaiements, 'query'), ga(c.paiements));
routeAbonnements.patch('/paiements/:code', authentifier, autoriserRoles('ADMINISTRATEUR'), valider(schemaCodePaiement, 'params'), valider(schemaTraitementPaiement), ga(c.traiter));
routeAbonnements.get('/', authentifier, autoriserRoles('ADMINISTRATEUR'), ga(c.abonnements));
