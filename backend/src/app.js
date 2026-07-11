import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { environnement } from './config/environnement.js';
import { gestionnaireErreurs, routeIntrouvable } from './middlewares/erreurs.middleware.js';
import { routesApi } from './routes/index.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: environnement.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(morgan(environnement.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

app.get('/', (_requete, reponse) => {
  reponse.json({ succes: true, donnees: { nom: 'API CampusHub', version: 'v1' } });
});

app.use('/api/v1', routesApi);
app.use(routeIntrouvable);
app.use(gestionnaireErreurs);
