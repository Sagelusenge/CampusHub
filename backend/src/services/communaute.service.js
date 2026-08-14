import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';

function json(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

async function institutionGeree(utilisateurId) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT u.* FROM membres_universite m
     JOIN universites u ON u.id = m.universite_id
     WHERE m.utilisateur_id = ? LIMIT 1`,
    [utilisateurId],
  );
  if (!lignes[0]) throw new ErreurApi(403, 'Aucun établissement n’est associé à ce compte.');
  return lignes[0];
}

export async function suggestionsRelations(utilisateurId, recherche = '') {
  const terme = `%${recherche}%`;
  const [lignes] = await baseDeDonnees.execute(
    `SELECT u.code_utilisateur, u.nom_affichage, u.url_photo_profil, u.role,
            pe.titre_profil AS titre, un.nom AS nom_etablissement,
            r.code_relation, r.statut AS statut_relation,
            CASE WHEN r.destinataire_id = ? THEN 'RECUE' WHEN r.demandeur_id = ? THEN 'ENVOYEE' ELSE NULL END AS sens_relation
     FROM utilisateurs u
     LEFT JOIN profils_etudiants pe ON pe.utilisateur_id = u.id AND pe.statut_institution = 'ACTIF'
     LEFT JOIN universites un ON un.id = pe.universite_id
     LEFT JOIN relations_utilisateurs r
       ON r.cle_relation = CONCAT(LEAST(?, u.id), ':', GREATEST(?, u.id))
     WHERE u.id <> ? AND u.role IN ('VISITEUR', 'ETUDIANT', 'UNIVERSITE') AND u.statut_compte = 'ACTIF'
       AND (? = '%%' OR u.nom_affichage LIKE ? OR u.code_utilisateur LIKE ? OR un.nom LIKE ?)
     ORDER BY (r.statut IS NULL) DESC, u.nom_affichage
     LIMIT 60`,
    [utilisateurId, utilisateurId, utilisateurId, utilisateurId, utilisateurId, terme, terme, terme, terme],
  );
  return lignes;
}

export async function invitationsRelations(utilisateurId) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT r.code_relation, r.message, r.statut, r.date_creation,
            u.code_utilisateur, u.nom_affichage, u.url_photo_profil, u.role
     FROM relations_utilisateurs r
     JOIN utilisateurs u ON u.id = r.demandeur_id
     WHERE r.destinataire_id = ? AND r.statut = 'EN_ATTENTE'
     ORDER BY r.date_creation DESC`,
    [utilisateurId],
  );
  return lignes;
}

