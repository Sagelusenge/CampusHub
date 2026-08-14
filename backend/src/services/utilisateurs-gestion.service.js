import bcrypt from 'bcryptjs';
import { baseDeDonnees } from '../config/base-de-donnees.js';
import { environnement } from '../config/environnement.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { construireMiseAJour, metaPagination, pagination } from '../utils/sql.js';
import { trouverUtilisateurParId } from './utilisateurs.service.js';

const colonnesPubliques = `id, code_utilisateur, role, statut_verification,
  nom_affichage, url_photo_profil, biographie, pays, ville, province, date_creation`;
const rolesAdministrables = new Set(['VISITEUR', 'ETUDIANT', 'ENTREPRISE', 'ADMINISTRATEUR']);

function verifierRoleAdministrable(role) {
  if (!rolesAdministrables.has(role)) {
    throw new ErreurApi(400, 'Les comptes institutionnels doivent passer par le formulaire de demande d’établissement.');
  }
}

async function obtenirUtilisateurAdministration(code, connexion = baseDeDonnees) {
  const [lignes] = await connexion.execute(
    `SELECT ${colonnesPubliques}, email, statut_compte, date_verification_email,
       (SELECT matricule_etudiant FROM profils_etudiants pe WHERE pe.utilisateur_id = utilisateurs.id LIMIT 1) AS matricule_etudiant
     FROM utilisateurs WHERE code_utilisateur = ? LIMIT 1`,
    [code.toUpperCase()],
  );
  if (!lignes[0]) throw new ErreurApi(404, 'Utilisateur introuvable.');
  return lignes[0];
}

export async function listerUtilisateurs(filtres) {
  const { page, limite, decalage } = pagination(filtres.page, filtres.limite);
  const conditions = ['1 = 1'];
  const valeurs = [];
  if (filtres.role) { conditions.push('role = ?'); valeurs.push(filtres.role); }
  if (filtres.statut) { conditions.push('statut_compte = ?'); valeurs.push(filtres.statut); }
  if (filtres.recherche) {
    conditions.push('(nom_affichage LIKE ? OR email LIKE ? OR code_utilisateur = ?)');
    valeurs.push(`%${filtres.recherche}%`, `%${filtres.recherche}%`, filtres.recherche.toUpperCase());
  }
  const where = conditions.join(' AND ');
  const [[lignes], [comptage]] = await Promise.all([
    baseDeDonnees.query(
      `SELECT ${colonnesPubliques}, email, statut_compte, date_verification_email,
        (SELECT matricule_etudiant FROM profils_etudiants pe WHERE pe.utilisateur_id = utilisateurs.id LIMIT 1) AS matricule_etudiant
       FROM utilisateurs
       WHERE ${where} ORDER BY date_creation DESC LIMIT ? OFFSET ?`,
      [...valeurs, limite, decalage],
    ),
    baseDeDonnees.execute(`SELECT COUNT(*) AS total FROM utilisateurs WHERE ${where}`, valeurs),
  ]);
  return { utilisateurs: lignes, meta: metaPagination(comptage[0].total, page, limite) };
}

