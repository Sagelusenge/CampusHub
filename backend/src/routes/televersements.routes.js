import { Router } from 'express';
import * as controller from '../controllers/televersements.controller.js';
import { televerserImage, televerserPreuve } from '../config/televersement.js';
import { authentifier } from '../middlewares/authentification.middleware.js';

export const routeTeleversements = Router();
routeTeleversements.post('/images', authentifier, televerserImage.single('fichier'), controller.image);
routeTeleversements.post('/preuves', televerserPreuve.single('fichier'), controller.preuve);
