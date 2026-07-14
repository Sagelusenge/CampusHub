import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { construireMiseAJour } from '../utils/sql.js';
import { trouverUniversiteParCode, verifierGestionUniversite } from './autorisations.service.js';

function creerSlug(texte) {
  return texte.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 170) || 'universite';
}

async function slugDisponible(connexion, slugBase) {
  let slug = slugBase; let suffixe = 1;
  while (true) {
    const [lignes] = await connexion.execute('SELECT id FROM universites WHERE slug = ? LIMIT 1', [slug]);
    if (!lignes[0]) return slug;
    suffixe += 1; slug = `${slugBase}-${suffixe}`;
  }
}

export async function rechercherUniversites(filtres) {
  const [resultats] = await baseDeDonnees.query(
    'CALL sp_rechercher_universites(?, ?, ?, ?, ?, ?)',
    [
      filtres.ville ?? null,
      filtres.province ?? null,
      filtres.type ?? null,
      filtres.filiere ?? null,
      filtres.fraisMaximum ?? null,
      filtres.service ?? null,
    ],
  );
  const [certifiees] = await baseDeDonnees.query(
    `SELECT DISTINCT universite_id FROM certifications_universite
     WHERE statut = 'ACTIF' AND date_fin > CURRENT_TIMESTAMP`,
  );
  const idsCertifies = new Set(certifiees.map((item) => Number(item.universite_id)));
  let etablissements = resultats[0];
  const idsInitiaux = etablissements.map((item) => item.id);
  if (idsInitiaux.length) {
    const marqueurs = idsInitiaux.map(() => '?').join(',');
    const [metadonnees] = await baseDeDonnees.execute(
      `SELECT id, categorie_etablissement, pays, latitude, longitude, url_logo, url_couverture,
        (SELECT COUNT(*) FROM campus c WHERE c.universite_id = universites.id) AS nombre_campus
       FROM universites WHERE id IN (${marqueurs})`, idsInitiaux,
    );
    const parId = new Map(metadonnees.map((item) => [Number(item.id), item]));
    etablissements = etablissements.map((item) => ({ ...item, ...parId.get(Number(item.id)) }));
  }
  if (filtres.categorie) etablissements = etablissements.filter((item) => item.categorie_etablissement === filtres.categorie);
  const ids = etablissements.map((item) => item.id);
  let campus = [];
  if (ids.length) {
    const marqueurs = ids.map(() => '?').join(',');
    [campus] = await baseDeDonnees.execute(
      `SELECT code_campus, universite_id, nom, adresse, ville, province, latitude, longitude, est_principal
       FROM campus WHERE universite_id IN (${marqueurs}) ORDER BY est_principal DESC, nom`, ids,
    );
  }
  const rechercheCampus = filtres.campus?.toLowerCase();
  return etablissements.map((universite) => ({
    ...universite,
    est_certifiee: idsCertifies.has(Number(universite.id)),
    campus: campus.filter((item) => Number(item.universite_id) === Number(universite.id)),
  })).filter((item) => !rechercheCampus || item.campus.some((site) =>
    `${site.code_campus} ${site.nom} ${site.ville} ${site.province}`.toLowerCase().includes(rechercheCampus)));
}

export async function obtenirUniversiteParCode(code) {
  const [universites] = await baseDeDonnees.execute(
    `SELECT u.*,
       (SELECT COUNT(*) FROM campus c WHERE c.universite_id = u.id) AS nombre_campus,
       (SELECT COUNT(*) FROM facultes fa WHERE fa.universite_id = u.id) AS nombre_facultes,
       (SELECT COUNT(*) FROM filieres fi WHERE fi.universite_id = u.id AND fi.est_active = 1) AS nombre_filieres,
       (SELECT COUNT(*) FROM profils_etudiants pe WHERE pe.universite_id = u.id) AS nombre_etudiants,
       (SELECT COUNT(*) FROM abonnements_universites au WHERE au.universite_id = u.id) AS nombre_abonnes,
       (SELECT MIN(fi.frais_minimum) FROM filieres fi WHERE fi.universite_id = u.id AND fi.est_active = 1) AS frais_minimum,
       (SELECT MAX(fi.frais_maximum) FROM filieres fi WHERE fi.universite_id = u.id AND fi.est_active = 1) AS frais_maximum,
       EXISTS(SELECT 1 FROM certifications_universite cu
         WHERE cu.universite_id = u.id AND cu.statut = 'ACTIF' AND cu.date_fin > CURRENT_TIMESTAMP) AS est_certifiee
     FROM universites u WHERE u.code_universite = ? LIMIT 1`,
    [code.toUpperCase()],
  );
  const universite = universites[0];
  if (!universite) throw new ErreurApi(404, 'Université introuvable.');

  const [filieres, services, infrastructures, conditions, campus] = await Promise.all([
    baseDeDonnees.execute(
      `SELECT v.*,
        (SELECT GROUP_CONCAT(c.code_campus ORDER BY c.nom SEPARATOR ',')
         FROM campus_filieres cf JOIN campus c ON c.id = cf.campus_id WHERE cf.filiere_id = v.id) AS codes_campus
       FROM vue_catalogue_filieres v WHERE v.universite_id = ? AND v.est_active = 1 ORDER BY v.nom_filiere`,
      [universite.id],
    ),
    baseDeDonnees.execute(
      'SELECT code_service, nom, description FROM services_universitaires WHERE universite_id = ? AND est_disponible = 1 ORDER BY nom',
      [universite.id],
    ),
    baseDeDonnees.execute(
      'SELECT code_infrastructure, nom, categorie, description, quantite FROM infrastructures WHERE universite_id = ? ORDER BY categorie, nom',
      [universite.id],
    ),
    baseDeDonnees.execute(
      'SELECT code_condition, titre, description, niveau_diplome FROM conditions_admission WHERE universite_id = ? ORDER BY niveau_diplome, titre',
      [universite.id],
    ),
    baseDeDonnees.execute(
      'SELECT code_campus, nom, adresse, ville, province, latitude, longitude, est_principal FROM campus WHERE universite_id = ? ORDER BY est_principal DESC, nom',
      [universite.id],
    ),
  ]);

  return {
    ...universite,
    filieres: filieres[0],
    services: services[0],
    infrastructures: infrastructures[0],
    conditionsAdmission: conditions[0],
    campus: campus[0],
  };
}

