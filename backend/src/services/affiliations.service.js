import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { metaPagination, pagination } from '../utils/sql.js';
import { envoyerDecisionAffiliationEtudiant, envoyerNouvelleAffiliationGestionnaires } from './email.service.js';

export async function validerChoixAffiliation(donnees) {
  const [[universites], [filieres]] = await Promise.all([
    baseDeDonnees.execute(`SELECT id FROM universites WHERE code_universite = ? AND statut_verification = 'VERIFIEE' LIMIT 1`, [donnees.codeUniversite.toUpperCase()]),
    baseDeDonnees.execute(`SELECT id, universite_id FROM filieres WHERE code_filiere = ? AND est_active = 1 LIMIT 1`, [donnees.codeFiliere.toUpperCase()]),
  ]);
  if (!universites[0]) throw new ErreurApi(404, 'Université vérifiée introuvable.');
  if (!filieres[0] || filieres[0].universite_id !== universites[0].id) throw new ErreurApi(400, 'Cette filière ne dépend pas de l’université choisie.');
  return { universiteId: universites[0].id, filiereId: filieres[0].id };
}

export async function notifierDemandeAffiliation(etudiantId) {
  const [demandes] = await baseDeDonnees.execute(
    `SELECT d.code_demande, d.matricule_etudiant, d.universite_id,
      e.nom_affichage AS nom_etudiant, u.nom AS nom_universite, f.nom AS nom_filiere
     FROM demandes_affiliation_etudiante d
     JOIN utilisateurs e ON e.id = d.etudiant_id
     JOIN universites u ON u.id = d.universite_id
     LEFT JOIN filieres f ON f.id = d.filiere_id
     WHERE d.etudiant_id = ? AND d.statut = 'EN_ATTENTE'
     ORDER BY d.id DESC LIMIT 1`,
    [etudiantId],
  );
  const demande = demandes[0];
  if (!demande) return false;
  const [gestionnaires] = await baseDeDonnees.execute(
    `SELECT ut.email FROM membres_universite m
     JOIN utilisateurs ut ON ut.id = m.utilisateur_id
     WHERE m.universite_id = ? AND m.est_proprietaire = 1 AND ut.statut_compte = 'ACTIF'`,
    [demande.universite_id],
  );
  await baseDeDonnees.execute(
    `INSERT INTO notifications (id, code_notification, destinataire_id, acteur_id, type_notification, titre, message)
     SELECT 0, '', m.utilisateur_id, ?, 'AFFILIATION', 'Nouvelle demande étudiante',
       'Un étudiant souhaite être confirmé dans votre université.'
     FROM membres_universite m WHERE m.universite_id = ? AND m.est_proprietaire = 1`,
    [etudiantId, demande.universite_id],
  );
  try {
    await envoyerNouvelleAffiliationGestionnaires({
      ...demande,
      emails_gestionnaires: gestionnaires.map((item) => item.email).filter(Boolean),
    });
  } catch (erreur) {
    console.error('Échec de l’e-mail de nouvelle affiliation :', erreur.code || erreur.message);
  }
  return true;
}

export async function creerDemandeAffiliation(etudiantId, donnees, options = {}) {
  const [{ universiteId, filiereId }, [existantes]] = await Promise.all([
    validerChoixAffiliation(donnees),
    baseDeDonnees.execute(`SELECT id FROM demandes_affiliation_etudiante WHERE etudiant_id = ? AND statut IN ('EN_ATTENTE','ACCEPTEE') LIMIT 1`, [etudiantId]),
  ]);
  if (existantes[0]) throw new ErreurApi(409, 'Vous avez déjà une demande active.');
  await baseDeDonnees.execute(
    `INSERT INTO demandes_affiliation_etudiante
      (id, code_demande, etudiant_id, universite_id, filiere_id, matricule_etudiant, message_etudiant)
     VALUES (0, '', ?, ?, ?, ?, ?)`,
    [etudiantId, universiteId, filiereId, donnees.matriculeEtudiant ?? null, donnees.message ?? null],
  );
  if (options.notifier !== false) await notifierDemandeAffiliation(etudiantId);
  const [lignes] = await baseDeDonnees.execute(
    'SELECT code_demande, statut, date_creation FROM demandes_affiliation_etudiante WHERE etudiant_id = ? ORDER BY id DESC LIMIT 1',
    [etudiantId],
  );
  return lignes[0];
}

