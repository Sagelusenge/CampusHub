import { Router } from 'express';
import * as c from '../controllers/stories.controller.js';
import { authentifier } from '../middlewares/authentification.middleware.js';
import { valider } from '../middlewares/validation.middleware.js';
import { schemaCodeStory, schemaStory } from '../schemas/story.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeStories = Router();
routeStories.use(authentifier);
routeStories.get('/', ga(c.lister));
routeStories.post('/', valider(schemaStory), ga(c.creer));
routeStories.post('/:code/vue', valider(schemaCodeStory, 'params'), ga(c.voir));
routeStories.delete('/:code', valider(schemaCodeStory, 'params'), ga(c.supprimer));
