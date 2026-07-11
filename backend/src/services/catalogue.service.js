import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { construireMiseAJour } from '../utils/sql.js';
import { trouverUniversiteParCode, verifierGestionUniversite } from './autorisations.service.js';

async function trouverRessource(table, colonneCode, code) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT * FROM ${table} WHERE ${colonneCode} = ? LIMIT 1`, [code.toUpperCase()],
  );
  if (!lignes[0]) throw new ErreurApi(404, 'Ressource du catalogue introuvable.');
  return lignes[0];
}

async function insererPuisLire(requete, valeurs, table) {
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.execute(requete, valeurs);
    const [lignes] = await connexion.query(`SELECT * FROM ${table} WHERE id = @campushub_dernier_id`);
    return lignes[0];
  } finally {
    connexion.release();
  }
}

async function modifierRessource({ table, colonneCode, code, donnees, mapping, utilisateur }) {
  const ressource = await trouverRessource(table, colonneCode, code);
  await verifierGestionUniversite(utilisateur, ressource.universite_id);
  const { clause, valeurs } = construireMiseAJour(donnees, mapping);
  await baseDeDonnees.execute(
    `UPDATE ${table} SET ${clause} WHERE ${colonneCode} = ?`, [...valeurs, code.toUpperCase()],
  );
  return trouverRessource(table, colonneCode, code);
}

async function supprimerRessource(table, colonneCode, code, utilisateur) {
  const ressource = await trouverRessource(table, colonneCode, code);
  await verifierGestionUniversite(utilisateur, ressource.universite_id);
  await baseDeDonnees.execute(`DELETE FROM ${table} WHERE ${colonneCode} = ?`, [code.toUpperCase()]);
  return { supprimee: true, code: code.toUpperCase() };
}

export async function listerCampus(codeUniversite) {
  const universite = await trouverUniversiteParCode(codeUniversite);
  const [lignes] = await baseDeDonnees.execute('SELECT * FROM campus WHERE universite_id = ? ORDER BY est_principal DESC, nom', [universite.id]);
  return lignes;
}
export async function creerCampus(codeUniversite, donnees, utilisateur) {
  const universite = await trouverUniversiteParCode(codeUniversite);
  await verifierGestionUniversite(utilisateur, universite.id);
  return insererPuisLire(
    `INSERT INTO campus (code_campus, universite_id, nom, adresse, ville, province, latitude, longitude, est_principal)
     VALUES ('', ?, ?, ?, ?, ?, ?, ?, ?)`,
    [universite.id, donnees.nom, donnees.adresse ?? null, donnees.ville, donnees.province,
      donnees.latitude ?? null, donnees.longitude ?? null, donnees.estPrincipal],
    'campus',
  );
}
export const modifierCampus = (code, donnees, utilisateur) => modifierRessource({
  table: 'campus', colonneCode: 'code_campus', code, donnees, utilisateur,
  mapping: { nom: 'nom', adresse: 'adresse', ville: 'ville', province: 'province', latitude: 'latitude', longitude: 'longitude', estPrincipal: 'est_principal' },
});
export const supprimerCampus = (code, utilisateur) => supprimerRessource('campus', 'code_campus', code, utilisateur);

export async function listerFacultes(codeUniversite) {
  const universite = await trouverUniversiteParCode(codeUniversite);
  const [lignes] = await baseDeDonnees.execute('SELECT * FROM facultes WHERE universite_id = ? ORDER BY nom', [universite.id]);
  return lignes;
}
export async function creerFaculte(codeUniversite, donnees, utilisateur) {
  const universite = await trouverUniversiteParCode(codeUniversite);
  await verifierGestionUniversite(utilisateur, universite.id);
  const [resultats] = await baseDeDonnees.query('CALL sp_ajouter_faculte(?, ?, ?, ?)', [universite.id, donnees.nom, donnees.slug, donnees.description ?? null]);
  return resultats[0][0];
}
export const modifierFaculte = (code, donnees, utilisateur) => modifierRessource({
  table: 'facultes', colonneCode: 'code_faculte', code, donnees, utilisateur,
  mapping: { nom: 'nom', slug: 'slug', description: 'description' },
});
export const supprimerFaculte = (code, utilisateur) => supprimerRessource('facultes', 'code_faculte', code, utilisateur);

export async function listerFilieres(codeFaculte) {
  const faculte = await trouverRessource('facultes', 'code_faculte', codeFaculte);
  const [lignes] = await baseDeDonnees.execute('SELECT * FROM filieres WHERE faculte_id = ? ORDER BY nom', [faculte.id]);
  return lignes;
}
export async function creerFiliere(codeFaculte, donnees, utilisateur) {
  const faculte = await trouverRessource('facultes', 'code_faculte', codeFaculte);
  await verifierGestionUniversite(utilisateur, faculte.universite_id);
  const [resultats] = await baseDeDonnees.query(
    'CALL sp_ajouter_filiere(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [faculte.universite_id, faculte.id, donnees.nom, donnees.slug, donnees.domaine,
      donnees.niveauDiplome, donnees.dureeAnnees ?? null, donnees.fraisMinimum ?? null,
      donnees.fraisMaximum ?? null, donnees.devise, donnees.description ?? null],
  );
  return resultats[0][0];
}
export const modifierFiliere = (code, donnees, utilisateur) => modifierRessource({
  table: 'filieres', colonneCode: 'code_filiere', code, donnees, utilisateur,
  mapping: { nom: 'nom', slug: 'slug', domaine: 'domaine', niveauDiplome: 'niveau_diplome', dureeAnnees: 'duree_annees', description: 'description', fraisMinimum: 'frais_minimum', fraisMaximum: 'frais_maximum', devise: 'devise', estActive: 'est_active' },
});
export const supprimerFiliere = (code, utilisateur) => supprimerRessource('filieres', 'code_filiere', code, utilisateur);

export async function associerFiliereCampus(codeCampus, codeFiliere, utilisateur) {
  const [campus, filiere] = await Promise.all([
    trouverRessource('campus', 'code_campus', codeCampus),
    trouverRessource('filieres', 'code_filiere', codeFiliere),
  ]);
  if (campus.universite_id !== filiere.universite_id) throw new ErreurApi(400, 'Le campus et la filière doivent appartenir à la même université.');
  await verifierGestionUniversite(utilisateur, campus.universite_id);
  await baseDeDonnees.execute('INSERT IGNORE INTO campus_filieres (campus_id, filiere_id) VALUES (?, ?)', [campus.id, filiere.id]);
  return { association: true };
}
export async function dissocierFiliereCampus(codeCampus, codeFiliere, utilisateur) {
  const campus = await trouverRessource('campus', 'code_campus', codeCampus);
  const filiere = await trouverRessource('filieres', 'code_filiere', codeFiliere);
  await verifierGestionUniversite(utilisateur, campus.universite_id);
  await baseDeDonnees.execute('DELETE FROM campus_filieres WHERE campus_id = ? AND filiere_id = ?', [campus.id, filiere.id]);
  return { association: false };
}

export async function listerServices(codeUniversite) {
  const universite = await trouverUniversiteParCode(codeUniversite);
  const [lignes] = await baseDeDonnees.execute('SELECT * FROM services_universitaires WHERE universite_id = ? ORDER BY nom', [universite.id]);
  return lignes;
}
export async function creerService(codeUniversite, donnees, utilisateur) {
  const universite = await trouverUniversiteParCode(codeUniversite);
  await verifierGestionUniversite(utilisateur, universite.id);
  return insererPuisLire(
    `INSERT INTO services_universitaires (code_service, universite_id, nom, description, est_disponible)
     VALUES ('', ?, ?, ?, ?)`,
    [universite.id, donnees.nom, donnees.description ?? null, donnees.estDisponible],
    'services_universitaires',
  );
}
export const modifierService = (code, donnees, utilisateur) => modifierRessource({
  table: 'services_universitaires', colonneCode: 'code_service', code, donnees, utilisateur,
  mapping: { nom: 'nom', description: 'description', estDisponible: 'est_disponible' },
});
export const supprimerService = (code, utilisateur) => supprimerRessource('services_universitaires', 'code_service', code, utilisateur);

export async function listerInfrastructures(codeUniversite) {
  const universite = await trouverUniversiteParCode(codeUniversite);
  const [lignes] = await baseDeDonnees.execute('SELECT * FROM infrastructures WHERE universite_id = ? ORDER BY categorie, nom', [universite.id]);
  return lignes;
}
export async function creerInfrastructure(codeUniversite, donnees, utilisateur) {
  const universite = await trouverUniversiteParCode(codeUniversite);
  await verifierGestionUniversite(utilisateur, universite.id);
  return insererPuisLire(
    `INSERT INTO infrastructures (code_infrastructure, universite_id, nom, categorie, description, quantite)
     VALUES ('', ?, ?, ?, ?, ?)`,
    [universite.id, donnees.nom, donnees.categorie, donnees.description ?? null, donnees.quantite ?? null],
    'infrastructures',
  );
}
export const modifierInfrastructure = (code, donnees, utilisateur) => modifierRessource({
  table: 'infrastructures', colonneCode: 'code_infrastructure', code, donnees, utilisateur,
  mapping: { nom: 'nom', categorie: 'categorie', description: 'description', quantite: 'quantite' },
});
export const supprimerInfrastructure = (code, utilisateur) => supprimerRessource('infrastructures', 'code_infrastructure', code, utilisateur);

export async function listerConditions(codeUniversite) {
  const universite = await trouverUniversiteParCode(codeUniversite);
  const [lignes] = await baseDeDonnees.execute('SELECT * FROM conditions_admission WHERE universite_id = ? ORDER BY niveau_diplome, titre', [universite.id]);
  return lignes;
}
export async function creerCondition(codeUniversite, donnees, utilisateur) {
  const universite = await trouverUniversiteParCode(codeUniversite);
  await verifierGestionUniversite(utilisateur, universite.id);
  return insererPuisLire(
    `INSERT INTO conditions_admission (code_condition, universite_id, titre, description, niveau_diplome)
     VALUES ('', ?, ?, ?, ?)`,
    [universite.id, donnees.titre, donnees.description, donnees.niveauDiplome ?? null],
    'conditions_admission',
  );
}
export const modifierCondition = (code, donnees, utilisateur) => modifierRessource({
  table: 'conditions_admission', colonneCode: 'code_condition', code, donnees, utilisateur,
  mapping: { titre: 'titre', description: 'description', niveauDiplome: 'niveau_diplome' },
});
export const supprimerCondition = (code, utilisateur) => supprimerRessource('conditions_admission', 'code_condition', code, utilisateur);

export async function listerMembres(codeUniversite, utilisateur) {
  const universite = await trouverUniversiteParCode(codeUniversite);
  await verifierGestionUniversite(utilisateur, universite.id);
  const [lignes] = await baseDeDonnees.execute(
    `SELECT m.code_membre, m.fonction, m.est_proprietaire, m.date_creation,
       u.code_utilisateur, u.nom_affichage, u.email
     FROM membres_universite m JOIN utilisateurs u ON u.id = m.utilisateur_id
     WHERE m.universite_id = ? ORDER BY m.est_proprietaire DESC, u.nom_affichage`,
    [universite.id],
  );
  return lignes;
}
export async function ajouterMembre(codeUniversite, donnees, utilisateur) {
  const universite = await trouverUniversiteParCode(codeUniversite);
  await verifierGestionUniversite(utilisateur, universite.id);
  const [utilisateurs] = await baseDeDonnees.execute(
    `SELECT id, role FROM utilisateurs WHERE code_utilisateur = ? AND statut_compte = 'ACTIF' LIMIT 1`,
    [donnees.codeUtilisateur.toUpperCase()],
  );
  if (!utilisateurs[0]) throw new ErreurApi(404, 'Compte utilisateur introuvable ou inactif.');
  if (utilisateurs[0].role !== 'UNIVERSITE') throw new ErreurApi(400, 'Un membre institutionnel doit avoir le rôle UNIVERSITE.');
  return insererPuisLire(
    `INSERT INTO membres_universite (code_membre, universite_id, utilisateur_id, fonction, est_proprietaire)
     VALUES ('', ?, ?, ?, ?)`,
    [universite.id, utilisateurs[0].id, donnees.fonction ?? null, donnees.estProprietaire],
    'membres_universite',
  );
}
export async function retirerMembre(codeMembre, utilisateur) {
  const membre = await trouverRessource('membres_universite', 'code_membre', codeMembre);
  await verifierGestionUniversite(utilisateur, membre.universite_id);
  if (membre.est_proprietaire) throw new ErreurApi(400, 'Le propriétaire principal ne peut pas être retiré directement.');
  await baseDeDonnees.execute('DELETE FROM membres_universite WHERE id = ?', [membre.id]);
  return { membreRetire: true };
}
