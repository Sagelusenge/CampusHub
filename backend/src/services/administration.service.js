import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { metaPagination, pagination } from '../utils/sql.js';
import { envoyerAlerteGestionnaires } from './email.service.js';

export async function tableauDeBord() {
  const [lignes] = await baseDeDonnees.query(`
    SELECT
      (SELECT COUNT(*) FROM utilisateurs) AS utilisateurs,
      (SELECT COUNT(*) FROM utilisateurs WHERE statut_compte = 'EN_ATTENTE') AS comptes_en_attente,
      (SELECT COUNT(*) FROM universites) AS universites,
      (SELECT COUNT(*) FROM universites WHERE statut_verification = 'EN_ATTENTE') AS universites_a_verifier,
      (SELECT COUNT(*) FROM profils_etudiants WHERE est_visible = 1 AND statut_institution = 'ACTIF') AS profils_etudiants,
      (SELECT COUNT(*) FROM filieres WHERE est_active = 1) AS filieres,
      (SELECT COUNT(*) FROM publications WHERE statut_publication = 'PUBLIEE') AS publications,
      (SELECT COUNT(*) FROM signalements WHERE statut_signalement IN ('OUVERT', 'EN_EXAMEN')) AS signalements_a_traiter,
      (SELECT COUNT(*) FROM commentaires) AS commentaires,
      (SELECT COUNT(*) FROM mentions_jaime) AS mentions_jaime,
      (SELECT COUNT(*) FROM paiements_abonnement WHERE statut = 'EN_ATTENTE') AS paiements_a_verifier,
      (SELECT COUNT(*) FROM abonnements_universite WHERE statut = 'ACTIF' AND date_fin BETWEEN CURRENT_TIMESTAMP AND DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 7 DAY)) AS abonnements_expirant_bientot,
      (SELECT COUNT(*) FROM suggestions_localisation WHERE statut = 'EN_ATTENTE') AS villes_a_examiner
  `);
  const [activite] = await baseDeDonnees.query(`
    SELECT DATE_FORMAT(date_creation, '%Y-%m') AS mois,
      COUNT(*) AS nouveaux_utilisateurs
    FROM utilisateurs
    WHERE date_creation >= DATE_SUB(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 5 MONTH)
    GROUP BY DATE_FORMAT(date_creation, '%Y-%m')
    ORDER BY mois
  `);
  const [paiements] = await baseDeDonnees.query(`
    SELECT DATE_FORMAT(date_creation, '%Y-%m') AS mois,
      COALESCE(SUM(CASE WHEN statut = 'VALIDE' THEN montant ELSE 0 END), 0) AS revenus
    FROM paiements_abonnement
    WHERE date_creation >= DATE_SUB(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 5 MONTH)
    GROUP BY DATE_FORMAT(date_creation, '%Y-%m')
    ORDER BY mois
  `);
  const [sequences] = await baseDeDonnees.query('SELECT nom_sequence, derniere_valeur FROM compteurs_sequences ORDER BY nom_sequence');
  const utilisateursParMois = new Map(activite.map((item) => [item.mois, Number(item.nouveaux_utilisateurs)]));
  const revenusParMois = new Map(paiements.map((item) => [item.mois, Number(item.revenus)]));
  const activiteMensuelle = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - index));
    const mois = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { mois, nouveauxUtilisateurs: utilisateursParMois.get(mois) || 0, revenus: revenusParMois.get(mois) || 0 };
  });
  return { indicateurs: lignes[0], activiteMensuelle, compteurs: sequences };
}

export async function listerAudit(filtres) {
  const { page, limite, decalage } = pagination(filtres.page, filtres.limite);
  const conditions = ['1 = 1']; const valeurs = [];
  if (filtres.typeEntite) { conditions.push('a.type_entite = ?'); valeurs.push(filtres.typeEntite.toUpperCase()); }
  if (filtres.action) { conditions.push('a.action = ?'); valeurs.push(filtres.action.toUpperCase()); }
  const where = conditions.join(' AND ');
  const [[lignes], [compte]] = await Promise.all([
    baseDeDonnees.query(
      `SELECT a.*, u.code_utilisateur, u.nom_affichage
       FROM journal_audit a LEFT JOIN utilisateurs u ON u.id = a.utilisateur_id
       WHERE ${where} ORDER BY a.date_creation DESC LIMIT ? OFFSET ?`, [...valeurs, limite, decalage],
    ),
    baseDeDonnees.execute(`SELECT COUNT(*) AS total FROM journal_audit a WHERE ${where}`, valeurs),
  ]);
  return { entrees: lignes, meta: metaPagination(compte[0].total, page, limite) };
}

export async function verifierUniversite(code, statut, administrateurId) {
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.beginTransaction();
    const [universites] = await connexion.execute(
      `SELECT u.id, u.code_universite, u.nom,
        GROUP_CONCAT(DISTINCT gestionnaire.email SEPARATOR ',') AS emails_gestionnaires
       FROM universites u
       LEFT JOIN membres_universite membre ON membre.universite_id = u.id AND membre.est_proprietaire = 1
       LEFT JOIN utilisateurs gestionnaire ON gestionnaire.id = membre.utilisateur_id
       WHERE u.code_universite = ?
       GROUP BY u.id, u.code_universite, u.nom
       FOR UPDATE`,
      [code.toUpperCase()],
    );
    if (!universites[0]) throw new ErreurApi(404, 'Université introuvable.');
    const universite = universites[0];
    await connexion.execute('UPDATE universites SET statut_verification = ? WHERE id = ?', [statut, universite.id]);
    await connexion.execute(
      `INSERT INTO notifications
        (id, code_notification, destinataire_id, acteur_id, type_notification, titre, message, url_action)
       SELECT 0, '', m.utilisateur_id, ?, 'SYSTEME', ?, ?, '/espace-universite'
       FROM membres_universite m WHERE m.universite_id = ? AND m.est_proprietaire = 1`,
      [administrateurId,
        statut === 'VERIFIEE' ? 'Fiche universitaire publiée' : 'Fiche universitaire rejetée',
        statut === 'VERIFIEE' ? `${universite.nom} apparaît maintenant sur l’accueil CampusHub.` : `${universite.nom} doit être corrigée avant publication.`,
        universite.id],
    );
    await connexion.commit();
    try {
      await envoyerAlerteGestionnaires({
        emails: String(universite.emails_gestionnaires || '').split(',').filter(Boolean),
        titre: statut === 'VERIFIEE' ? 'Votre établissement a été vérifié' : 'Votre fiche nécessite des corrections',
        introduction: statut === 'VERIFIEE'
          ? `${universite.nom} est maintenant visible dans l’annuaire CampusHub.`
          : `${universite.nom} n’a pas encore été publié par l’administration.`,
        details: statut === 'VERIFIEE'
          ? ['La fiche publique est active.', 'Les formations et services peuvent maintenant être consultés.']
          : ['Connectez-vous pour vérifier et compléter les informations de la fiche.'],
        chemin: '/espace-universite/fiche',
      });
    } catch (erreurEmail) {
      console.error('Échec de l’e-mail de vérification institutionnelle :', erreurEmail.message);
    }
    return { ...universite, statut_verification: statut };
  } catch (erreur) {
    await connexion.rollback();
    throw erreur;
  } finally { connexion.release(); }
}
