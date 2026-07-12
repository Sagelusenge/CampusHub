import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { metaPagination, pagination } from '../utils/sql.js';

export async function listerPlans() {
  const [lignes] = await baseDeDonnees.query('SELECT * FROM plans_abonnement WHERE est_actif = 1 ORDER BY prix_total');
  return lignes;
}

export async function soumettrePaiement(donnees) {
  const [[utilisateurs], [plans]] = await Promise.all([
    baseDeDonnees.execute(`SELECT id, role, statut_compte FROM utilisateurs WHERE code_utilisateur = ? LIMIT 1`, [donnees.codeUtilisateur.toUpperCase()]),
    baseDeDonnees.query('SELECT id, prix_total FROM plans_abonnement WHERE est_actif = 1 ORDER BY id LIMIT 1'),
  ]);
  const utilisateur = utilisateurs[0]; const plan = plans[0];
  if (!utilisateur || utilisateur.role !== 'UNIVERSITE') throw new ErreurApi(404, 'Compte institutionnel introuvable.');
  if (!plan) throw new ErreurApi(503, 'Aucun plan d’abonnement actif.');
  await baseDeDonnees.execute(
    `INSERT INTO paiements_abonnement
      (id, code_paiement, utilisateur_id, plan_id, montant, moyen_paiement, reference_paiement, url_preuve)
     VALUES (0, '', ?, ?, ?, ?, ?, ?)`,
    [utilisateur.id, plan.id, plan.prix_total, donnees.moyenPaiement, donnees.referencePaiement, donnees.urlPreuve ?? null],
  );
  const [lignes] = await baseDeDonnees.execute(
    'SELECT * FROM paiements_abonnement WHERE utilisateur_id = ? ORDER BY id DESC LIMIT 1',
    [utilisateur.id],
  );
  return lignes[0];
}

export async function listerPaiements(filtres) {
  const { page, limite, decalage } = pagination(filtres.page, filtres.limite);
  const where = filtres.statut ? 'WHERE pa.statut = ?' : '';
  const valeurs = filtres.statut ? [filtres.statut] : [];
  const [[lignes], [compte]] = await Promise.all([
    baseDeDonnees.execute(
      `SELECT pa.*, u.code_utilisateur, u.nom_affichage, u.email, p.nom AS nom_plan,
        p.prix_acces, p.prix_certification
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
    if (donnees.statut === 'VALIDE') {
      const [precedents] = await connexion.execute(
        `SELECT date_fin FROM abonnements_universite WHERE utilisateur_id = ? AND statut = 'ACTIF' ORDER BY date_fin DESC LIMIT 1`,
        [paiement.utilisateur_id],
      );
      const debut = precedents[0]?.date_fin && new Date(precedents[0].date_fin) > new Date() ? precedents[0].date_fin : new Date();
      const fin = new Date(new Date(debut).getTime() + paiement.duree_jours * 86400000);
      const [membres] = await connexion.execute(
        `SELECT universite_id FROM membres_universite WHERE utilisateur_id = ? AND est_proprietaire = 1 LIMIT 1`, [paiement.utilisateur_id],
      );
      await connexion.execute(
        `INSERT INTO abonnements_universite
          (id, code_abonnement, utilisateur_id, universite_id, plan_id, paiement_id, date_debut, date_fin)
         VALUES (0, '', ?, ?, ?, ?, ?, ?)`,
        [paiement.utilisateur_id, membres[0]?.universite_id ?? null, paiement.plan_id, paiement.id, debut, fin],
      );
      await connexion.execute(
        `UPDATE utilisateurs SET statut_compte = 'ACTIF', statut_verification = 'VERIFIE',
         date_verification_email = COALESCE(date_verification_email, CURRENT_TIMESTAMP) WHERE id = ?`,
        [paiement.utilisateur_id],
      );
    }
    await connexion.execute(
      `INSERT INTO notifications (id, code_notification, destinataire_id, type_notification, titre, message)
       VALUES (0, '', ?, 'ABONNEMENT', ?, ?)`,
      [paiement.utilisateur_id,
        donnees.statut === 'VALIDE' ? 'Paiement validé' : 'Paiement rejeté',
        donnees.statut === 'VALIDE' ? 'Votre abonnement de 30 jours est actif.' : (donnees.commentaire || 'Veuillez vérifier votre preuve de paiement.')],
    );
    await connexion.commit();
    return await obtenirPaiement(code, connexion);
  } catch (erreur) { await connexion.rollback(); throw erreur; }
  finally { connexion.release(); }
}

async function obtenirPaiement(code, connexion = baseDeDonnees) {
  const [lignes] = await connexion.execute('SELECT * FROM paiements_abonnement WHERE code_paiement = ?', [code.toUpperCase()]);
  return lignes[0];
}

export async function obtenirMonAbonnement(utilisateurId) {
  await baseDeDonnees.execute(`UPDATE abonnements_universite SET statut = 'EXPIRE' WHERE statut = 'ACTIF' AND date_fin < CURRENT_TIMESTAMP`);
  const [lignes] = await baseDeDonnees.execute(
    'SELECT * FROM vue_abonnements_universites WHERE utilisateur_id = ? ORDER BY date_fin DESC LIMIT 1', [utilisateurId],
  );
  return lignes[0] ?? null;
}

export async function listerAbonnements() {
  await baseDeDonnees.execute(`UPDATE abonnements_universite SET statut = 'EXPIRE' WHERE statut = 'ACTIF' AND date_fin < CURRENT_TIMESTAMP`);
  const [lignes] = await baseDeDonnees.query('SELECT * FROM vue_abonnements_universites ORDER BY statut, date_fin');
  return lignes;
}
