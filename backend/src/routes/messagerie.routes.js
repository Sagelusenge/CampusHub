import { Router } from 'express';
import * as controller from '../controllers/messagerie.controller.js';
import { authentifier, autoriserRoles } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import {
  schemaBlocage,
  schemaCodeContact,
  schemaCodeConversation,
  schemaContacts,
  schemaEtatSaisie,
  schemaMessage,
  schemaNouvelleConversation,
} from '../schemas/messagerie.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeMessagerie = Router();
routeMessagerie.use(authentifier, autoriserRoles('VISITEUR', 'ETUDIANT', 'UNIVERSITE', 'ADMINISTRATEUR'));
routeMessagerie.post('/presence', ga(controller.presence));
routeMessagerie.get('/contacts', valider(schemaContacts, 'query'), ga(controller.contacts));
routeMessagerie.patch('/contacts/:code/blocage', valider(schemaCodeContact, 'params'), valider(schemaBlocage), ga(controller.blocage));
routeMessagerie.get('/conversations', ga(controller.conversations));
routeMessagerie.post('/conversations', valider(schemaNouvelleConversation), ga(controller.creer));
routeMessagerie.get('/conversations/:code/etat', valider(schemaCodeConversation, 'params'), ga(controller.etat));
routeMessagerie.post('/conversations/:code/saisie', valider(schemaCodeConversation, 'params'), valider(schemaEtatSaisie), ga(controller.saisie));
routeMessagerie.get('/conversations/:code/messages', valider(schemaCodeConversation, 'params'), ga(controller.messages));
routeMessagerie.post('/conversations/:code/messages', valider(schemaCodeConversation, 'params'), valider(schemaMessage), ga(controller.envoyer));
