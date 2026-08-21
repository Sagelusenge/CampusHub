import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rateLimit } from 'express-rate-limit';
import { environnement } from './config/environnement.js';
import { dossierTeleversements } from './config/televersement.js';
import { gestionnaireErreurs, routeIntrouvable } from './middlewares/erreurs.middleware.js';
import { auditerActions } from './middlewares/audit.middleware.js';
import { routesApi } from './routes/index.js';
import { robotsTxt, servirPageSeo, sitemapXml } from './services/seo.service.js';

export const app = express();
const racineProjet = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dossierFrontend = path.join(racineProjet, 'frontend', 'dist');

if (environnement.NODE_ENV === 'production') app.set('trust proxy', 1);

const originesFrontend = environnement.NODE_ENV === 'production'
  ? [environnement.FRONTEND_URL]
  : [...new Set([
      environnement.FRONTEND_URL,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ])];

app.disable('x-powered-by');
app.use('/uploads/documents', express.static(path.join(path.resolve(dossierTeleversements), 'documents'), {
  maxAge: '7d', index: false,
  setHeaders(reponse) {
    reponse.setHeader('Content-Disposition', 'inline');
    reponse.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    reponse.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${originesFrontend.join(' ')}`);
  },
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://translate.google.com', 'https://translate.googleapis.com'],
      connectSrc: ["'self'", 'https://translate.google.com', 'https://translate.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://translate.google.com', 'https://www.gstatic.com', 'https://*.tile.openstreetmap.org'],
      frameSrc: ["'self'", 'https://www.openstreetmap.org', 'https://translate.google.com'],
    },
  },
}));
app.use(cors({ origin: originesFrontend, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use('/uploads', express.static(path.resolve(dossierTeleversements), { maxAge: '7d', index: false }));
app.use(morgan(environnement.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

if (environnement.NODE_ENV === 'production' && existsSync(dossierFrontend)) {
  app.get('/robots.txt', (_requete, reponse) => reponse.type('text/plain').send(robotsTxt()));
  app.get('/sitemap.xml', async (_requete, reponse, suivant) => {
    try {
      reponse.setHeader('Cache-Control', 'public, max-age=1800');
      return reponse.type('application/xml').send(await sitemapXml());
    } catch (erreur) {
      return suivant(erreur);
    }
  });
  app.use(async (requete, reponse, suivant) => {
    try {
      return await servirPageSeo(requete, reponse, suivant, dossierFrontend);
    } catch (erreur) {
      return suivant(erreur);
    }
  });
  app.use(express.static(dossierFrontend, { index: 'index.html', maxAge: '1h' }));
} else {
  app.get('/', (_requete, reponse) => {
    reponse.json({ succes: true, donnees: { nom: 'API CampusHub', version: 'v1' } });
  });
}

app.use('/api/v1', auditerActions, routesApi);
if (environnement.NODE_ENV === 'production' && existsSync(dossierFrontend)) {
  app.use((requete, reponse, suivant) => {
    if (requete.method !== 'GET' || !requete.accepts('html')) return suivant();
    return reponse.sendFile(path.join(dossierFrontend, 'index.html'));
  });
}
app.use(routeIntrouvable);
app.use(gestionnaireErreurs);
