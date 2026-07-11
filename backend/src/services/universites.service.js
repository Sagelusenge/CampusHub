import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';

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

export async function creerUniversite(donnees) {
  const [resultats] = await baseDeDonnees.query(
    'CALL sp_ajouter_universite(?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      donnees.nom,
      donnees.sigle ?? null,
      donnees.slug,
      donnees.type,
      donnees.description ?? null,
      donnees.ville,
      donnees.province,
      donnees.email ?? null,
      donnees.telephone ?? null,
    ],
  );
  return resultats[0][0];
}
