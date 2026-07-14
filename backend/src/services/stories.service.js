import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';

export async function listerStories(utilisateurId) {
  await baseDeDonnees.execute('DELETE FROM stories WHERE date_expiration <= CURRENT_TIMESTAMP');
  const [lignes] = await baseDeDonnees.execute(
    `SELECT s.code_story, s.type_media, s.url_media, s.texte, s.couleur_fond,
      s.date_creation, s.date_expiration, u.code_utilisateur AS code_auteur,
      u.nom_affichage AS nom_auteur, u.url_photo_profil,
      EXISTS(SELECT 1 FROM vues_stories vs WHERE vs.story_id = s.id AND vs.utilisateur_id = ?) AS deja_vue,
      (SELECT COUNT(*) FROM vues_stories vs WHERE vs.story_id = s.id) AS nombre_vues
     FROM stories s JOIN utilisateurs u ON u.id = s.auteur_id
     WHERE s.date_expiration > CURRENT_TIMESTAMP AND u.statut_compte = 'ACTIF'
     ORDER BY (s.auteur_id = ?) DESC, deja_vue ASC, s.date_creation ASC`,
    [utilisateurId, utilisateurId],
  );
  return lignes;
}

export async function creerStory(utilisateurId, donnees) {
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.execute(
      `INSERT INTO stories (id, code_story, auteur_id, type_media, url_media, texte, couleur_fond, date_expiration)
       VALUES (0, '', ?, ?, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 24 HOUR))`,
      [utilisateurId, donnees.typeMedia, donnees.urlMedia, donnees.texte ?? null, donnees.couleurFond ?? null],
    );
    const [lignes] = await connexion.query('SELECT * FROM stories WHERE id = @campushub_dernier_id');
    return lignes[0];
  } finally { connexion.release(); }
}

async function trouverStory(code) {
  const [lignes] = await baseDeDonnees.execute('SELECT * FROM stories WHERE code_story = ? LIMIT 1', [code.toUpperCase()]);
  if (!lignes[0] || new Date(lignes[0].date_expiration) <= new Date()) throw new ErreurApi(404, 'Story introuvable ou expirée.');
  return lignes[0];
}

export async function marquerVue(code, utilisateurId) {
  const story = await trouverStory(code);
  await baseDeDonnees.execute('INSERT IGNORE INTO vues_stories (story_id, utilisateur_id) VALUES (?, ?)', [story.id, utilisateurId]);
  return { vue: true };
}

export async function supprimerStory(code, utilisateur) {
  const story = await trouverStory(code);
  if (Number(story.auteur_id) !== Number(utilisateur.id) && utilisateur.role !== 'ADMINISTRATEUR') {
    throw new ErreurApi(403, 'Vous ne pouvez pas supprimer cette story.');
  }
  await baseDeDonnees.execute('DELETE FROM stories WHERE id = ?', [story.id]);
  return { storySupprimee: true };
}
