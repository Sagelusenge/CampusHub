import jwt from 'jsonwebtoken';
import { environnement } from '../config/environnement.js';
import { trouverUtilisateurParId } from '../services/utilisateurs.service.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { gestionnaireAsync } from '../utils/gestionnaire-async.js';

export const authentifier = gestionnaireAsync(async (requete, _reponse, suivant) => {
  const autorisation = requete.headers.authorization;
  if (!autorisation?.startsWith('Bearer ')) {
    throw new ErreurApi(401, 'Un jeton d’authentification est requis.');
  }

  const jeton = autorisation.slice(7);
  let contenu;
  try {
    contenu = jwt.verify(jeton, environnement.JWT_SECRET);
  } catch {
    throw new ErreurApi(401, 'Le jeton est invalide ou expiré.');
  }

  const utilisateur = await trouverUtilisateurParId(contenu.sub);
  if (!utilisateur || utilisateur.statut_compte !== 'ACTIF') {
    throw new ErreurApi(401, 'Le compte associé au jeton n’est pas actif.');
  }

  requete.utilisateur = utilisateur;
  suivant();
});

export function autoriserRoles(...rolesAutorises) {
  return function verifierRole(requete, _reponse, suivant) {
    if (!requete.utilisateur || !rolesAutorises.includes(requete.utilisateur.role)) {
      return suivant(new ErreurApi(403, 'Vous n’avez pas la permission d’effectuer cette action.'));
    }
    return suivant();
  };
}