export async function obtenirUtilisateurPublic(code) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT ${colonnesPubliques} FROM utilisateurs
     WHERE code_utilisateur = ? AND statut_compte = 'ACTIF' LIMIT 1`,
    [code.toUpperCase()],
  );
  if (!lignes[0]) throw new ErreurApi(404, 'Utilisateur introuvable.');
  return lignes[0];
}

async function statistiquesSociales(utilisateurId) {
  const [[compteurs], [abonnes], [suivis]] = await Promise.all([
    baseDeDonnees.execute(
      `SELECT
        (SELECT COUNT(*) FROM abonnements_utilisateurs WHERE utilisateur_suivi_id = ?) AS nombre_abonnes,
        (SELECT COUNT(*) FROM abonnements_utilisateurs WHERE abonne_id = ?) AS nombre_suivis,
        (SELECT COUNT(*) FROM mentions_jaime j JOIN publications p ON p.id = j.publication_id
         WHERE p.auteur_id = ?) AS nombre_jaime,
        (SELECT COUNT(*) FROM publications p WHERE p.auteur_id = ?
         AND (p.publication_source_id IS NOT NULL OR p.offre_source_id IS NOT NULL)) AS nombre_republications`,
      [utilisateurId, utilisateurId, utilisateurId, utilisateurId],
    ),
    baseDeDonnees.execute(
      `SELECT u.code_utilisateur, u.nom_affichage, u.url_photo_profil, u.role
       FROM abonnements_utilisateurs a JOIN utilisateurs u ON u.id = a.abonne_id
       WHERE a.utilisateur_suivi_id = ? ORDER BY a.date_creation DESC LIMIT 100`, [utilisateurId],
    ),
    baseDeDonnees.execute(
      `SELECT u.code_utilisateur, u.nom_affichage, u.url_photo_profil, u.role
       FROM abonnements_utilisateurs a JOIN utilisateurs u ON u.id = a.utilisateur_suivi_id
       WHERE a.abonne_id = ? ORDER BY a.date_creation DESC LIMIT 100`, [utilisateurId],
    ),
  ]);
  return { ...compteurs[0], abonnes, suivis };
}

export async function obtenirMesStatistiquesSociales(utilisateurId) {
  return statistiquesSociales(utilisateurId);
}

export async function obtenirStatistiquesSocialesPubliques(code) {
  const [lignes] = await baseDeDonnees.execute(
    "SELECT id FROM utilisateurs WHERE code_utilisateur = ? AND statut_compte = 'ACTIF' LIMIT 1",
    [code.toUpperCase()],
  );
  if (!lignes[0]) throw new ErreurApi(404, 'Utilisateur introuvable.');
  return statistiquesSociales(lignes[0].id);
}

export async function modifierMonCompte(id, donnees) {
  const { clause, valeurs } = construireMiseAJour(donnees, {
    nomAffichage: 'nom_affichage', biographie: 'biographie',
    urlPhotoProfil: 'url_photo_profil', ville: 'ville', province: 'province',
  });
  await baseDeDonnees.execute(`UPDATE utilisateurs SET ${clause} WHERE id = ?`, [...valeurs, id]);
  return trouverUtilisateurParId(id);
}

export async function creerUtilisateurParAdministration(donnees) {
  verifierRoleAdministrable(donnees.role);
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.beginTransaction();
    const [existants] = await connexion.execute('SELECT id FROM utilisateurs WHERE email = ? LIMIT 1', [donnees.email.toLowerCase()]);
    if (existants[0]) throw new ErreurApi(409, 'Un compte utilise déjà cette adresse e-mail.');
    if (donnees.role === 'ETUDIANT') {
      const [matricules] = await connexion.execute('SELECT id FROM profils_etudiants WHERE matricule_etudiant = ? LIMIT 1', [donnees.matriculeEtudiant]);
      if (matricules[0]) throw new ErreurApi(409, 'Ce matricule étudiant est déjà utilisé.');
    }
    const hash = await bcrypt.hash(donnees.motDePasse, environnement.BCRYPT_ROUNDS);
    await connexion.execute(
      `INSERT INTO utilisateurs
        (id, code_utilisateur, email, mot_de_passe_hash, role, statut_compte,
         statut_verification, nom_affichage, pays, province, ville, date_verification_email)
       VALUES (0, '', ?, ?, ?, 'ACTIF', 'VERIFIE', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        donnees.email.toLowerCase(), hash, donnees.role, donnees.nomAffichage,
        donnees.pays ?? 'République démocratique du Congo', donnees.province ?? null, donnees.ville ?? null,
      ],
    );
    const [crees] = await connexion.execute('SELECT id, code_utilisateur FROM utilisateurs WHERE email = ? LIMIT 1', [donnees.email.toLowerCase()]);
    const cree = crees[0];
    if (donnees.role === 'ETUDIANT') {
      await connexion.query('CALL sp_creer_profil_etudiant(?, ?, ?, ?, ?, ?, ?)', [
        cree.id, null, null, donnees.matriculeEtudiant,
        'Étudiant CampusHub', JSON.stringify([]), null,
      ]);
    }
    await connexion.commit();
    return obtenirUtilisateurAdministration(cree.code_utilisateur, connexion);
  } catch (erreur) {
    await connexion.rollback();
    if (erreur.code === 'ER_DUP_ENTRY') throw new ErreurApi(409, 'L’adresse e-mail ou le matricule est déjà utilisé.');
    throw erreur;
  } finally {
    connexion.release();
  }
}

