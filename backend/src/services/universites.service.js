import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { construireMiseAJour } from '../utils/sql.js';
import { trouverUniversiteParCode, verifierGestionUniversite } from './autorisations.service.js';

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
  return resultats[0];
}

export async function obtenirUniversiteParCode(code) {
  const [universites] = await baseDeDonnees.execute(
    'SELECT * FROM vue_universites_resume WHERE code_universite = ? LIMIT 1',
    [code.toUpperCase()],
  );
  const universite = universites[0];
  if (!universite) throw new ErreurApi(404, 'Université introuvable.');

  const [filieres, services, infrastructures, conditions] = await Promise.all([
    baseDeDonnees.execute(
      'SELECT * FROM vue_catalogue_filieres WHERE universite_id = ? AND est_active = 1 ORDER BY nom_filiere',
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
  ]);

  return {
    ...universite,
    filieres: filieres[0],
    services: services[0],
    infrastructures: infrastructures[0],
    conditionsAdmission: conditions[0],
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
    const [resultats] = await connexion.query(
      'CALL sp_ajouter_universite(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        donnees.nom, donnees.sigle ?? null, donnees.slug, donnees.type,
        donnees.description ?? null, donnees.ville, donnees.province,
        donnees.email ?? null, donnees.telephone ?? null,
      ],
    );
    const universite = resultats[0][0];
    if (utilisateur.role === 'UNIVERSITE') {
      await connexion.execute(
        `INSERT INTO membres_universite
          (code_membre, universite_id, utilisateur_id, fonction, est_proprietaire)
         VALUES ('', ?, ?, 'Administrateur institutionnel', 1)`,
        [universite.id, utilisateur.id],
      );
    }
    await connexion.commit();
    return universite;
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
    nom: 'nom', sigle: 'sigle', description: 'description', urlLogo: 'url_logo',
    urlCouverture: 'url_couverture', siteWeb: 'site_web', email: 'email', telephone: 'telephone',
    anneeFondation: 'annee_fondation', adresse: 'adresse', ville: 'ville', province: 'province',
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
