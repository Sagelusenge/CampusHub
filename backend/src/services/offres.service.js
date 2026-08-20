import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { construireMiseAJour, metaPagination, pagination } from '../utils/sql.js';
import { trouverUniversiteParCode, verifierGestionUniversite } from './autorisations.service.js';
import { envoyerAlerteAdministration } from './email.service.js';
import { verifierContenuAvantPublication } from './moderation-automatique.service.js';

async function offreInterne(code) {
  const [lignes] = await baseDeDonnees.execute(
    'SELECT * FROM offres_etablissements WHERE code_offre = ? LIMIT 1', [code.toUpperCase()],
  );
  if (!lignes[0]) throw new ErreurApi(404, 'Offre introuvable.');
  return lignes[0];
}

function ajouterFiltres(conditions, valeurs, filtres) {
  if (filtres.recherche) {
    conditions.push('(titre LIKE ? OR description LIKE ? OR nom_etablissement LIKE ?)');
    const recherche = `%${filtres.recherche}%`;
    valeurs.push(recherche, recherche, recherche);
  }
  if (filtres.type) { conditions.push('type_offre = ?'); valeurs.push(filtres.type); }
  if (filtres.publicCible) { conditions.push('public_cible = ?'); valeurs.push(filtres.publicCible); }
  if (filtres.categorie) { conditions.push('categorie_etablissement = ?'); valeurs.push(filtres.categorie); }
  if (filtres.province) { conditions.push('province = ?'); valeurs.push(filtres.province); }
  if (filtres.ville) { conditions.push('ville = ?'); valeurs.push(filtres.ville); }
  if (filtres.universite) { conditions.push('code_universite = ?'); valeurs.push(filtres.universite.toUpperCase()); }
}

export async function listerOffresPubliques(filtres) {
  const { page, limite, decalage } = pagination(filtres.page, filtres.limite);
  const conditions = ["statut = 'PUBLIEE'", 'statut_verification = \'VERIFIEE\'', '(date_limite IS NULL OR date_limite >= CURRENT_DATE)'];
  const valeurs = [];
  ajouterFiltres(conditions, valeurs, filtres);
  const where = conditions.join(' AND ');
  const [[lignes], [compte]] = await Promise.all([
    baseDeDonnees.query(
      `SELECT * FROM vue_offres_etablissements WHERE ${where}
       ORDER BY date_publication DESC, date_creation DESC LIMIT ? OFFSET ?`,
      [...valeurs, limite, decalage],
    ),
    baseDeDonnees.execute(`SELECT COUNT(*) AS total FROM vue_offres_etablissements WHERE ${where}`, valeurs),
  ]);
  return { offres: lignes, meta: metaPagination(compte[0].total, page, limite) };
}