export async function obtenirUniversiteDuGestionnaire(utilisateurId) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT u.code_universite
     FROM membres_universite m
     JOIN universites u ON u.id = m.universite_id
     WHERE m.utilisateur_id = ? AND m.est_proprietaire = 1
     ORDER BY m.date_creation DESC
     LIMIT 1`,
    [utilisateurId],
  );
  if (!lignes[0]) return null;
  return obtenirUniversiteParCode(lignes[0].code_universite);
}

export async function creerUniversite(donnees, utilisateur) {
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.beginTransaction();
    if (utilisateur.role === 'UNIVERSITE') {
      const [abonnements] = await connexion.execute(
        `SELECT id FROM abonnements_universite
         WHERE utilisateur_id = ? AND statut = 'ACTIF' AND date_fin > CURRENT_TIMESTAMP LIMIT 1`,
        [utilisateur.id],
      );
      if (!abonnements[0]) throw new ErreurApi(403, 'Un abonnement CampusHub actif est requis avant de créer la fiche universitaire.');
    }
    const slug = await slugDisponible(connexion, donnees.slug ?? creerSlug(donnees.nom));
    const [resultats] = await connexion.query(
      'CALL sp_ajouter_universite(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        donnees.nom, donnees.sigle ?? null, slug, donnees.type,
        donnees.description ?? null, donnees.ville, donnees.province,
        donnees.email ?? null, donnees.telephone ?? null,
      ],
    );
    const universite = resultats[0][0];
    await connexion.execute(
      `UPDATE universites SET pays = COALESCE(?, pays), categorie_etablissement = ?, url_logo = ?, url_couverture = ? WHERE id = ?`,
      [donnees.pays ?? null, donnees.categorie, donnees.urlLogo ?? null, donnees.urlCouverture ?? null, universite.id],
    );
    if (utilisateur.role === 'UNIVERSITE') {
      await connexion.execute(
        `INSERT INTO membres_universite
          (code_membre, universite_id, utilisateur_id, fonction, est_proprietaire)
         VALUES ('', ?, ?, 'Administrateur institutionnel', 1)`,
        [universite.id, utilisateur.id],
      );
      await connexion.execute(
        `UPDATE abonnements_universite SET universite_id = ?
         WHERE utilisateur_id = ? AND statut = 'ACTIF' AND universite_id IS NULL`,
        [universite.id, utilisateur.id],
      );
      await connexion.execute(
        `INSERT INTO notifications
          (id, code_notification, destinataire_id, acteur_id, type_notification, titre, message, url_action)
         SELECT 0, '', id, ?, 'SYSTEME', 'Nouvelle fiche universitaire', ?, '/administration/universites'
         FROM utilisateurs WHERE role = 'ADMINISTRATEUR' AND statut_compte = 'ACTIF'`,
        [utilisateur.id, `${donnees.nom} attend votre validation avant publication.`],
      );
    }
    await connexion.commit();
    return { ...universite, categorie_etablissement: donnees.categorie };
  } catch (erreur) {
    await connexion.rollback();
    throw erreur;
  } finally {
    connexion.release();
  }
}

export async function modifierUniversite(code, donnees, utilisateur) {
  const universite = await trouverUniversiteParCode(code);
  await verifierGestionUniversite(utilisateur, universite.id);
  const { clause, valeurs } = construireMiseAJour(donnees, {
    nom: 'nom', sigle: 'sigle', categorie: 'categorie_etablissement', description: 'description', urlLogo: 'url_logo',
    urlCouverture: 'url_couverture', siteWeb: 'site_web', email: 'email', telephone: 'telephone',
    anneeFondation: 'annee_fondation', adresse: 'adresse', pays: 'pays', ville: 'ville', province: 'province',
    inscriptionsOuvertes: 'inscriptions_ouvertes', dateDebutInscription: 'date_debut_inscription',
    dateFinInscription: 'date_fin_inscription',
  });
  await baseDeDonnees.execute(`UPDATE universites SET ${clause} WHERE id = ?`, [...valeurs, universite.id]);
  return obtenirUniversiteParCode(code);
}

export async function supprimerUniversite(code) {
  const universite = await trouverUniversiteParCode(code);
  await baseDeDonnees.execute('DELETE FROM universites WHERE id = ?', [universite.id]);
  return { universiteSupprimee: true, code: code.toUpperCase() };
}

export async function comparerUniversites(codes) {
  const liste = codes.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
  if (liste.length < 2 || liste.length > 3) throw new ErreurApi(400, 'La comparaison nécessite deux ou trois universités.');
  const [resultats] = await baseDeDonnees.query('CALL sp_comparer_universites(?)', [liste.join(',')]);
  return resultats[0];
}

export async function statistiquesUniversite(code) {
  const universite = await trouverUniversiteParCode(code);
  const [resultats] = await baseDeDonnees.query('CALL sp_statistiques_universite(?)', [universite.id]);
  return resultats[0][0];
}
