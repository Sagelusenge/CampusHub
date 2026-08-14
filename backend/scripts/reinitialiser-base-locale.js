import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { randomInt } from 'node:crypto';
import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { environnement } from '../src/config/environnement.js';

const confirmation = process.argv.includes('--confirmer');
const hotesLocaux = new Set(['localhost', '127.0.0.1', '::1']);
const racineBackend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dossierUploads = path.resolve(racineBackend, 'uploads');

async function viderFichiers(dossier) {
  let total = 0;
  for (const entree of await readdir(dossier, { withFileTypes: true })) {
    const cible = path.resolve(dossier, entree.name);
    if (!cible.startsWith(`${dossierUploads}${path.sep}`)) throw new Error('Chemin de téléversement non autorisé.');
    if (entree.isDirectory()) total += await viderFichiers(cible);
    else { await unlink(cible); total += 1; }
  }
  return total;
}

if (!confirmation) {
  throw new Error('Ajoutez --confirmer pour autoriser la suppression des données locales.');
}
if (!hotesLocaux.has(environnement.DB_HOST) || environnement.DB_NAME !== 'campushub') {
  throw new Error('Opération refusée : ce script fonctionne uniquement sur la base locale campushub.');
}
if (environnement.NODE_ENV === 'production') {
  throw new Error('Opération refusée en environnement de production.');
}

const email = process.env.CAMPUSHUB_RESET_ADMIN_EMAIL;
const motDePasse = process.env.CAMPUSHUB_RESET_ADMIN_PASSWORD;
if (!email || !motDePasse) {
  throw new Error('Définissez CAMPUSHUB_RESET_ADMIN_EMAIL et CAMPUSHUB_RESET_ADMIN_PASSWORD.');
}
const connexion = await mysql.createConnection({
  host: environnement.DB_HOST,
  port: environnement.DB_PORT,
  user: environnement.DB_USER,
  password: environnement.DB_PASSWORD,
  database: environnement.DB_NAME,
  charset: 'utf8mb4',
  multipleStatements: false,
});

try {
  const [tables] = await connexion.execute(
    `SELECT table_name AS nom
     FROM information_schema.tables
     WHERE table_schema = ? AND table_type = 'BASE TABLE'
       AND table_name NOT IN ('compteurs_sequences', 'plans_abonnement')`,
    [environnement.DB_NAME],
  );
  await connexion.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of tables) {
    const nom = String(table.nom).replace(/`/g, '``');
    await connexion.query(`TRUNCATE TABLE \`${nom}\``);
  }
  await connexion.query('SET FOREIGN_KEY_CHECKS = 1');
  await connexion.execute('UPDATE compteurs_sequences SET derniere_valeur = 0');
  await connexion.execute(
    `UPDATE compteurs_sequences
     SET derniere_valeur = (SELECT COALESCE(MAX(id), 0) FROM plans_abonnement)
     WHERE nom_sequence = 'plans_abonnement'`,
  );
  await connexion.execute(
    "UPDATE compteurs_sequences SET derniere_valeur = ? WHERE nom_sequence = 'utilisateurs'",
    [randomInt(100_000, 900_000)],
  );

  const hash = await bcrypt.hash(motDePasse, environnement.BCRYPT_ROUNDS);
  await connexion.execute(
    `INSERT INTO utilisateurs
      (id, code_utilisateur, email, mot_de_passe_hash, role, statut_compte,
       statut_verification, nom_affichage, date_verification_email)
     VALUES (0, '', ?, ?, 'ADMINISTRATEUR', 'ACTIF', 'VERIFIE', 'Sagel Lusenge', CURRENT_TIMESTAMP)`,
    [email, hash],
  );
  const [plans] = await connexion.query('SELECT id FROM plans_abonnement ORDER BY id LIMIT 1');
  if (!plans[0]) {
    await connexion.execute(
      `INSERT INTO plans_abonnement
       (id, code_plan, nom, prix_acces, prix_certification, duree_jours, avantages, est_actif)
       VALUES (0, '', 'Abonnement annuel', 10.00, 0.00, 365, ?, 1)`,
      [JSON.stringify([
        'Fiche publique de l’établissement',
        'Gestion des campus, formations et services',
        'Inscriptions et demandes étudiantes',
        'Offres, publications et réseau CampusHub',
        'Statistiques, rapports et support',
      ])],
    );
  } else {
    await connexion.execute(
      `UPDATE plans_abonnement SET est_actif = CASE WHEN id = ? THEN 1 ELSE 0 END`,
      [plans[0].id],
    );
    await connexion.execute(
      `UPDATE plans_abonnement
       SET nom = 'Abonnement annuel', prix_acces = 10.00, prix_certification = 0.00,
           duree_jours = 365, avantages = ?, est_actif = 1 WHERE id = ?`,
      [JSON.stringify([
        'Fiche publique de l’établissement',
        'Gestion des campus, formations et services',
        'Inscriptions et demandes étudiantes',
        'Offres, publications et réseau CampusHub',
        'Statistiques, rapports et support',
      ]), plans[0].id],
    );
  }

  const [[verification]] = await connexion.query(
    `SELECT
      (SELECT COUNT(*) FROM utilisateurs) AS utilisateurs,
      (SELECT COUNT(*) FROM utilisateurs WHERE role = 'ADMINISTRATEUR' AND email = ?) AS administrateurs_attendus,
      (SELECT COUNT(*) FROM universites) AS universites,
      (SELECT COUNT(*) FROM profils_etudiants) AS profils_etudiants,
      (SELECT COUNT(*) FROM publications) AS publications,
      (SELECT COUNT(*) FROM journal_audit) AS audits`,
    [email],
  );
  const tablesNonVides = [];
  for (const table of tables.filter((item) => item.nom !== 'utilisateurs')) {
    const nom = String(table.nom).replace(/`/g, '``');
    const [[compte]] = await connexion.query(`SELECT COUNT(*) AS total FROM \`${nom}\``);
    if (Number(compte.total) > 0) tablesNonVides.push({ table: table.nom, total: Number(compte.total) });
  }
  const [[administrateur]] = await connexion.execute(
    'SELECT mot_de_passe_hash FROM utilisateurs WHERE email = ? LIMIT 1',
    [email],
  );
  const uploadsSupprimes = await viderFichiers(dossierUploads);
  console.log(JSON.stringify({
    ...verification,
    tables_metier_non_vides: tablesNonVides,
    mot_de_passe_valide: await bcrypt.compare(motDePasse, administrateur.mot_de_passe_hash),
    uploads_supprimes: uploadsSupprimes,
  }));
} finally {
  await connexion.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => null);
  await connexion.end();
}