export async function obtenirOffrePublique(code) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT * FROM vue_offres_etablissements
     WHERE code_offre = ? AND statut = 'PUBLIEE' AND statut_verification = 'VERIFIEE'
       AND (date_limite IS NULL OR date_limite >= CURRENT_DATE) LIMIT 1`,
    [code.toUpperCase()],
  );
  if (!lignes[0]) throw new ErreurApi(404, 'Offre introuvable ou arrivée à expiration.');
  return lignes[0];
}

export async function listerMesOffres(utilisateur, filtres) {
  const [membres] = await baseDeDonnees.execute(
    'SELECT universite_id FROM membres_universite WHERE utilisateur_id = ? ORDER BY est_proprietaire DESC LIMIT 1',
    [utilisateur.id],
  );
  if (!membres[0]) throw new ErreurApi(404, 'Aucun établissement associé à ce compte.');
  const { page, limite, decalage } = pagination(filtres.page, filtres.limite);
  const conditions = ['universite_id = ?'];
  const valeurs = [membres[0].universite_id];
  if (filtres.statut) { conditions.push('statut = ?'); valeurs.push(filtres.statut); }
  ajouterFiltres(conditions, valeurs, filtres);
  const where = conditions.join(' AND ');
  const [[lignes], [compte]] = await Promise.all([
    baseDeDonnees.query(
      `SELECT * FROM vue_offres_etablissements WHERE ${where}
       ORDER BY date_creation DESC LIMIT ? OFFSET ?`, [...valeurs, limite, decalage],
    ),
    baseDeDonnees.execute(`SELECT COUNT(*) AS total FROM vue_offres_etablissements WHERE ${where}`, valeurs),
  ]);
  return { offres: lignes, meta: metaPagination(compte[0].total, page, limite) };
}

export async function creerOffre(utilisateur, donnees) {
  verifierContenuAvantPublication(donnees.titre, donnees.description, donnees.conditions);
  const universite = await trouverUniversiteParCode(donnees.codeUniversite);
  await verifierGestionUniversite(utilisateur, universite.id);
  const [resultat] = await baseDeDonnees.execute(
    `INSERT INTO offres_etablissements
      (id, code_offre, universite_id, auteur_id, titre, type_offre, public_cible,
       description, conditions, modalite, ville, province, url_candidature,
       email_contact, url_image, url_document, nom_document, date_debut, date_limite, statut)
     VALUES (0, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [universite.id, utilisateur.id, donnees.titre, donnees.type, donnees.publicCible,
      donnees.description, donnees.conditions || null, donnees.modalite,
      donnees.ville || universite.ville, donnees.province || universite.province,
      donnees.urlCandidature || null, donnees.emailContact || universite.email || null,
      donnees.urlImage || null, donnees.urlDocument || null, donnees.nomDocument || null,
      donnees.dateDebut || null, donnees.dateLimite || null,
      donnees.publier ? 'PUBLIEE' : 'BROUILLON'],
  );
  const [lignes] = await baseDeDonnees.execute(
    'SELECT * FROM vue_offres_etablissements WHERE id = ? LIMIT 1', [resultat.insertId],
  );
  const offre = lignes[0];
  if (donnees.publier) {
    try {
      await envoyerAlerteAdministration({
        titre: 'Nouvelle offre publiée',
        introduction: `${universite.nom} vient de publier une offre.`,
        details: [donnees.titre, `Type : ${donnees.type}`, `Référence : ${offre.code_offre}`],
        chemin: '/offres',
      });
    } catch (erreur) { console.error('Échec de l’e-mail de nouvelle offre :', erreur.code || erreur.message); }
  }
  return offre;
}

export async function modifierOffre(code, donnees, utilisateur) {
  const offre = await offreInterne(code);
  await verifierGestionUniversite(utilisateur, offre.universite_id);
  verifierContenuAvantPublication(donnees.titre, donnees.description, donnees.conditions);
  const normalisees = { ...donnees };
  for (const champ of ['conditions', 'ville', 'province', 'urlCandidature', 'emailContact', 'urlImage', 'urlDocument', 'nomDocument', 'dateDebut', 'dateLimite']) {
    if (normalisees[champ] === '') normalisees[champ] = null;
  }
  const { clause, valeurs } = construireMiseAJour(normalisees, {
    titre: 'titre', type: 'type_offre', publicCible: 'public_cible', description: 'description',
    conditions: 'conditions', modalite: 'modalite', ville: 'ville', province: 'province',
    urlCandidature: 'url_candidature', emailContact: 'email_contact', urlImage: 'url_image',
    urlDocument: 'url_document', nomDocument: 'nom_document',
    dateDebut: 'date_debut', dateLimite: 'date_limite', statut: 'statut',
  });
  await baseDeDonnees.execute(`UPDATE offres_etablissements SET ${clause} WHERE id = ?`, [...valeurs, offre.id]);
  const [lignes] = await baseDeDonnees.execute('SELECT * FROM vue_offres_etablissements WHERE id = ?', [offre.id]);
  return lignes[0];
}

export async function retirerOffre(code, utilisateur) {
  const offre = await offreInterne(code);
  await verifierGestionUniversite(utilisateur, offre.universite_id);
  await baseDeDonnees.execute("UPDATE offres_etablissements SET statut = 'RETIREE' WHERE id = ?", [offre.id]);
  return { offreRetiree: true };
}
