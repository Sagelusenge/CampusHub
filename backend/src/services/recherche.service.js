import { baseDeDonnees } from '../config/base-de-donnees.js';

function termes(requete) {
  return [...new Set(requete.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/).filter((mot) => mot.length >= 3))];
}

const selectionPublications = `SELECT v.*,
  (SELECT m.url_media FROM medias_publication m WHERE m.publication_id = v.id ORDER BY m.ordre_affichage, m.id LIMIT 1) AS url_media,
  (SELECT m.type_media FROM medias_publication m WHERE m.publication_id = v.id ORDER BY m.ordre_affichage, m.id LIMIT 1) AS type_media
  FROM vue_fil_actualite v`;

export async function rechercher(utilisateurId, requete) {
  const motif = `%${requete}%`;
  const [[publications], [universites], [profils]] = await Promise.all([
    baseDeDonnees.execute(`${selectionPublications}
      WHERE v.titre LIKE ? OR v.contenu LIKE ? OR v.nom_auteur LIKE ?
        OR v.nom_universite LIKE ? OR CAST(v.etiquettes AS CHAR) LIKE ?
      ORDER BY v.date_publication DESC LIMIT 30`, [motif, motif, motif, motif, motif]),
    baseDeDonnees.execute(`SELECT * FROM vue_universites_resume
      WHERE statut_verification = 'VERIFIEE' AND (nom LIKE ? OR sigle LIKE ? OR ville LIKE ? OR province LIKE ?)
      ORDER BY nombre_abonnes DESC, nom LIMIT 12`, [motif, motif, motif, motif]),
    baseDeDonnees.execute(`SELECT * FROM vue_profils_etudiants_publics
      WHERE nom_affichage LIKE ? OR titre_profil LIKE ? OR CAST(competences AS CHAR) LIKE ?
        OR nom_universite LIKE ? OR nom_filiere LIKE ?
      ORDER BY nombre_abonnes DESC, nombre_publications DESC LIMIT 12`, [motif, motif, motif, motif, motif]),
  ]);
  const total = publications.length + universites.length + profils.length;
  await baseDeDonnees.execute(
    `INSERT INTO recherches_utilisateurs (id, code_recherche, utilisateur_id, requete, nombre_resultats)
     VALUES (0, '', ?, ?, ?)`, [utilisateurId, requete, total],
  );
  return { publications, universites, profils, termesReconnus: termes(requete), total };
}

export async function recommander(utilisateurId) {
  const [[recherches], [suivies], [publications]] = await Promise.all([
    baseDeDonnees.execute(`SELECT requete FROM recherches_utilisateurs WHERE utilisateur_id = ? ORDER BY date_creation DESC LIMIT 12`, [utilisateurId]),
    baseDeDonnees.execute(`SELECT u.code_universite FROM abonnements_universites a JOIN universites u ON u.id = a.universite_id WHERE a.utilisateur_id = ?`, [utilisateurId]),
    baseDeDonnees.execute(`${selectionPublications} ORDER BY v.date_publication DESC LIMIT 100`),
  ]);
  const mots = termes(recherches.map((item) => item.requete).join(' '));
  const codesSuivis = new Set(suivies.map((item) => item.code_universite));
  const normaliser = (valeur) => String(valeur || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const maintenant = Date.now();
  return publications.map((publication) => {
    const texte = normaliser(`${publication.titre} ${publication.contenu} ${publication.nom_universite} ${JSON.stringify(publication.etiquettes)}`);
    const correspondances = mots.filter((mot) => texte.includes(mot)).length;
    const ageJours = Math.max(0, (maintenant - new Date(publication.date_publication).getTime()) / 86400000);
    const score = correspondances * 4 + (codesSuivis.has(publication.code_universite) ? 10 : 0)
      + Math.min(10, Number(publication.nombre_jaime || 0) * .7 + Number(publication.nombre_commentaires || 0) * 1.2)
      + Math.max(0, 8 - ageJours / 7);
    return { ...publication, score_recommandation: Number(score.toFixed(2)) };
  }).sort((a, b) => b.score_recommandation - a.score_recommandation).slice(0, 30);
}