export async function listerRelations(utilisateurId) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT r.code_relation, r.date_reponse,
            u.code_utilisateur, u.nom_affichage, u.url_photo_profil, u.role,
            pe.titre_profil AS titre, un.nom AS nom_etablissement
     FROM relations_utilisateurs r
     JOIN utilisateurs u ON u.id = IF(r.demandeur_id = ?, r.destinataire_id, r.demandeur_id)
     LEFT JOIN profils_etudiants pe ON pe.utilisateur_id = u.id AND pe.statut_institution = 'ACTIF'
     LEFT JOIN universites un ON un.id = pe.universite_id
     WHERE (r.demandeur_id = ? OR r.destinataire_id = ?) AND r.statut = 'ACCEPTEE'
     ORDER BY u.nom_affichage`,
    [utilisateurId, utilisateurId, utilisateurId],
  );
  return lignes;
}

export async function inviterRelation(utilisateur, donnees) {
  const [destinataires] = await baseDeDonnees.execute(
    `SELECT id, nom_affichage FROM utilisateurs
     WHERE code_utilisateur = ? AND role IN ('VISITEUR', 'ETUDIANT', 'UNIVERSITE')
       AND statut_compte = 'ACTIF' LIMIT 1`,
    [donnees.codeDestinataire.toUpperCase()],
  );
  const destinataire = destinataires[0];
  if (!destinataire) throw new ErreurApi(404, 'Étudiant introuvable.');
  if (destinataire.id === utilisateur.id) throw new ErreurApi(400, 'Vous ne pouvez pas vous inviter vous-même.');
  const cle = `${Math.min(utilisateur.id, destinataire.id)}:${Math.max(utilisateur.id, destinataire.id)}`;
  const [existantes] = await baseDeDonnees.execute(
    'SELECT id, statut FROM relations_utilisateurs WHERE cle_relation = ? LIMIT 1',
    [cle],
  );
  if (existantes[0]?.statut === 'EN_ATTENTE') throw new ErreurApi(409, 'Une invitation est déjà en attente.');
  if (existantes[0]?.statut === 'ACCEPTEE') throw new ErreurApi(409, 'Cette personne fait déjà partie de vos relations.');
  if (existantes[0]) {
    await baseDeDonnees.execute(
      `UPDATE relations_utilisateurs SET demandeur_id = ?, destinataire_id = ?, message = ?,
       statut = 'EN_ATTENTE', date_reponse = NULL WHERE id = ?`,
      [utilisateur.id, destinataire.id, donnees.message ?? null, existantes[0].id],
    );
  } else {
    await baseDeDonnees.execute(
      `INSERT INTO relations_utilisateurs
       (id, code_relation, cle_relation, demandeur_id, destinataire_id, message)
       VALUES (0, '', ?, ?, ?, ?)`,
      [cle, utilisateur.id, destinataire.id, donnees.message ?? null],
    );
  }
  await baseDeDonnees.execute(
    `INSERT INTO notifications
     (id, code_notification, destinataire_id, acteur_id, type_notification, titre, message)
     VALUES (0, '', ?, ?, 'SYSTEME', 'Nouvelle invitation', ?)`,
    [destinataire.id, utilisateur.id, `${utilisateur.nom_affichage} souhaite entrer en relation avec vous.`],
  );
  return { envoyee: true, destinataire: destinataire.nom_affichage };
}

export async function repondreInvitation(utilisateurId, code, statut) {
  const [resultat] = await baseDeDonnees.execute(
    `UPDATE relations_utilisateurs SET statut = ?, date_reponse = CURRENT_TIMESTAMP
     WHERE code_relation = ? AND destinataire_id = ? AND statut = 'EN_ATTENTE'`,
    [statut, code.toUpperCase(), utilisateurId],
  );
  if (!resultat.affectedRows) throw new ErreurApi(404, 'Invitation en attente introuvable.');
  const [relations] = await baseDeDonnees.execute(
    'SELECT demandeur_id FROM relations_utilisateurs WHERE code_relation = ? LIMIT 1',
    [code.toUpperCase()],
  );
  if (relations[0]) {
    await baseDeDonnees.execute(
      `INSERT INTO notifications
       (id, code_notification, destinataire_id, acteur_id, type_notification, titre, message)
       VALUES (0, '', ?, ?, 'SYSTEME', ?, ?)`,
      [relations[0].demandeur_id, utilisateurId,
        statut === 'ACCEPTEE' ? 'Invitation acceptée' : 'Invitation refusée',
        statut === 'ACCEPTEE' ? 'Votre invitation a été acceptée.' : 'Votre invitation n’a pas été acceptée.'],
    );
  }
  return { statut };
}

export async function retirerRelation(utilisateurId, codeUtilisateur) {
  const [utilisateurs] = await baseDeDonnees.execute(
    'SELECT id FROM utilisateurs WHERE code_utilisateur = ? LIMIT 1',
    [codeUtilisateur.toUpperCase()],
  );
  if (!utilisateurs[0]) throw new ErreurApi(404, 'Utilisateur introuvable.');
  const [resultat] = await baseDeDonnees.execute(
    `UPDATE relations_utilisateurs SET statut = 'ANNULEE'
     WHERE cle_relation = CONCAT(LEAST(?, ?), ':', GREATEST(?, ?)) AND statut = 'ACCEPTEE'`,
    [utilisateurId, utilisateurs[0].id, utilisateurId, utilisateurs[0].id],
  );
  if (!resultat.affectedRows) throw new ErreurApi(404, 'Relation introuvable.');
  return { retiree: true };
}

export async function obtenirFormulairePublic(codeUniversite) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT f.*, u.code_universite, u.nom AS nom_etablissement, u.url_logo, u.categorie_etablissement
     FROM formulaires_inscription f JOIN universites u ON u.id = f.universite_id
     WHERE u.code_universite = ? AND f.est_actif = 1 AND u.inscriptions_ouvertes = 1
       AND (u.date_debut_inscription IS NULL OR u.date_debut_inscription <= CURRENT_DATE)
       AND (u.date_fin_inscription IS NULL OR u.date_fin_inscription >= CURRENT_DATE)
       AND (f.date_fermeture IS NULL OR f.date_fermeture >= CURRENT_DATE) LIMIT 1`,
    [codeUniversite.toUpperCase()],
  );
  if (!lignes[0]) throw new ErreurApi(404, 'Les inscriptions en ligne ne sont pas ouvertes pour cet établissement.');
  return { ...lignes[0], champs: json(lignes[0].champs, []) };
}

