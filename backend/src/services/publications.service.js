import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { construireMiseAJour, metaPagination, pagination } from '../utils/sql.js';
import { verifierGestionUniversite, verifierProprietaireOuAdmin } from './autorisations.service.js';

async function publicationInterne(code) {
  const [lignes] = await baseDeDonnees.execute(
    'SELECT * FROM publications WHERE code_publication = ? LIMIT 1', [code.toUpperCase()],
  );
  if (!lignes[0]) throw new ErreurApi(404, 'Publication introuvable.');
  return lignes[0];
}

export async function listerPublications(filtres) {
  const { page, limite, decalage } = pagination(filtres.page, filtres.limite);
  const conditions = ['1 = 1'];
  const valeurs = [];
  if (filtres.universite) { conditions.push('code_universite = ?'); valeurs.push(filtres.universite.toUpperCase()); }
  if (filtres.auteur) { conditions.push('code_auteur = ?'); valeurs.push(filtres.auteur.toUpperCase()); }
  if (filtres.type) { conditions.push('type_publication = ?'); valeurs.push(filtres.type); }
  if (filtres.etiquette) { conditions.push('JSON_SEARCH(etiquettes, \'one\', ?) IS NOT NULL'); valeurs.push(`%${filtres.etiquette}%`); }
  const where = conditions.join(' AND ');
  const [[lignes], [compte]] = await Promise.all([
    baseDeDonnees.query(
      `SELECT v.*,
        (SELECT m.url_media FROM medias_publication m
         WHERE m.publication_id = v.id ORDER BY m.ordre_affichage, m.id LIMIT 1) AS url_media,
        (SELECT m.type_media FROM medias_publication m
         WHERE m.publication_id = v.id ORDER BY m.ordre_affichage, m.id LIMIT 1) AS type_media
       FROM vue_fil_actualite v WHERE ${where}
       ORDER BY date_publication DESC LIMIT ? OFFSET ?`,
      [...valeurs, limite, decalage],
    ),
    baseDeDonnees.execute(`SELECT COUNT(*) AS total FROM vue_fil_actualite WHERE ${where}`, valeurs),
  ]);
  return { publications: lignes, meta: metaPagination(compte[0].total, page, limite) };
}

export async function listerMesPublications(utilisateur) {
  let condition = 'p.auteur_id = ?';
  const valeurs = [utilisateur.id];

  if (utilisateur.role === 'UNIVERSITE') {
    const [etablissements] = await baseDeDonnees.execute(
      `SELECT universite_id FROM membres_universite
       WHERE utilisateur_id = ?`,
      [utilisateur.id],
    );
    const ids = etablissements.map((item) => item.universite_id);
    if (ids.length) {
      condition = `(p.auteur_id = ? OR p.universite_id IN (${ids.map(() => '?').join(',')}))`;
      valeurs.push(...ids);
    }
  }

  const [lignes] = await baseDeDonnees.query(
    `SELECT p.*, a.code_utilisateur AS code_auteur, a.nom_affichage AS nom_auteur,
       a.url_photo_profil AS photo_auteur, u.code_universite, u.nom AS nom_universite,
       (SELECT m.url_media FROM medias_publication m
        WHERE m.publication_id = p.id ORDER BY m.ordre_affichage, m.id LIMIT 1) AS url_media,
       (SELECT m.type_media FROM medias_publication m
        WHERE m.publication_id = p.id ORDER BY m.ordre_affichage, m.id LIMIT 1) AS type_media,
       (SELECT COUNT(*) FROM mentions_jaime j WHERE j.publication_id = p.id) AS nombre_jaime,
       (SELECT COUNT(*) FROM commentaires c WHERE c.publication_id = p.id) AS nombre_commentaires
     FROM publications p
     JOIN utilisateurs a ON a.id = p.auteur_id
     LEFT JOIN universites u ON u.id = p.universite_id
     WHERE ${condition}
     ORDER BY COALESCE(p.date_publication, p.date_creation) DESC
     LIMIT 100`,
    valeurs,
  );
  return lignes;
}