export async function listerMesDemandes(etudiantId) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT d.*, u.code_universite, u.nom AS nom_universite,
      f.code_filiere, f.nom AS nom_filiere
     FROM demandes_affiliation_etudiante d
     JOIN universites u ON u.id = d.universite_id
     LEFT JOIN filieres f ON f.id = d.filiere_id
     WHERE d.etudiant_id = ? ORDER BY d.date_creation DESC`, [etudiantId],
  );
  return lignes;
}

export async function listerDemandesUniversite(gestionnaireId) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT d.*, e.code_utilisateur, e.nom_affichage, e.email,
      f.code_filiere, f.nom AS nom_filiere
     FROM membres_universite m
     JOIN demandes_affiliation_etudiante d ON d.universite_id = m.universite_id
     JOIN utilisateurs e ON e.id = d.etudiant_id AND e.date_verification_email IS NOT NULL
     LEFT JOIN filieres f ON f.id = d.filiere_id
     WHERE m.utilisateur_id = ? ORDER BY FIELD(d.statut, 'EN_ATTENTE','ACCEPTEE','REJETEE'), d.date_creation DESC`,
    [gestionnaireId],
  );
  return lignes;
}

export async function traiterDemandeAffiliation(code, gestionnaireId, donnees) {
  const connexion = await baseDeDonnees.getConnection();
  let resultatFinal;
  try {
    await connexion.beginTransaction();
    const [demandes] = await connexion.execute(
      `SELECT d.*, e.email AS email_etudiant, e.nom_affichage AS nom_etudiant,
         u.nom AS nom_universite, f.nom AS nom_filiere
       FROM demandes_affiliation_etudiante d
       JOIN membres_universite m ON m.universite_id = d.universite_id
       JOIN utilisateurs e ON e.id = d.etudiant_id
       JOIN universites u ON u.id = d.universite_id
       LEFT JOIN filieres f ON f.id = d.filiere_id
       WHERE d.code_demande = ? AND m.utilisateur_id = ? FOR UPDATE`,
      [code.toUpperCase(), gestionnaireId],
    );
    const demande = demandes[0];
    if (!demande) throw new ErreurApi(404, 'Demande introuvable pour votre université.');
    if (demande.statut !== 'EN_ATTENTE') throw new ErreurApi(409, 'Cette demande a déjà été traitée.');
    await connexion.execute(
      `UPDATE demandes_affiliation_etudiante SET statut = ?, reponse_universite = ?,
       traite_par_id = ?, date_traitement = CURRENT_TIMESTAMP WHERE id = ?`,
      [donnees.statut, donnees.reponse ?? null, gestionnaireId, demande.id],
    );
    if (donnees.statut === 'ACCEPTEE') {
      const [profils] = await connexion.execute('SELECT id FROM profils_etudiants WHERE utilisateur_id = ? LIMIT 1', [demande.etudiant_id]);
      if (!profils[0]) {
        await connexion.query('CALL sp_creer_profil_etudiant(?, ?, ?, ?, ?, ?, ?)', [
          demande.etudiant_id, demande.universite_id, demande.filiere_id,
          demande.matricule_etudiant, 'Étudiant confirmé', JSON.stringify([]), null,
        ]);
      } else {
        await connexion.execute(
          `UPDATE profils_etudiants
           SET universite_id = ?, filiere_id = ?, matricule_etudiant = ?,
             statut_institution = 'ACTIF', motif_statut = NULL, date_fin_suspension = NULL,
             statut_modifie_par_id = ?, date_statut = CURRENT_TIMESTAMP, est_visible = 1
           WHERE id = ?`,
          [demande.universite_id, demande.filiere_id, demande.matricule_etudiant, gestionnaireId, profils[0].id],
        );
      }
    }
    await connexion.execute(
      `INSERT INTO notifications (id, code_notification, destinataire_id, acteur_id, type_notification, titre, message)
       VALUES (0, '', ?, ?, 'AFFILIATION', ?, ?)`,
      [demande.etudiant_id, gestionnaireId,
        donnees.statut === 'ACCEPTEE' ? 'Affiliation confirmée' : 'Affiliation refusée',
        donnees.statut === 'ACCEPTEE' ? 'Votre université a confirmé votre statut étudiant.' : (donnees.reponse || 'Votre demande n’a pas été acceptée.')],
    );
    await connexion.commit();
    resultatFinal = { ...demande, statut: donnees.statut, reponse_universite: donnees.reponse ?? null };
  } catch (erreur) { await connexion.rollback(); throw erreur; }
  finally { connexion.release(); }
  try {
    await envoyerDecisionAffiliationEtudiant(resultatFinal);
  } catch (erreur) {
    console.error('Échec de l’e-mail de décision d’affiliation :', erreur.code || erreur.message);
  }
  return resultatFinal;
}

