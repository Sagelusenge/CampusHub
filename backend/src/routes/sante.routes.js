import { Router } from 'express';
import { verifierSante } from '../controllers/sante.controller.js';
import { gestionnaireAsync } from '../utils/gestionnaire-async.js';

export const routeSante = Router();

routeSante.get('/', gestionnaireAsync(verifierSante));