export async function obtenirPublication(code) {
  const publication = await publicationInterne(code);
  if (publication.statut_publication !== 'PUBLIEE') throw new ErreurApi(404, 'Publication introuvable.');
  const [[auteurs], [medias], [commentaires]] = await Promise.all([
    baseDeDonnees.execute('SELECT code_utilisateur, nom_affichage, url_photo_profil FROM utilisateurs WHERE id = ?', [publication.auteur_id]),
    baseDeDonnees.execute('SELECT * FROM medias_publication WHERE publication_id = ? ORDER BY ordre_affichage', [publication.id]),
    baseDeDonnees.execute(
      `SELECT c.id AS id_commentaire, c.code_commentaire, c.contenu, c.code_commentaire AS code, c.commentaire_parent_id,
        c.date_creation, c.date_modification, u.code_utilisateur AS code_auteur,
        u.nom_affichage AS nom_auteur, u.url_photo_profil
       FROM commentaires c JOIN utilisateurs u ON u.id = c.auteur_id
       WHERE c.publication_id = ? ORDER BY c.date_creation`, [publication.id],
    ),
  ]);
  const [[compteurs]] = await baseDeDonnees.execute(
    `SELECT
      (SELECT COUNT(*) FROM mentions_jaime WHERE publication_id = ?) AS nombre_jaime,
      (SELECT COUNT(*) FROM favoris_publications WHERE publication_id = ?) AS nombre_favoris`,
    [publication.id, publication.id],
  );
  return { ...publication, auteur: auteurs[0], medias, commentaires, ...compteurs };
}

export async function creerPublication(utilisateur, donnees) {
  if (utilisateur.role === 'VISITEUR') {
    throw new ErreurApi(403, 'Le compte visiteur peut consulter le réseau, mais ne peut pas publier.');
  }
  let universiteId = null;
  if (donnees.codeUniversite) {
    const [u] = await baseDeDonnees.execute('SELECT id FROM universites WHERE code_universite = ? LIMIT 1', [donnees.codeUniversite.toUpperCase()]);
    if (!u[0]) throw new ErreurApi(404, 'Université introuvable.');
    universiteId = u[0].id;
    if (utilisateur.role === 'UNIVERSITE') {
      await verifierGestionUniversite(utilisateur, universiteId);
    }
  } else if (utilisateur.role === 'ETUDIANT') {
    const [profils] = await baseDeDonnees.execute(
      "SELECT universite_id FROM profils_etudiants WHERE utilisateur_id = ? AND statut_institution = 'ACTIF' LIMIT 1",
      [utilisateur.id],
    );
    universiteId = profils[0]?.universite_id ?? null;
  } else if (utilisateur.role === 'UNIVERSITE') {
    const [membres] = await baseDeDonnees.execute(
      'SELECT universite_id FROM membres_universite WHERE utilisateur_id = ? ORDER BY est_proprietaire DESC LIMIT 1',
      [utilisateur.id],
    );
    universiteId = membres[0]?.universite_id ?? null;
  }
  const [resultats] = await baseDeDonnees.query(
    'CALL sp_creer_publication(?, ?, ?, ?, ?, ?, ?)',
    [utilisateur.id, universiteId, donnees.titre ?? null, donnees.contenu, donnees.type,
      JSON.stringify(donnees.etiquettes), donnees.publier ? 1 : 0],
  );
  return resultats[0][0];
}

export async function modifierPublication(code, donnees, utilisateur) {
  const publication = await publicationInterne(code);
  verifierProprietaireOuAdmin(utilisateur, publication.auteur_id, 'Vous ne pouvez pas modifier cette publication.');
  const normalisees = { ...donnees };
  if (normalisees.etiquettes) normalisees.etiquettes = JSON.stringify(normalisees.etiquettes);
  const { clause, valeurs } = construireMiseAJour(normalisees, {
    titre: 'titre', contenu: 'contenu', type: 'type_publication',
    etiquettes: 'etiquettes', statut: 'statut_publication',
  });
  await baseDeDonnees.execute(`UPDATE publications SET ${clause} WHERE id = ?`, [...valeurs, publication.id]);
  return publicationInterne(code);
}
export async function retirerPublication(code, utilisateur) {
  const publication = await publicationInterne(code);
  verifierProprietaireOuAdmin(utilisateur, publication.auteur_id);
  await baseDeDonnees.execute("UPDATE publications SET statut_publication = 'RETIREE' WHERE id = ?", [publication.id]);
  return { publicationRetiree: true };
}

