import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';

export async function creerDemandeAffiliation(etudiantId, donnees) {
  const [[universites], [filieres], [existantes]] = await Promise.all([
    baseDeDonnees.execute(`SELECT id FROM universites WHERE code_universite = ? AND statut_verification = 'VERIFIEE' LIMIT 1`, [donnees.codeUniversite.toUpperCase()]),
    baseDeDonnees.execute(`SELECT id, universite_id FROM filieres WHERE code_filiere = ? AND est_active = 1 LIMIT 1`, [donnees.codeFiliere.toUpperCase()]),
    baseDeDonnees.execute(`SELECT id FROM demandes_affiliation_etudiante WHERE etudiant_id = ? AND statut IN ('EN_ATTENTE','ACCEPTEE') LIMIT 1`, [etudiantId]),
  ]);
  if (!universites[0]) throw new ErreurApi(404, 'Université vérifiée introuvable.');
  if (!filieres[0] || filieres[0].universite_id !== universites[0].id) throw new ErreurApi(400, 'Cette filière ne dépend pas de l’université choisie.');
  if (existantes[0]) throw new ErreurApi(409, 'Vous avez déjà une demande active.');
  await baseDeDonnees.execute(
    `INSERT INTO demandes_affiliation_etudiante
      (id, code_demande, etudiant_id, universite_id, filiere_id, matricule_etudiant, message_etudiant)
     VALUES (0, '', ?, ?, ?, ?, ?)`,
    [etudiantId, universites[0].id, filieres[0].id, donnees.matriculeEtudiant ?? null, donnees.message ?? null],
  );
  await baseDeDonnees.execute(
    `INSERT INTO notifications (id, code_notification, destinataire_id, acteur_id, type_notification, titre, message)
     SELECT 0, '', m.utilisateur_id, ?, 'AFFILIATION', 'Nouvelle demande étudiante',
       'Un étudiant souhaite être confirmé dans votre université.'
     FROM membres_universite m WHERE m.universite_id = ? AND m.est_proprietaire = 1`,
    [etudiantId, universites[0].id],
  );
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
     JOIN utilisateurs e ON e.id = d.etudiant_id
     LEFT JOIN filieres f ON f.id = d.filiere_id
     WHERE m.utilisateur_id = ? ORDER BY FIELD(d.statut, 'EN_ATTENTE','ACCEPTEE','REJETEE'), d.date_creation DESC`,
    [gestionnaireId],
  );
  return lignes;
}

export async function traiterDemandeAffiliation(code, gestionnaireId, donnees) {
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.beginTransaction();
    const [demandes] = await connexion.execute(
      `SELECT d.* FROM demandes_affiliation_etudiante d
       JOIN membres_universite m ON m.universite_id = d.universite_id
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
    const [lignes] = await connexion.execute('SELECT * FROM demandes_affiliation_etudiante WHERE id = ?', [demande.id]);
    return lignes[0];
  } catch (erreur) { await connexion.rollback(); throw erreur; }
  finally { connexion.release(); }
}
