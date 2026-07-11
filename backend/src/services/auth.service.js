import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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

  return resultats[0][0];
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
  return {
    utilisateur: sansMotDePasse(utilisateur),
    jeton: creerJeton(utilisateur),
  };
}
