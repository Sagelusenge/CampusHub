import { app } from './app.js';
import { environnement } from './config/environnement.js';
import { fermerBaseDeDonnees, verifierConnexionBaseDeDonnees } from './config/base-de-donnees.js';
import { demarrerDistributionPush } from './services/push.service.js';

async function demarrer() {
  try {
    await verifierConnexionBaseDeDonnees();
    console.log('Connexion MySQL établie.');
  } catch (erreur) {
    console.error('Impossible de se connecter à MySQL :', erreur.message);
    process.exit(1);
  }

  const serveur = app.listen(environnement.PORT, () => {
    console.log(`API CampusHub : http://localhost:${environnement.PORT}/api/v1`);
  });
  const arreterDistributionPush = demarrerDistributionPush();

  async function arreter(signal) {
    console.log(`${signal} reçu, arrêt du serveur...`);
    arreterDistributionPush();
    serveur.close(async () => {
      await fermerBaseDeDonnees();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => void arreter('SIGINT'));
  process.on('SIGTERM', () => void arreter('SIGTERM'));
}

void demarrer();
