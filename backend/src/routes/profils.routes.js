import { Router } from 'express';
import * as controller from '../controllers/profils.controller.js';
import { authentifier, autoriserRoles } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import { schemaCodeProfil, schemaCreationProfil, schemaListeProfils, schemaModificationProfil } from '../schemas/profil.schema.js';
import { gestionnaireAsync } from '../utils/gestionnaire-async.js';

export const routeProfils = Router();
routeProfils.get('/', valider(schemaListeProfils, 'query'), gestionnaireAsync(controller.lister));
routeProfils.get('/moi', authentifier, autoriserRoles('ETUDIANT'), gestionnaireAsync(controller.moi));
routeProfils.post('/', authentifier, autoriserRoles('ETUDIANT'), valider(schemaCreationProfil), gestionnaireAsync(controller.creer));
routeProfils.patch('/moi', authentifier, autoriserRoles('ETUDIANT'), valider(schemaModificationProfil), gestionnaireAsync(controller.modifier));
routeProfils.delete('/moi', authentifier, autoriserRoles('ETUDIANT'), gestionnaireAsync(controller.masquer));
routeProfils.get('/:code', valider(schemaCodeProfil, 'params'), gestionnaireAsync(controller.afficher));