export async function obtenirFormulaireGestionnaire(utilisateurId) {
  const institution = await institutionGeree(utilisateurId);
  const [lignes] = await baseDeDonnees.execute(
    'SELECT * FROM formulaires_inscription WHERE universite_id = ? LIMIT 1',
    [institution.id],
  );
  return { institution, formulaire: lignes[0] ? { ...lignes[0], champs: json(lignes[0].champs, []) } : null };
}

export async function enregistrerFormulaire(utilisateurId, donnees) {
  const institution = await institutionGeree(utilisateurId);
  await baseDeDonnees.execute(
    `INSERT INTO formulaires_inscription
     (id, code_formulaire, universite_id, titre, description, instructions, champs, date_fermeture, est_actif)
     VALUES (0, '', ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE titre = VALUES(titre), description = VALUES(description),
       instructions = VALUES(instructions), champs = VALUES(champs),
       date_fermeture = VALUES(date_fermeture), est_actif = VALUES(est_actif)`,
    [institution.id, donnees.titre, donnees.description ?? null, donnees.instructions ?? null,
      JSON.stringify(donnees.champs), donnees.dateFermeture ?? null, donnees.estActif ? 1 : 0],
  );
  await baseDeDonnees.execute(
    `UPDATE universites
     SET inscriptions_ouvertes = ?, date_fin_inscription = ?
     WHERE id = ?`,
    [donnees.estActif ? 1 : 0, donnees.dateFermeture ?? null, institution.id],
  );
  return obtenirFormulaireGestionnaire(utilisateurId);
}

export async function soumettreInscription(utilisateur, codeUniversite, reponses) {
  const formulaire = await obtenirFormulairePublic(codeUniversite);
  const manquants = formulaire.champs
    .filter((champ) => champ.obligatoire && String(reponses[champ.id] ?? '').trim() === '')
    .map((champ) => champ.label);
  if (manquants.length) throw new ErreurApi(400, `Champs obligatoires manquants : ${manquants.join(', ')}.`);
  try {
    await baseDeDonnees.execute(
      `INSERT INTO demandes_inscription_ligne
       (id, code_demande, formulaire_id, universite_id, candidat_id, reponses)
       VALUES (0, '', ?, ?, ?, ?)`,
      [formulaire.id, formulaire.universite_id, utilisateur.id, JSON.stringify(reponses)],
    );
  } catch (erreur) {
    if (erreur.code === 'ER_DUP_ENTRY') throw new ErreurApi(409, 'Vous avez déjà soumis ce formulaire.');
    throw erreur;
  }
  await baseDeDonnees.execute(
    `INSERT INTO notifications
     (id, code_notification, destinataire_id, acteur_id, type_notification, titre, message)
     SELECT 0, '', m.utilisateur_id, ?, 'SYSTEME', 'Nouvelle inscription en ligne', ?
     FROM membres_universite m WHERE m.universite_id = ?`,
    [utilisateur.id, `${utilisateur.nom_affichage} a envoyé un dossier d’inscription.`, formulaire.universite_id],
  );
  const [lignes] = await baseDeDonnees.execute(
    `SELECT code_demande, statut, date_creation FROM demandes_inscription_ligne
     WHERE formulaire_id = ? AND candidat_id = ? LIMIT 1`,
    [formulaire.id, utilisateur.id],
  );
  return lignes[0];
}