export async function listerEtudiantsUniversite(gestionnaireId, filtres) {
  const { page, limite, decalage } = pagination(filtres.page, filtres.limite);
  const conditions = ['m.utilisateur_id = ?'];
  const valeurs = [gestionnaireId];
  if (filtres.statut) {
    conditions.push('pe.statut_institution = ?');
    valeurs.push(filtres.statut);
  }
  if (filtres.recherche) {
    const recherche = `%${filtres.recherche}%`;
    conditions.push('(e.nom_affichage LIKE ? OR e.email LIKE ? OR e.code_utilisateur LIKE ? OR pe.matricule_etudiant LIKE ?)');
    valeurs.push(recherche, recherche, recherche, recherche);
  }
  const where = conditions.join(' AND ');
  const [etudiants, compte, repartition] = await Promise.all([
    baseDeDonnees.query(
      `SELECT pe.id, pe.code_profil, pe.matricule_etudiant, pe.statut_institution,
        pe.motif_statut, pe.date_fin_suspension, pe.date_statut, pe.date_creation,
        e.code_utilisateur, e.nom_affichage, e.email, e.url_photo_profil,
        f.code_filiere, f.nom AS nom_filiere,
        auteur.nom_affichage AS statut_modifie_par
       FROM membres_universite m
       JOIN profils_etudiants pe ON pe.universite_id = m.universite_id
       JOIN utilisateurs e ON e.id = pe.utilisateur_id AND e.role = 'ETUDIANT'
       LEFT JOIN filieres f ON f.id = pe.filiere_id
       LEFT JOIN utilisateurs auteur ON auteur.id = pe.statut_modifie_par_id
       WHERE ${where}
       ORDER BY FIELD(pe.statut_institution, 'ACTIF','SUSPENDU','BLOQUE','RETIRE'), e.nom_affichage
       LIMIT ? OFFSET ?`,
      [...valeurs, limite, decalage],
    ),
    baseDeDonnees.execute(
      `SELECT COUNT(*) AS total
       FROM membres_universite m
       JOIN profils_etudiants pe ON pe.universite_id = m.universite_id
       JOIN utilisateurs e ON e.id = pe.utilisateur_id AND e.role = 'ETUDIANT'
       WHERE ${where}`,
      valeurs,
    ),
    baseDeDonnees.execute(
      `SELECT pe.statut_institution AS statut, COUNT(*) AS total
       FROM membres_universite m
       JOIN profils_etudiants pe ON pe.universite_id = m.universite_id
       JOIN utilisateurs e ON e.id = pe.utilisateur_id AND e.role = 'ETUDIANT'
       WHERE m.utilisateur_id = ?
       GROUP BY pe.statut_institution`,
      [gestionnaireId],
    ),
  ]);
  const statuts = { ACTIF: 0, SUSPENDU: 0, BLOQUE: 0, RETIRE: 0 };
  repartition[0].forEach((item) => { statuts[item.statut] = Number(item.total); });
  return {
    etudiants: etudiants[0],
    meta: { ...metaPagination(compte[0][0].total, page, limite), statuts },
  };
}

