import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { baseDeDonnees } from '../config/base-de-donnees.js';
import { environnement } from '../config/environnement.js';
import { ErreurApi } from '../utils/erreur-api.js';
import {
  enregistrerDerniereConnexion,
  trouverUtilisateurParEmail,
} from './utilisateurs.service.js';

function creerJeton(utilisateur) {
  return jwt.sign(
    { role: utilisateur.role, code: utilisateur.code_utilisateur },
    environnement.JWT_SECRET,
    { subject: String(utilisateur.id), expiresIn: environnement.JWT_EXPIRES_IN },
  );
}

function hacherJeton(jeton) {
  return createHash('sha256').update(jeton).digest('hex');
}

async function creerJetonActualisation(utilisateurId, connexion = baseDeDonnees) {
  const jeton = randomBytes(48).toString('hex');
  const expiration = new Date(Date.now() + environnement.REFRESH_TOKEN_DAYS * 86_400_000);
  await connexion.execute(
    `INSERT INTO jetons_actualisation
      (code_jeton, utilisateur_id, jeton_hash, date_expiration)
     VALUES ('', ?, ?, ?)`,
    [utilisateurId, hacherJeton(jeton), expiration],
  );
  return jeton;
}

function sansMotDePasse(utilisateur) {
  const { mot_de_passe_hash: _motDePasse, ...donneesPubliques } = utilisateur;
  return donneesPubliques;
}

export async function inscrireUtilisateur(donnees) {
  const utilisateurExistant = await trouverUtilisateurParEmail(donnees.email);
  if (utilisateurExistant) throw new ErreurApi(409, 'Un compte utilise déjà cette adresse email.');

  const hash = await bcrypt.hash(donnees.motDePasse, environnement.BCRYPT_ROUNDS);
  const [resultats] = await baseDeDonnees.query(
    'CALL sp_inscrire_utilisateur(?, ?, ?, ?, ?, ?)',
    [
      donnees.email,
      hash,
      donnees.role,
      donnees.nomAffichage,
      donnees.ville ?? null,
      donnees.province ?? null,
    ],
  );

  const utilisateur = resultats[0][0];
  if (donnees.role === 'ETUDIANT' || donnees.role === 'VISITEUR') {
    await baseDeDonnees.execute(`UPDATE utilisateurs SET statut_compte = 'ACTIF' WHERE id = ?`, [utilisateur.id]);
    utilisateur.statut_compte = 'ACTIF';
  }
  if (donnees.pays) {
    await baseDeDonnees.execute('UPDATE utilisateurs SET pays = ? WHERE id = ?', [donnees.pays, utilisateur.id]);
    utilisateur.pays = donnees.pays;
  }
  if (donnees.role === 'ETUDIANT') {
    await baseDeDonnees.query('CALL sp_creer_profil_etudiant(?, ?, ?, ?, ?, ?, ?)', [
      utilisateur.id, null, null, donnees.matriculeEtudiant,
      'Étudiant CampusHub', JSON.stringify([]), null,
    ]);
  }
  return utilisateur;
}

export async function connecterUtilisateur(email, motDePasse) {
  const utilisateur = await trouverUtilisateurParEmail(email, true);
  if (!utilisateur || !(await bcrypt.compare(motDePasse, utilisateur.mot_de_passe_hash))) {
    throw new ErreurApi(401, 'Email ou mot de passe incorrect.');
  }
  if (utilisateur.statut_compte !== 'ACTIF') {
    throw new ErreurApi(403, `Ce compte est actuellement ${utilisateur.statut_compte.toLowerCase()}.`);
  }

  await enregistrerDerniereConnexion(utilisateur.id);
  const jetonAcces = creerJeton(utilisateur);
  const jetonActualisation = await creerJetonActualisation(utilisateur.id);
  return {
    utilisateur: sansMotDePasse(utilisateur),
    jeton: jetonAcces,
    jetonAcces,
    jetonActualisation,
  };
}

export async function actualiserSession(jetonActuel) {
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.beginTransaction();
    const [lignes] = await connexion.execute(
      `SELECT j.id AS jeton_id, u.*
       FROM jetons_actualisation j
       JOIN utilisateurs u ON u.id = j.utilisateur_id
       WHERE j.jeton_hash = ? AND j.date_revocation IS NULL
         AND j.date_expiration > CURRENT_TIMESTAMP
       LIMIT 1 FOR UPDATE`,
      [hacherJeton(jetonActuel)],
    );
    const utilisateur = lignes[0];
    if (!utilisateur || utilisateur.statut_compte !== 'ACTIF') {
      throw new ErreurApi(401, 'Le jeton d’actualisation est invalide ou expiré.');
    }
    await connexion.execute(
      'UPDATE jetons_actualisation SET date_revocation = CURRENT_TIMESTAMP WHERE id = ?',
      [utilisateur.jeton_id],
    );
    const nouveauJeton = await creerJetonActualisation(utilisateur.id, connexion);
    await connexion.commit();
    return {
      jetonAcces: creerJeton(utilisateur),
      jetonActualisation: nouveauJeton,
    };
  } catch (erreur) {
    await connexion.rollback();
    throw erreur;
  } finally {
    connexion.release();
  }
}

export async function deconnecterSession(jetonActualisation) {
  const [resultat] = await baseDeDonnees.execute(
    `UPDATE jetons_actualisation SET date_revocation = CURRENT_TIMESTAMP
     WHERE jeton_hash = ? AND date_revocation IS NULL`,
    [hacherJeton(jetonActualisation)],
  );
  return { sessionRevoquee: resultat.affectedRows > 0 };
}
