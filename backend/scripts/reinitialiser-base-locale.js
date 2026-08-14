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
  const avantagesAnnuels = JSON.stringify([
    'Accès complet et illimité pendant 12 mois',
    'Fiche publique et carte de l’établissement',
    'Campus, formations, services et inscriptions',
    'Offres, publications et réseau CampusHub',
    'Rapports professionnels et support',
  ]);
  const avantagesVie = JSON.stringify([
    'Paiement unique sans renouvellement annuel',
    'Accès permanent à toutes les fonctions institutionnelles',
    'Fiche publique, carte, campus et formations',
    'Inscriptions, offres, publications et réseau',
    'Rapports professionnels et support prioritaire',
  ]);
  let [plansAnnuels] = await connexion.query('SELECT id FROM plans_abonnement WHERE est_a_vie = 0 ORDER BY id LIMIT 1');
  if (!plansAnnuels[0]) {
    await connexion.execute(
      `INSERT INTO plans_abonnement
       (id, code_plan, nom, prix_acces, prix_certification, duree_jours, est_a_vie, avantages, est_actif)
       VALUES (0, '', 'Accès annuel', 20.00, 0.00, 365, 0, ?, 1)`,
      [avantagesAnnuels],
    );
    [plansAnnuels] = await connexion.query('SELECT id FROM plans_abonnement WHERE est_a_vie = 0 ORDER BY id LIMIT 1');
  }
  await connexion.execute(
    `UPDATE plans_abonnement SET nom = 'Accès annuel', prix_acces = 20.00,
       prix_certification = 0.00, duree_jours = 365, est_a_vie = 0,
       avantages = ?, est_actif = 1 WHERE id = ?`,
    [avantagesAnnuels, plansAnnuels[0].id],
  );
  let [plansVie] = await connexion.query('SELECT id FROM plans_abonnement WHERE est_a_vie = 1 ORDER BY id LIMIT 1');
  if (!plansVie[0]) {
    await connexion.execute(
      `INSERT INTO plans_abonnement
       (id, code_plan, nom, prix_acces, prix_certification, duree_jours, est_a_vie, avantages, est_actif)
       VALUES (0, '', 'Accès à vie', 200.00, 0.00, 365, 1, ?, 1)`,
      [avantagesVie],
    );
    [plansVie] = await connexion.query('SELECT id FROM plans_abonnement WHERE est_a_vie = 1 ORDER BY id LIMIT 1');
  }
  await connexion.execute(
    `UPDATE plans_abonnement SET nom = 'Accès à vie', prix_acces = 200.00,
       prix_certification = 0.00, duree_jours = 365, est_a_vie = 1,
       avantages = ?, est_actif = 1 WHERE id = ?`,
    [avantagesVie, plansVie[0].id],
  );
  await connexion.execute(
    'UPDATE plans_abonnement SET est_actif = CASE WHEN id IN (?, ?) THEN 1 ELSE 0 END',
    [plansAnnuels[0].id, plansVie[0].id],
  );
  await connexion.execute(
    `UPDATE compteurs_sequences
     SET derniere_valeur = (SELECT COALESCE(MAX(id), 0) FROM plans_abonnement)
     WHERE nom_sequence = 'plans_abonnement'`,
  );

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
