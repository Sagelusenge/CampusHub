import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { metaPagination, pagination } from '../utils/sql.js';

export async function tableauDeBord() {
  const [lignes] = await baseDeDonnees.query(`
    SELECT
      (SELECT COUNT(*) FROM utilisateurs) AS utilisateurs,
      (SELECT COUNT(*) FROM utilisateurs WHERE statut_compte = 'EN_ATTENTE') AS comptes_en_attente,
      (SELECT COUNT(*) FROM universites) AS universites,
      (SELECT COUNT(*) FROM universites WHERE statut_verification = 'EN_ATTENTE') AS universites_a_verifier,
      (SELECT COUNT(*) FROM profils_etudiants WHERE est_visible = 1) AS profils_etudiants,
      (SELECT COUNT(*) FROM filieres WHERE est_active = 1) AS filieres,
      (SELECT COUNT(*) FROM publications WHERE statut_publication = 'PUBLIEE') AS publications,
      (SELECT COUNT(*) FROM signalements WHERE statut_signalement IN ('OUVERT', 'EN_EXAMEN')) AS signalements_a_traiter,
      (SELECT COUNT(*) FROM commentaires) AS commentaires,
      (SELECT COUNT(*) FROM mentions_jaime) AS mentions_jaime,
      (SELECT COUNT(*) FROM paiements_abonnement WHERE statut = 'EN_ATTENTE') AS paiements_a_verifier,
      (SELECT COUNT(*) FROM abonnements_universite WHERE statut = 'ACTIF' AND date_fin BETWEEN CURRENT_TIMESTAMP AND DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 7 DAY)) AS abonnements_expirant_bientot,
      (SELECT COUNT(*) FROM suggestions_localisation WHERE statut = 'EN_ATTENTE') AS villes_a_examiner
  `);
  const [sequences] = await baseDeDonnees.query('SELECT nom_sequence, derniere_valeur FROM compteurs_sequences ORDER BY nom_sequence');
  return { indicateurs: lignes[0], compteurs: sequences };
}

export async function listerAudit(filtres) {
  const { page, limite, decalage } = pagination(filtres.page, filtres.limite);
  const conditions = ['1 = 1']; const valeurs = [];
  if (filtres.typeEntite) { conditions.push('a.type_entite = ?'); valeurs.push(filtres.typeEntite.toUpperCase()); }
  if (filtres.action) { conditions.push('a.action = ?'); valeurs.push(filtres.action.toUpperCase()); }
  const where = conditions.join(' AND ');
  const [[lignes], [compte]] = await Promise.all([
    baseDeDonnees.execute(
      `SELECT a.*, u.code_utilisateur, u.nom_affichage
       FROM journal_audit a LEFT JOIN utilisateurs u ON u.id = a.utilisateur_id
       WHERE ${where} ORDER BY a.date_creation DESC LIMIT ? OFFSET ?`, [...valeurs, limite, decalage],
    ),
    baseDeDonnees.execute(`SELECT COUNT(*) AS total FROM journal_audit a WHERE ${where}`, valeurs),
  ]);
  return { entrees: lignes, meta: metaPagination(compte[0].total, page, limite) };
}

export async function verifierUniversite(code, statut) {
  const [resultat] = await baseDeDonnees.execute(
    'UPDATE universites SET statut_verification = ? WHERE code_universite = ?',
    [statut, code.toUpperCase()],
  );
  if (!resultat.affectedRows) throw new ErreurApi(404, 'Université introuvable.');
  const [lignes] = await baseDeDonnees.execute(
    'SELECT code_universite, nom, statut_verification FROM universites WHERE code_universite = ?', [code.toUpperCase()],
  );
  return lignes[0];
}
