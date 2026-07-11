import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { construireMiseAJour, metaPagination, pagination } from '../utils/sql.js';

export async function listerProfils(filtres) {
  const { page, limite, decalage } = pagination(filtres.page, filtres.limite);
  const conditions = ['1 = 1'];
  const valeurs = [];
  if (filtres.universite) { conditions.push('code_universite = ?'); valeurs.push(filtres.universite.toUpperCase()); }
  if (filtres.filiere) { conditions.push('code_filiere = ?'); valeurs.push(filtres.filiere.toUpperCase()); }
  if (filtres.competence) { conditions.push('JSON_SEARCH(competences, \'one\', ?) IS NOT NULL'); valeurs.push(`%${filtres.competence}%`); }
  const where = conditions.join(' AND ');
  const [[lignes], [compte]] = await Promise.all([
    baseDeDonnees.execute(
      `SELECT * FROM vue_profils_etudiants_publics WHERE ${where}
       ORDER BY nombre_publications DESC, nom_affichage LIMIT ? OFFSET ?`,
      [...valeurs, limite, decalage],
    ),
    baseDeDonnees.execute(`SELECT COUNT(*) AS total FROM vue_profils_etudiants_publics WHERE ${where}`, valeurs),
  ]);
  return { profils: lignes, meta: metaPagination(compte[0].total, page, limite) };
}

export async function obtenirProfilParCode(code) {
  const [lignes] = await baseDeDonnees.execute(
    'SELECT * FROM vue_profils_etudiants_publics WHERE code_profil = ? LIMIT 1',
    [code.toUpperCase()],
  );
  if (!lignes[0]) throw new ErreurApi(404, 'Profil étudiant introuvable.');
  return lignes[0];
}

export async function obtenirMonProfil(utilisateurId) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT p.*, u.code_universite, u.nom AS nom_universite,
       f.code_filiere, f.nom AS nom_filiere
     FROM profils_etudiants p
     LEFT JOIN universites u ON u.id = p.universite_id
     LEFT JOIN filieres f ON f.id = p.filiere_id
     WHERE p.utilisateur_id = ? LIMIT 1`,
    [utilisateurId],
  );
  if (!lignes[0]) throw new ErreurApi(404, 'Vous n’avez pas encore de profil étudiant.');
  return lignes[0];
}

export async function creerProfil(utilisateurId, donnees) {
  const [[universites], [filieres]] = await Promise.all([
    baseDeDonnees.execute('SELECT id FROM universites WHERE code_universite = ? LIMIT 1', [donnees.codeUniversite.toUpperCase()]),
    baseDeDonnees.execute('SELECT id FROM filieres WHERE code_filiere = ? LIMIT 1', [donnees.codeFiliere.toUpperCase()]),
  ]);
  if (!universites[0]) throw new ErreurApi(404, 'Université introuvable.');
  if (!filieres[0]) throw new ErreurApi(404, 'Filière introuvable.');
  const [resultats] = await baseDeDonnees.query(
    'CALL sp_creer_profil_etudiant(?, ?, ?, ?, ?, ?, ?)',
    [utilisateurId, universites[0].id, filieres[0].id, donnees.matriculeEtudiant ?? null,
      donnees.titreProfil ?? null, JSON.stringify(donnees.competences), donnees.anneeDiplomation ?? null],
  );
  return obtenirProfilParCode(resultats[0][0].code_profil);
}

export async function modifierProfil(utilisateurId, donnees) {
  const normalisees = { ...donnees };
  if (Object.hasOwn(normalisees, 'competences')) normalisees.competences = JSON.stringify(normalisees.competences);
  const { clause, valeurs } = construireMiseAJour(normalisees, {
    matriculeEtudiant: 'matricule_etudiant', titreProfil: 'titre_profil',
    competences: 'competences', anneeDiplomation: 'annee_diplomation', estVisible: 'est_visible',
  });
  const [resultat] = await baseDeDonnees.execute(
    `UPDATE profils_etudiants SET ${clause} WHERE utilisateur_id = ?`, [...valeurs, utilisateurId],
  );
  if (!resultat.affectedRows) throw new ErreurApi(404, 'Profil étudiant introuvable.');
  return obtenirMonProfil(utilisateurId);
}

export async function masquerProfil(utilisateurId) {
  const [resultat] = await baseDeDonnees.execute(
    'UPDATE profils_etudiants SET est_visible = 0 WHERE utilisateur_id = ?', [utilisateurId],
  );
  if (!resultat.affectedRows) throw new ErreurApi(404, 'Profil étudiant introuvable.');
  return { profilMasque: true };
}