export async function ajouterMedia(code, donnees, utilisateur) {
  const publication = await publicationInterne(code);
  verifierProprietaireOuAdmin(utilisateur, publication.auteur_id);
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.execute(
      `INSERT INTO medias_publication
       (code_media, publication_id, type_media, url_media, url_miniature, identifiant_stockage,
        type_mime, taille_octets, largeur_pixels, hauteur_pixels, duree_secondes, ordre_affichage)
       VALUES ('', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [publication.id, donnees.type, donnees.url, donnees.urlMiniature ?? null,
        donnees.identifiantStockage ?? null, donnees.typeMime ?? null, donnees.tailleOctets ?? null,
        donnees.largeurPixels ?? null, donnees.hauteurPixels ?? null, donnees.dureeSecondes ?? null, donnees.ordre],
    );
    const [lignes] = await connexion.query('SELECT * FROM medias_publication WHERE id = @campushub_dernier_id');
    return lignes[0];
  } finally { connexion.release(); }
}
export async function supprimerMedia(codeMedia, utilisateur) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT m.*, p.auteur_id FROM medias_publication m JOIN publications p ON p.id = m.publication_id
     WHERE m.code_media = ? LIMIT 1`, [codeMedia.toUpperCase()],
  );
  if (!lignes[0]) throw new ErreurApi(404, 'Média introuvable.');
  verifierProprietaireOuAdmin(utilisateur, lignes[0].auteur_id);
  await baseDeDonnees.execute('DELETE FROM medias_publication WHERE id = ?', [lignes[0].id]);
  return { mediaSupprime: true };
}

export async function ajouterCommentaire(codePublication, donnees, utilisateur) {
  const publication = await publicationInterne(codePublication);
  let parentId = null;
  if (donnees.codeCommentaireParent) {
    const [parents] = await baseDeDonnees.execute('SELECT id FROM commentaires WHERE code_commentaire = ? LIMIT 1', [donnees.codeCommentaireParent.toUpperCase()]);
    if (!parents[0]) throw new ErreurApi(404, 'Commentaire parent introuvable.');
    parentId = parents[0].id;
  }
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.execute(
      `INSERT INTO commentaires (code_commentaire, publication_id, auteur_id, commentaire_parent_id, contenu)
       VALUES ('', ?, ?, ?, ?)`, [publication.id, utilisateur.id, parentId, donnees.contenu],
    );
    const [lignes] = await connexion.execute(
      'SELECT * FROM commentaires WHERE publication_id = ? AND auteur_id = ? ORDER BY id DESC LIMIT 1',
      [publication.id, utilisateur.id],
    );
    return lignes[0];
  } finally { connexion.release(); }
}
export async function modifierCommentaire(code, contenu, utilisateur) {
  const [lignes] = await baseDeDonnees.execute('SELECT * FROM commentaires WHERE code_commentaire = ? LIMIT 1', [code.toUpperCase()]);
  if (!lignes[0]) throw new ErreurApi(404, 'Commentaire introuvable.');
  verifierProprietaireOuAdmin(utilisateur, lignes[0].auteur_id);
  await baseDeDonnees.execute('UPDATE commentaires SET contenu = ?, est_modifie = 1 WHERE id = ?', [contenu, lignes[0].id]);
  return { ...lignes[0], contenu, est_modifie: 1 };
}
export async function supprimerCommentaire(code, utilisateur) {
  const [lignes] = await baseDeDonnees.execute('SELECT * FROM commentaires WHERE code_commentaire = ? LIMIT 1', [code.toUpperCase()]);
  if (!lignes[0]) throw new ErreurApi(404, 'Commentaire introuvable.');
  verifierProprietaireOuAdmin(utilisateur, lignes[0].auteur_id);
  await baseDeDonnees.execute('DELETE FROM commentaires WHERE id = ?', [lignes[0].id]);
  return { commentaireSupprime: true };
}
