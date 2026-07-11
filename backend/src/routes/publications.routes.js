import { Router } from 'express';
import * as c from '../controllers/publications.controller.js';
import { authentifier } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import {
  schemaCodeCommentaire, schemaCodeMedia, schemaCodePublication, schemaCommentaire,
  schemaCreationPublication, schemaListePublications, schemaMedia,
  schemaModificationCommentaire, schemaModificationPublication,
} from '../schemas/publication.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routePublications = Router();
routePublications.get('/', valider(schemaListePublications, 'query'), ga(c.lister));
routePublications.post('/', authentifier, valider(schemaCreationPublication), ga(c.creer));
routePublications.get('/:code', valider(schemaCodePublication, 'params'), ga(c.afficher));
routePublications.patch('/:code', authentifier, valider(schemaCodePublication, 'params'), valider(schemaModificationPublication), ga(c.modifier));
routePublications.delete('/:code', authentifier, valider(schemaCodePublication, 'params'), ga(c.retirer));
routePublications.post('/:code/medias', authentifier, valider(schemaCodePublication, 'params'), valider(schemaMedia), ga(c.ajouterMedia));
routePublications.delete('/medias/:codeMedia', authentifier, valider(schemaCodeMedia, 'params'), ga(c.supprimerMedia));
routePublications.post('/:code/commentaires', authentifier, valider(schemaCodePublication, 'params'), valider(schemaCommentaire), ga(c.commenter));
routePublications.patch('/commentaires/:codeCommentaire', authentifier, valider(schemaCodeCommentaire, 'params'), valider(schemaModificationCommentaire), ga(c.modifierCommentaire));
routePublications.delete('/commentaires/:codeCommentaire', authentifier, valider(schemaCodeCommentaire, 'params'), ga(c.supprimerCommentaire));
