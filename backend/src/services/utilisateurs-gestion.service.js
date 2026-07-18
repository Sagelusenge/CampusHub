import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { construireMiseAJour, metaPagination, pagination } from '../utils/sql.js';
import { trouverUtilisateurParId } from './utilisateurs.service.js';

const colonnesPubliques = `id, code_utilisateur, role, statut_verification,
  nom_affichage, url_photo_profil, biographie, pays, ville, province, date_creation`;

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
    baseDeDonnees.execute(
      `SELECT ${colonnesPubliques}, email, statut_compte FROM utilisateurs
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

export async function changerStatutUtilisateur(code, donnees) {
  const [resultat] = await baseDeDonnees.execute(
    `UPDATE utilisateurs SET statut_compte = ?,
       statut_verification = COALESCE(?, statut_verification)
     WHERE code_utilisateur = ?`,
    [donnees.statutCompte, donnees.statutVerification ?? null, code.toUpperCase()],
  );
  if (!resultat.affectedRows) throw new ErreurApi(404, 'Utilisateur introuvable.');
  const [lignes] = await baseDeDonnees.execute(
    'SELECT id, code_utilisateur, email, role, statut_compte, statut_verification FROM utilisateurs WHERE code_utilisateur = ?',
    [code.toUpperCase()],
  );
  return lignes[0];
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