export async function modifierUtilisateurParAdministration(code, donnees, administrateurId) {
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.beginTransaction();
    const cible = await obtenirUtilisateurAdministration(code, connexion);
    if (cible.role === 'UNIVERSITE') {
      throw new ErreurApi(400, 'Les comptes institutionnels se gèrent depuis le module Établissements.');
    }
    const roleFinal = donnees.role ?? cible.role;
    verifierRoleAdministrable(roleFinal);
    if (cible.id === administrateurId && donnees.role && donnees.role !== cible.role) {
      throw new ErreurApi(400, 'Vous ne pouvez pas modifier votre propre rôle administrateur.');
    }
    if (donnees.email && donnees.email.toLowerCase() !== cible.email) {
      const [existants] = await connexion.execute('SELECT id FROM utilisateurs WHERE email = ? AND id <> ? LIMIT 1', [donnees.email.toLowerCase(), cible.id]);
      if (existants[0]) throw new ErreurApi(409, 'Un compte utilise déjà cette adresse e-mail.');
    }
    const clauses = [];
    const valeurs = [];
    const correspondances = {
      email: 'email', role: 'role', nomAffichage: 'nom_affichage',
      pays: 'pays', province: 'province', ville: 'ville',
    };
    for (const [champ, colonne] of Object.entries(correspondances)) {
      if (Object.hasOwn(donnees, champ)) {
        clauses.push(`${colonne} = ?`);
        valeurs.push(champ === 'email' ? donnees[champ].toLowerCase() : donnees[champ]);
      }
    }
    if (donnees.motDePasse) {
      clauses.push('mot_de_passe_hash = ?');
      valeurs.push(await bcrypt.hash(donnees.motDePasse, environnement.BCRYPT_ROUNDS));
      await connexion.execute('UPDATE jetons_actualisation SET date_revocation = CURRENT_TIMESTAMP WHERE utilisateur_id = ? AND date_revocation IS NULL', [cible.id]);
    }
    if (clauses.length) {
      await connexion.execute(`UPDATE utilisateurs SET ${clauses.join(', ')} WHERE id = ?`, [...valeurs, cible.id]);
    }
    const [profils] = await connexion.execute('SELECT id FROM profils_etudiants WHERE utilisateur_id = ? LIMIT 1', [cible.id]);
    if (roleFinal === 'ETUDIANT') {
      if (Object.hasOwn(donnees, 'matriculeEtudiant') && !donnees.matriculeEtudiant) {
        throw new ErreurApi(400, 'Le matricule étudiant ne peut pas être vide.');
      }
      if (donnees.matriculeEtudiant) {
        const [doublons] = await connexion.execute('SELECT id FROM profils_etudiants WHERE matricule_etudiant = ? AND utilisateur_id <> ? LIMIT 1', [donnees.matriculeEtudiant, cible.id]);
        if (doublons[0]) throw new ErreurApi(409, 'Ce matricule étudiant est déjà utilisé.');
      }
      if (profils[0]) {
        if (Object.hasOwn(donnees, 'matriculeEtudiant')) {
          await connexion.execute('UPDATE profils_etudiants SET matricule_etudiant = ? WHERE utilisateur_id = ?', [donnees.matriculeEtudiant, cible.id]);
        }
      } else {
        if (!donnees.matriculeEtudiant) throw new ErreurApi(400, 'Un matricule est nécessaire pour attribuer le rôle étudiant.');
        await connexion.query('CALL sp_creer_profil_etudiant(?, ?, ?, ?, ?, ?, ?)', [
          cible.id, null, null, donnees.matriculeEtudiant,
          'Étudiant CampusHub', JSON.stringify([]), null,
        ]);
      }
    }
    await connexion.commit();
    return obtenirUtilisateurAdministration(code, connexion);
  } catch (erreur) {
    await connexion.rollback();
    if (erreur.code === 'ER_DUP_ENTRY') throw new ErreurApi(409, 'L’adresse e-mail ou le matricule est déjà utilisé.');
    throw erreur;
  } finally {
    connexion.release();
  }
}

