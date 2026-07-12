import { baseDeDonnees } from '../config/base-de-donnees.js';

const colonnesPubliques = `
  id, code_utilisateur, email, role, statut_compte, statut_verification,
  nom_affichage, url_photo_profil, biographie, pays, ville, province,
  date_verification_email, date_derniere_connexion, date_creation
`;

export async function trouverUtilisateurParId(id) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT ${colonnesPubliques} FROM utilisateurs WHERE id = ? LIMIT 1`,
    [id],
  );
  return lignes[0] ?? null;
}

export async function trouverUtilisateurParEmail(email, inclureMotDePasse = false) {
  const colonnes = inclureMotDePasse
    ? `${colonnesPubliques}, mot_de_passe_hash`
    : colonnesPubliques;
  const [lignes] = await baseDeDonnees.execute(
    `SELECT ${colonnes} FROM utilisateurs WHERE email = ? LIMIT 1`,
    [email.toLowerCase()],
  );
  return lignes[0] ?? null;
}

export async function enregistrerDerniereConnexion(id) {
  await baseDeDonnees.execute(
    'UPDATE utilisateurs SET date_derniere_connexion = CURRENT_TIMESTAMP WHERE id = ?',
    [id],
  );
}
