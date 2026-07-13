import { Router } from 'express';
import * as controller from '../controllers/messagerie.controller.js';
import { authentifier, autoriserRoles } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import { schemaCodeConversation, schemaContacts, schemaMessage, schemaNouvelleConversation } from '../schemas/messagerie.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeMessagerie = Router();
routeMessagerie.use(authentifier, autoriserRoles('ETUDIANT', 'UNIVERSITE'));
routeMessagerie.get('/contacts', valider(schemaContacts, 'query'), ga(controller.contacts));
routeMessagerie.get('/conversations', ga(controller.conversations));
routeMessagerie.post('/conversations', valider(schemaNouvelleConversation), ga(controller.creer));
routeMessagerie.get('/conversations/:code/messages', valider(schemaCodeConversation, 'params'), ga(controller.messages));
routeMessagerie.post('/conversations/:code/messages', valider(schemaCodeConversation, 'params'), valider(schemaMessage), ga(controller.envoyer));
