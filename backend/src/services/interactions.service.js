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

async function universiteAssociee(utilisateur) {
  if (utilisateur.role === 'UNIVERSITE') {
    const [lignes] = await baseDeDonnees.execute(
      'SELECT universite_id FROM membres_universite WHERE utilisateur_id = ? ORDER BY est_proprietaire DESC LIMIT 1',
      [utilisateur.id],
    );
    return lignes[0]?.universite_id ?? null;
  }
  if (utilisateur.role === 'ETUDIANT') {
    const [lignes] = await baseDeDonnees.execute(
      'SELECT universite_id FROM profils_etudiants WHERE utilisateur_id = ? LIMIT 1', [utilisateur.id],
    );
    return lignes[0]?.universite_id ?? null;
  }
  return null;
}

async function publicationCreee(code) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT v.*,
      (SELECT m.url_media FROM medias_publication m WHERE m.publication_id = v.id ORDER BY m.ordre_affichage, m.id LIMIT 1) AS url_media
     FROM vue_fil_actualite v WHERE v.code_publication = ? LIMIT 1`, [code],
  );
  return lignes[0];
}

export async function reposterPublication(utilisateur, code) {
  const [sources] = await baseDeDonnees.execute(
    "SELECT * FROM publications WHERE code_publication = ? AND statut_publication = 'PUBLIEE' LIMIT 1",
    [code.toUpperCase()],
  );
  const source = sources[0];
  if (!source) throw new ErreurApi(404, 'Publication introuvable.');
  if (source.auteur_id === utilisateur.id) throw new ErreurApi(400, 'Vous ne pouvez pas republier votre propre publication.');
  const universiteId = await universiteAssociee(utilisateur);
  const [resultats] = await baseDeDonnees.query('CALL sp_creer_publication(?, ?, ?, ?, ?, ?, 1)', [
    utilisateur.id, universiteId, source.titre, source.contenu, source.type_publication,
    typeof source.etiquettes === 'string' ? source.etiquettes : JSON.stringify(source.etiquettes || []),
  ]);
  const codeCree = resultats[0][0].code_publication;
  const [creees] = await baseDeDonnees.execute('SELECT id FROM publications WHERE code_publication = ?', [codeCree]);
  await baseDeDonnees.execute('UPDATE publications SET publication_source_id = ? WHERE id = ?', [source.id, creees[0].id]);
  await baseDeDonnees.execute(
    `INSERT INTO medias_publication
      (id, code_media, publication_id, type_media, url_media, url_miniature, identifiant_stockage,
       type_mime, taille_octets, largeur_pixels, hauteur_pixels, duree_secondes, ordre_affichage)
     SELECT 0, '', ?, type_media, url_media, url_miniature, identifiant_stockage,
       type_mime, taille_octets, largeur_pixels, hauteur_pixels, duree_secondes, ordre_affichage
     FROM medias_publication WHERE publication_id = ?`, [creees[0].id, source.id],
  );
  return publicationCreee(codeCree);
}

export async function reposterOffre(utilisateur, code) {
  const [sources] = await baseDeDonnees.execute(
    `SELECT * FROM offres_etablissements WHERE code_offre = ? AND statut = 'PUBLIEE'
       AND (date_limite IS NULL OR date_limite >= CURRENT_DATE) LIMIT 1`, [code.toUpperCase()],
  );
  const source = sources[0];
  if (!source) throw new ErreurApi(404, 'Offre introuvable ou expirée.');
  const universiteId = await universiteAssociee(utilisateur);
  const [resultats] = await baseDeDonnees.query('CALL sp_creer_publication(?, ?, ?, ?, ?, ?, 1)', [
    utilisateur.id, universiteId, source.titre, source.description, 'ANNONCE',
    JSON.stringify(['offre', source.type_offre.toLowerCase()]),
  ]);
  const codeCree = resultats[0][0].code_publication;
  const [creees] = await baseDeDonnees.execute('SELECT id FROM publications WHERE code_publication = ?', [codeCree]);
  await baseDeDonnees.execute('UPDATE publications SET offre_source_id = ? WHERE id = ?', [source.id, creees[0].id]);
  if (source.url_image) {
    await baseDeDonnees.execute(
      `INSERT INTO medias_publication (id, code_media, publication_id, type_media, url_media, ordre_affichage)
       VALUES (0, '', ?, 'IMAGE', ?, 0)`, [creees[0].id, source.url_image],
    );
  }
  return publicationCreee(codeCree);
}