export async function modifierStatutEtudiantUniversite(codeUtilisateur, gestionnaireId, donnees) {
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.beginTransaction();
    const [lignes] = await connexion.execute(
      `SELECT pe.id, pe.utilisateur_id, pe.statut_institution, pe.motif_statut,
        pe.date_fin_suspension, pe.est_visible, e.code_utilisateur, e.nom_affichage,
        u.id AS universite_id, u.nom AS nom_universite
       FROM membres_universite m
       JOIN universites u ON u.id = m.universite_id
       JOIN profils_etudiants pe ON pe.universite_id = u.id
       JOIN utilisateurs e ON e.id = pe.utilisateur_id AND e.role = 'ETUDIANT'
       WHERE m.utilisateur_id = ? AND e.code_utilisateur = ?
       LIMIT 1 FOR UPDATE`,
      [gestionnaireId, codeUtilisateur.toUpperCase()],
    );
    const etudiant = lignes[0];
    if (!etudiant) throw new ErreurApi(404, 'Cet étudiant ne fait pas partie de votre établissement.');

    const avant = {
      statutInstitution: etudiant.statut_institution,
      motif: etudiant.motif_statut,
      dateFinSuspension: etudiant.date_fin_suspension,
      estVisible: Boolean(etudiant.est_visible),
    };
    const dateFin = donnees.statut === 'SUSPENDU' && donnees.dateFinSuspension
      ? new Date(donnees.dateFinSuspension)
      : null;
    await connexion.execute(
      `UPDATE profils_etudiants
       SET statut_institution = ?, motif_statut = ?, date_fin_suspension = ?,
         statut_modifie_par_id = ?, date_statut = CURRENT_TIMESTAMP,
         est_visible = CASE WHEN ? = 'ACTIF' THEN 1 ELSE 0 END
       WHERE id = ?`,
      [donnees.statut, donnees.statut === 'ACTIF' ? null : donnees.motif, dateFin,
        gestionnaireId, donnees.statut, etudiant.id],
    );
    const libelles = {
      ACTIF: 'Votre accès institutionnel a été réactivé.',
      SUSPENDU: 'Votre affiliation à l’établissement a été suspendue.',
      BLOQUE: 'Votre affiliation à l’établissement a été bloquée.',
      RETIRE: 'Vous avez été retiré de la liste de cet établissement.',
    };
    await connexion.execute(
      `INSERT INTO notifications
        (id, code_notification, destinataire_id, acteur_id, type_notification, titre, message, url_action)
       VALUES (0, '', ?, ?, 'SYSTEME', 'Statut institutionnel modifié', ?, '/espace-etudiant/affiliation')`,
      [etudiant.utilisateur_id, gestionnaireId,
        `${libelles[donnees.statut]}${donnees.motif ? ` Motif : ${donnees.motif}` : ''}`],
    );
    await connexion.commit();
    const [misesAJour] = await connexion.execute(
      `SELECT pe.id, pe.code_profil, pe.matricule_etudiant, pe.statut_institution,
        pe.motif_statut, pe.date_fin_suspension, pe.date_statut,
        e.code_utilisateur, e.nom_affichage, e.email, e.url_photo_profil,
        f.code_filiere, f.nom AS nom_filiere
       FROM profils_etudiants pe
       JOIN utilisateurs e ON e.id = pe.utilisateur_id
       LEFT JOIN filieres f ON f.id = pe.filiere_id
       WHERE pe.id = ?`,
      [etudiant.id],
    );
    const apres = {
      statutInstitution: donnees.statut,
      motif: donnees.statut === 'ACTIF' ? null : donnees.motif,
      dateFinSuspension: dateFin,
      estVisible: donnees.statut === 'ACTIF',
    };
    return {
      etudiant: misesAJour[0], avant, apres,
      message: donnees.statut === 'RETIRE'
        ? 'L’étudiant a été retiré de votre établissement sans supprimer son compte CampusHub.'
        : `Le statut de l’étudiant est maintenant ${donnees.statut.toLowerCase()}.`,
    };
  } catch (erreur) {
    await connexion.rollback();
    throw erreur;
  } finally {
    connexion.release();
  }
}
