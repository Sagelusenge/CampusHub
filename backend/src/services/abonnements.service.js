import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { metaPagination, pagination } from '../utils/sql.js';

export async function listerPlans() {
  const [lignes] = await baseDeDonnees.query('SELECT * FROM plans_abonnement WHERE est_actif = 1 ORDER BY prix_total');
  return lignes.map((plan) => ({
    ...plan,
    avantages: typeof plan.avantages === 'string' ? JSON.parse(plan.avantages) : plan.avantages,
  }));
}

export async function soumettrePaiement(donnees) {
  const [[utilisateurs], [plans]] = await Promise.all([
    baseDeDonnees.execute('SELECT id, role FROM utilisateurs WHERE code_utilisateur = ? LIMIT 1', [donnees.codeUtilisateur.toUpperCase()]),
    baseDeDonnees.execute('SELECT id, code_plan, prix_total FROM plans_abonnement WHERE code_plan = ? AND est_actif = 1 LIMIT 1', [donnees.codePlan.toUpperCase()]),
  ]);
  const utilisateur = utilisateurs[0]; const plan = plans[0];
  if (!utilisateur || utilisateur.role !== 'UNIVERSITE') throw new ErreurApi(404, 'Compte institutionnel introuvable.');
  if (!plan) throw new ErreurApi(404, 'Pack d’abonnement introuvable.');
  if (donnees.typePaiement === 'CERTIFICATION') {
    const [eligibles] = await baseDeDonnees.execute(
      `SELECT m.universite_id FROM membres_universite m
       JOIN abonnements_universite a ON a.universite_id = m.universite_id
       WHERE m.utilisateur_id = ? AND m.est_proprietaire = 1
         AND a.statut = 'ACTIF' AND a.date_fin > CURRENT_TIMESTAMP LIMIT 1`,
      [utilisateur.id],
    );
    if (!eligibles[0]) throw new ErreurApi(403, 'Un abonnement actif et une fiche universitaire sont requis pour commander le badge.');
  }
  const montant = donnees.typePaiement === 'CERTIFICATION' ? 7 : plan.prix_total;
  await baseDeDonnees.execute(
    `INSERT INTO paiements_abonnement
      (id, code_paiement, utilisateur_id, plan_id, type_paiement, montant, moyen_paiement, reference_paiement, url_preuve)
     VALUES (0, '', ?, ?, ?, ?, ?, ?, ?)`,
    [utilisateur.id, plan.id, donnees.typePaiement, montant, donnees.moyenPaiement, donnees.referencePaiement, donnees.urlPreuve ?? null],
  );
  const [lignes] = await baseDeDonnees.execute(
    'SELECT * FROM paiements_abonnement WHERE utilisateur_id = ? ORDER BY id DESC LIMIT 1', [utilisateur.id],
  );
  return lignes[0];
}

export async function listerPaiements(filtres) {
  const { page, limite, decalage } = pagination(filtres.page, filtres.limite);
  const where = filtres.statut ? 'WHERE pa.statut = ?' : '';
  const valeurs = filtres.statut ? [filtres.statut] : [];
  const [[lignes], [compte]] = await Promise.all([
    baseDeDonnees.execute(
      `SELECT pa.*, u.code_utilisateur, u.nom_affichage, u.email,
        p.code_plan, p.nom AS nom_plan, p.prix_acces
       FROM paiements_abonnement pa
       JOIN utilisateurs u ON u.id = pa.utilisateur_id
       JOIN plans_abonnement p ON p.id = pa.plan_id
       ${where} ORDER BY FIELD(pa.statut, 'EN_ATTENTE', 'VALIDE', 'REJETE'), pa.date_creation DESC
       LIMIT ? OFFSET ?`, [...valeurs, limite, decalage]),
    baseDeDonnees.execute(`SELECT COUNT(*) AS total FROM paiements_abonnement pa ${where}`, valeurs),
  ]);
  return { paiements: lignes, meta: metaPagination(compte[0].total, page, limite) };
}

export async function traiterPaiement(code, adminId, donnees) {
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.beginTransaction();
    const [paiements] = await connexion.execute(
      `SELECT pa.*, p.duree_jours FROM paiements_abonnement pa
       JOIN plans_abonnement p ON p.id = pa.plan_id
       WHERE pa.code_paiement = ? FOR UPDATE`, [code.toUpperCase()],
    );
    const paiement = paiements[0];
    if (!paiement) throw new ErreurApi(404, 'Paiement introuvable.');
    if (paiement.statut !== 'EN_ATTENTE') throw new ErreurApi(409, 'Ce paiement a déjà été traité.');
    await connexion.execute(
      `UPDATE paiements_abonnement SET statut = ?, commentaire_admin = ?, traite_par_id = ?, date_traitement = CURRENT_TIMESTAMP WHERE id = ?`,
      [donnees.statut, donnees.commentaire ?? null, adminId, paiement.id],
    );
    if (donnees.statut === 'VALIDE' && paiement.type_paiement === 'ABONNEMENT') {
      await activerAbonnement(connexion, paiement);
    } else if (donnees.statut === 'VALIDE' && paiement.type_paiement === 'CERTIFICATION') {
      await activerCertification(connexion, paiement);
    }
    const valide = donnees.statut === 'VALIDE';
    const message = valide
      ? (paiement.type_paiement === 'CERTIFICATION' ? 'Votre badge certifié est actif pour 30 jours.' : 'Votre pack est actif pour 30 jours.')
      : (donnees.commentaire || 'Veuillez vérifier votre preuve de paiement.');
    await connexion.execute(
      `INSERT INTO notifications (id, code_notification, destinataire_id, type_notification, titre, message)
       VALUES (0, '', ?, 'ABONNEMENT', ?, ?)`,
      [paiement.utilisateur_id, valide ? 'Paiement validé' : 'Paiement rejeté', message],
    );
    await connexion.commit();
    return await obtenirPaiement(code, connexion);
  } catch (erreur) { await connexion.rollback(); throw erreur; }
  finally { connexion.release(); }
}

