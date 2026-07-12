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
