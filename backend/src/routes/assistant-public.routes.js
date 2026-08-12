import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as controller from '../controllers/assistant-public.controller.js';
import { valider } from '../middlewares/validation.middleware.js';
import { schemaQuestionAssistantPublic } from '../schemas/assistant-public.schema.js';
import { gestionnaireAsync as ga } from '../utils/gestionnaire-async.js';

export const routeAssistantPublic = Router();

const limiteAssistant = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { succes: false, erreur: { message: 'Trop de questions envoyées. Réessayez dans quelques minutes.' } },
});

routeAssistantPublic.post('/question', limiteAssistant, valider(schemaQuestionAssistantPublic), ga(controller.question));