async function activerAbonnement(connexion, paiement) {
  const [precedents] = await connexion.execute(
    `SELECT date_fin FROM abonnements_universite WHERE utilisateur_id = ? AND statut = 'ACTIF' ORDER BY date_fin DESC LIMIT 1`,
    [paiement.utilisateur_id],
  );
  const debut = precedents[0]?.date_fin && new Date(precedents[0].date_fin) > new Date() ? precedents[0].date_fin : new Date();
  const fin = new Date(new Date(debut).getTime() + paiement.duree_jours * 86400000);
  const [membres] = await connexion.execute(
    'SELECT universite_id FROM membres_universite WHERE utilisateur_id = ? AND est_proprietaire = 1 LIMIT 1', [paiement.utilisateur_id],
  );
  await connexion.execute(
    `INSERT INTO abonnements_universite
      (id, code_abonnement, utilisateur_id, universite_id, plan_id, paiement_id, date_debut, date_fin, certification_incluse)
     VALUES (0, '', ?, ?, ?, ?, ?, ?, 0)`,
    [paiement.utilisateur_id, membres[0]?.universite_id ?? null, paiement.plan_id, paiement.id, debut, fin],
  );
  await connexion.execute(
    `UPDATE utilisateurs SET statut_compte = 'ACTIF', statut_verification = 'VERIFIE',
     date_verification_email = COALESCE(date_verification_email, CURRENT_TIMESTAMP) WHERE id = ?`,
    [paiement.utilisateur_id],
  );
}

async function activerCertification(connexion, paiement) {
  const [membres] = await connexion.execute(
    'SELECT universite_id FROM membres_universite WHERE utilisateur_id = ? AND est_proprietaire = 1 LIMIT 1', [paiement.utilisateur_id],
  );
  if (!membres[0]) throw new ErreurApi(409, 'La fiche universitaire doit exister avant l’activation du badge.');
  const [precedentes] = await connexion.execute(
    `SELECT date_fin FROM certifications_universite
     WHERE universite_id = ? AND statut = 'ACTIF' ORDER BY date_fin DESC LIMIT 1`, [membres[0].universite_id],
  );
  const debut = precedentes[0]?.date_fin && new Date(precedentes[0].date_fin) > new Date() ? precedentes[0].date_fin : new Date();
  const fin = new Date(new Date(debut).getTime() + 30 * 86400000);
  await connexion.execute(
    `INSERT INTO certifications_universite
      (id, code_certification, utilisateur_id, universite_id, paiement_id, prix, date_debut, date_fin)
     VALUES (0, '', ?, ?, ?, 7.00, ?, ?)`,
    [paiement.utilisateur_id, membres[0].universite_id, paiement.id, debut, fin],
  );
}

async function obtenirPaiement(code, connexion = baseDeDonnees) {
  const [lignes] = await connexion.execute('SELECT * FROM paiements_abonnement WHERE code_paiement = ?', [code.toUpperCase()]);
  return lignes[0];
}

export async function obtenirMonAbonnement(utilisateurId) {
  await baseDeDonnees.execute("UPDATE abonnements_universite SET statut = 'EXPIRE' WHERE statut = 'ACTIF' AND date_fin < CURRENT_TIMESTAMP");
  await baseDeDonnees.execute("UPDATE certifications_universite SET statut = 'EXPIRE' WHERE statut = 'ACTIF' AND date_fin < CURRENT_TIMESTAMP");
  const [lignes] = await baseDeDonnees.execute(
    'SELECT * FROM vue_abonnements_universites WHERE utilisateur_id = ? ORDER BY date_fin DESC LIMIT 1', [utilisateurId],
  );
  return lignes[0] ?? null;
}

export async function listerAbonnements() {
  await baseDeDonnees.execute("UPDATE abonnements_universite SET statut = 'EXPIRE' WHERE statut = 'ACTIF' AND date_fin < CURRENT_TIMESTAMP");
  await baseDeDonnees.execute("UPDATE certifications_universite SET statut = 'EXPIRE' WHERE statut = 'ACTIF' AND date_fin < CURRENT_TIMESTAMP");
  const [lignes] = await baseDeDonnees.query('SELECT * FROM vue_abonnements_universites ORDER BY statut, date_fin');
  return lignes;
}
