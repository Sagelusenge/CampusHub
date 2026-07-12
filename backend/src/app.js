import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { environnement } from './config/environnement.js';
import { gestionnaireErreurs, routeIntrouvable } from './middlewares/erreurs.middleware.js';
import { routesApi } from './routes/index.js';

export const app = express();

const originesFrontend = environnement.NODE_ENV === 'production'
  ? [environnement.FRONTEND_URL]
  : [...new Set([
      environnement.FRONTEND_URL,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ])];

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: originesFrontend, credentials: true }));
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