export async function changerStatutUtilisateur(code, donnees, administrateurId) {
  const cible = await obtenirUtilisateurAdministration(code);
  if (cible.role === 'UNIVERSITE' && ['BLOQUE', 'SUPPRIME'].includes(donnees.statutCompte)) {
    throw new ErreurApi(400, 'Les comptes institutionnels se gèrent depuis le module Établissements.');
  }
  if (cible.id === administrateurId && donnees.statutCompte !== 'ACTIF') {
    throw new ErreurApi(400, 'Vous ne pouvez pas désactiver votre propre compte administrateur.');
  }
  const [resultat] = await baseDeDonnees.execute(
    `UPDATE utilisateurs SET statut_compte = ?,
       statut_verification = COALESCE(?, statut_verification)
     WHERE code_utilisateur = ?`,
    [donnees.statutCompte, donnees.statutVerification ?? null, code.toUpperCase()],
  );
  if (!resultat.affectedRows) throw new ErreurApi(404, 'Utilisateur introuvable.');
  if (donnees.statutCompte !== 'ACTIF') {
    await baseDeDonnees.execute(
      'UPDATE jetons_actualisation SET date_revocation = CURRENT_TIMESTAMP WHERE utilisateur_id = ? AND date_revocation IS NULL',
      [cible.id],
    );
  }
  const [lignes] = await baseDeDonnees.execute(
    'SELECT id, code_utilisateur, email, role, statut_compte, statut_verification FROM utilisateurs WHERE code_utilisateur = ?',
    [code.toUpperCase()],
  );
  return lignes[0];
}

export async function supprimerUtilisateurParAdministration(code, administrateurId) {
  const cible = await obtenirUtilisateurAdministration(code);
  if (cible.role === 'UNIVERSITE') {
    throw new ErreurApi(400, 'Les comptes institutionnels se gèrent depuis le module Établissements.');
  }
  if (cible.id === administrateurId) {
    throw new ErreurApi(400, 'Vous ne pouvez pas supprimer votre propre compte administrateur.');
  }
  await baseDeDonnees.execute(
    "UPDATE utilisateurs SET statut_compte = 'SUPPRIME' WHERE id = ?",
    [cible.id],
  );
  await baseDeDonnees.execute(
    'UPDATE jetons_actualisation SET date_revocation = CURRENT_TIMESTAMP WHERE utilisateur_id = ? AND date_revocation IS NULL',
    [cible.id],
  );
  return { code_utilisateur: cible.code_utilisateur, statut_compte: 'SUPPRIME' };
}

export async function suivreUtilisateur(abonneId, codeUtilisateur) {
  const [cibles] = await baseDeDonnees.execute(
    'SELECT id FROM utilisateurs WHERE code_utilisateur = ? AND statut_compte = \'ACTIF\' LIMIT 1',
    [codeUtilisateur.toUpperCase()],
  );
  if (!cibles[0]) throw new ErreurApi(404, 'Utilisateur à suivre introuvable.');
  if (cibles[0].id === abonneId) throw new ErreurApi(400, 'Vous ne pouvez pas suivre votre propre profil.');
  await baseDeDonnees.execute(
    'INSERT IGNORE INTO abonnements_utilisateurs (abonne_id, utilisateur_suivi_id) VALUES (?, ?)',
    [abonneId, cibles[0].id],
  );
  return { abonnement: true };
}

export async function nePlusSuivreUtilisateur(abonneId, codeUtilisateur) {
  await baseDeDonnees.execute(
    `DELETE a FROM abonnements_utilisateurs a
     JOIN utilisateurs u ON u.id = a.utilisateur_suivi_id
     WHERE a.abonne_id = ? AND u.code_utilisateur = ?`,
    [abonneId, codeUtilisateur.toUpperCase()],
  );
  return { abonnement: false };
}
