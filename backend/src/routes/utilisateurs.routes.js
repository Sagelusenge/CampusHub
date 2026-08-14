import { Router } from 'express';
import * as controller from '../controllers/utilisateurs.controller.js';
import { authentifier, autoriserRoles } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import {
  schemaCodeUtilisateur,
  schemaCreationUtilisateurAdmin,
  schemaListeUtilisateurs,
  schemaModificationUtilisateurAdmin,
  schemaModificationUtilisateur,
  schemaStatutUtilisateur,
} from '../schemas/utilisateur.schema.js';
import { gestionnaireAsync } from '../utils/gestionnaire-async.js';

export const routeUtilisateurs = Router();
routeUtilisateurs.get('/moi', authentifier, gestionnaireAsync(controller.moi));
routeUtilisateurs.get('/moi/statistiques', authentifier, gestionnaireAsync(controller.mesStatistiques));
routeUtilisateurs.patch('/moi', authentifier, valider(schemaModificationUtilisateur), gestionnaireAsync(controller.modifierMoi));
routeUtilisateurs.get('/', authentifier, autoriserRoles('ADMINISTRATEUR'), valider(schemaListeUtilisateurs, 'query'), gestionnaireAsync(controller.lister));
routeUtilisateurs.post('/', authentifier, autoriserRoles('ADMINISTRATEUR'), valider(schemaCreationUtilisateurAdmin), gestionnaireAsync(controller.creerParAdministration));
routeUtilisateurs.get('/:code', valider(schemaCodeUtilisateur, 'params'), gestionnaireAsync(controller.afficher));
routeUtilisateurs.get('/:code/statistiques', valider(schemaCodeUtilisateur, 'params'), gestionnaireAsync(controller.statistiques));
routeUtilisateurs.patch('/:code', authentifier, autoriserRoles('ADMINISTRATEUR'), valider(schemaCodeUtilisateur, 'params'), valider(schemaModificationUtilisateurAdmin), gestionnaireAsync(controller.modifierParAdministration));
routeUtilisateurs.patch('/:code/statut', authentifier, autoriserRoles('ADMINISTRATEUR'), valider(schemaCodeUtilisateur, 'params'), valider(schemaStatutUtilisateur), gestionnaireAsync(controller.changerStatut));
routeUtilisateurs.delete('/:code', authentifier, autoriserRoles('ADMINISTRATEUR'), valider(schemaCodeUtilisateur, 'params'), gestionnaireAsync(controller.supprimerParAdministration));
routeUtilisateurs.post('/:code/suivre', authentifier, valider(schemaCodeUtilisateur, 'params'), gestionnaireAsync(controller.suivre));
routeUtilisateurs.delete('/:code/suivre', authentifier, valider(schemaCodeUtilisateur, 'params'), gestionnaireAsync(controller.nePlusSuivre));
