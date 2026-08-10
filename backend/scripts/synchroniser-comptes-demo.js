import bcrypt from 'bcryptjs';
import { baseDeDonnees } from '../src/config/base-de-donnees.js';

const motDePasse = 'CampusHubDemo!2026';
const hash = await bcrypt.hash(motDePasse, 12);
const [resultat] = await baseDeDonnees.execute(
  `UPDATE utilisateurs
   SET mot_de_passe_hash = ?, statut_compte = 'ACTIF', statut_verification = 'VERIFIE'
   WHERE email IN ('admin@campushub.test', 'institution@campushub.test')
      OR email REGEXP '^(universite|secondaire)[0-9]{2}@campushub\\.test$'`,
  [hash],
);

console.log(JSON.stringify({ comptesSynchronises: resultat.affectedRows }));
await baseDeDonnees.end();