export async function listerDemandesGestionnaire(utilisateurId) {
  const institution = await institutionGeree(utilisateurId);
  const [lignes] = await baseDeDonnees.execute(
    `SELECT d.code_demande, d.statut, d.reponses, d.note_etablissement,
            d.date_creation, d.date_traitement,
            u.code_utilisateur AS code_candidat, u.nom_affichage AS nom_candidat,
            u.email, NULL AS telephone
     FROM demandes_inscription_ligne d JOIN utilisateurs u ON u.id = d.candidat_id
     WHERE d.universite_id = ?
     ORDER BY FIELD(d.statut, 'SOUMISE','EN_ETUDE','DOCUMENTS_REQUIS','ACCEPTEE','REFUSEE'), d.date_creation DESC`,
    [institution.id],
  );
  return lignes.map((ligne) => ({ ...ligne, reponses: json(ligne.reponses, {}) }));
}

export async function traiterInscription(utilisateurId, code, donnees) {
  const institution = await institutionGeree(utilisateurId);
  const [demandes] = await baseDeDonnees.execute(
    'SELECT * FROM demandes_inscription_ligne WHERE code_demande = ? AND universite_id = ? LIMIT 1',
    [code.toUpperCase(), institution.id],
  );
  if (!demandes[0]) throw new ErreurApi(404, 'Demande d’inscription introuvable.');
  await baseDeDonnees.execute(
    `UPDATE demandes_inscription_ligne SET statut = ?, note_etablissement = ?,
     traite_par_id = ?, date_traitement = CURRENT_TIMESTAMP WHERE id = ?`,
    [donnees.statut, donnees.noteEtablissement ?? null, utilisateurId, demandes[0].id],
  );
  await baseDeDonnees.execute(
    `INSERT INTO notifications
     (id, code_notification, destinataire_id, acteur_id, type_notification, titre, message)
     VALUES (0, '', ?, ?, 'SYSTEME', 'Mise à jour de votre inscription', ?)`,
    [demandes[0].candidat_id, utilisateurId, donnees.noteEtablissement || `Votre dossier est maintenant : ${donnees.statut}.`],
  );
  return { codeDemande: code.toUpperCase(), statut: donnees.statut };
}

export async function listerPartenairesPublics(codeUniversite) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT p.code_partenaire, p.nom, p.categorie, p.description, p.site_web, p.url_logo
     FROM partenaires_universite p JOIN universites u ON u.id = p.universite_id
     WHERE u.code_universite = ? AND p.est_actif = 1 ORDER BY p.nom`,
    [codeUniversite.toUpperCase()],
  );
  return lignes;
}

export async function listerPartenairesGestionnaire(utilisateurId) {
  const institution = await institutionGeree(utilisateurId);
  const [lignes] = await baseDeDonnees.execute(
    'SELECT * FROM partenaires_universite WHERE universite_id = ? ORDER BY nom',
    [institution.id],
  );
  return { institution, partenaires: lignes };
}

export async function creerPartenaire(utilisateurId, donnees) {
  const institution = await institutionGeree(utilisateurId);
  try {
    await baseDeDonnees.execute(
      `INSERT INTO partenaires_universite
       (id, code_partenaire, universite_id, nom, categorie, description, site_web, url_logo, est_actif)
       VALUES (0, '', ?, ?, ?, ?, ?, ?, ?)`,
      [institution.id, donnees.nom, donnees.categorie, donnees.description ?? null,
        donnees.siteWeb || null, donnees.urlLogo || null, donnees.estActif ? 1 : 0],
    );
  } catch (erreur) {
    if (erreur.code === 'ER_DUP_ENTRY') throw new ErreurApi(409, 'Ce partenaire existe déjà.');
    throw erreur;
  }
  return listerPartenairesGestionnaire(utilisateurId);
}

export async function supprimerPartenaire(utilisateurId, code) {
  const institution = await institutionGeree(utilisateurId);
  const [resultat] = await baseDeDonnees.execute(
    'DELETE FROM partenaires_universite WHERE code_partenaire = ? AND universite_id = ?',
    [code.toUpperCase(), institution.id],
  );
  if (!resultat.affectedRows) throw new ErreurApi(404, 'Partenaire introuvable.');
  return { supprime: true };
}
