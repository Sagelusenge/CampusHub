import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';

async function idPublication(code) {
  const [lignes] = await baseDeDonnees.execute(
    "SELECT id FROM publications WHERE code_publication = ? AND statut_publication = 'PUBLIEE' LIMIT 1",
    [code.toUpperCase()],
  );
  if (!lignes[0]) throw new ErreurApi(404, 'Publication introuvable.');
  return lignes[0].id;
}
async function idUniversite(code) {
  const [lignes] = await baseDeDonnees.execute('SELECT id FROM universites WHERE code_universite = ? LIMIT 1', [code.toUpperCase()]);
  if (!lignes[0]) throw new ErreurApi(404, 'Université introuvable.');
  return lignes[0].id;
}

export async function basculerJaime(utilisateurId, code) {
  const publicationId = await idPublication(code);
  const [resultats] = await baseDeDonnees.query('CALL sp_basculer_mention_jaime(?, ?)', [utilisateurId, publicationId]);
  return { action: resultats[0][0].action_effectuee };
}
export async function ajouterFavori(utilisateurId, code) {
  await baseDeDonnees.execute('INSERT IGNORE INTO favoris_publications (utilisateur_id, publication_id) VALUES (?, ?)', [utilisateurId, await idPublication(code)]);
  return { favori: true };
}
export async function retirerFavori(utilisateurId, code) {
  await baseDeDonnees.execute('DELETE FROM favoris_publications WHERE utilisateur_id = ? AND publication_id = ?', [utilisateurId, await idPublication(code)]);
  return { favori: false };
}
export async function listerFavoris(utilisateurId) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT v.* FROM favoris_publications f
     JOIN publications p ON p.id = f.publication_id
     JOIN vue_fil_actualite v ON v.code_publication = p.code_publication
     WHERE f.utilisateur_id = ? ORDER BY f.date_creation DESC`, [utilisateurId],
  );
  return lignes;
}
export async function suivreUniversite(utilisateurId, code) {
  await baseDeDonnees.query('CALL sp_suivre_universite(?, ?)', [utilisateurId, await idUniversite(code)]);
  return { abonnement: true };
}
export async function nePlusSuivreUniversite(utilisateurId, code) {
  await baseDeDonnees.execute('DELETE FROM abonnements_universites WHERE utilisateur_id = ? AND universite_id = ?', [utilisateurId, await idUniversite(code)]);
  return { abonnement: false };
}
export async function listerUniversitesSuivies(utilisateurId) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT v.* FROM abonnements_universites a
     JOIN vue_universites_resume v ON v.id = a.universite_id
     WHERE a.utilisateur_id = ? ORDER BY a.date_creation DESC`, [utilisateurId],
  );
  return lignes;
}
