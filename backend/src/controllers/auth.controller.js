import {
  actualiserSession,
  connecterUtilisateur,
  deconnecterSession,
  inscrireUtilisateur,
} from '../services/auth.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

// POST /api/v1/auth/inscription
export async function inscription(requete, reponse) {
  const donneesInscription = requete.validees.body;
  const utilisateur = await inscrireUtilisateur(donneesInscription);

  return envoyerSucces(
    reponse,
    utilisateur,
    201,
    undefined,
    'Compte créé. Il doit être activé avant la première connexion.',
  );
}

// POST /api/v1/auth/connexion
export async function connexion(requete, reponse) {
  const { email, motDePasse } = requete.validees.body;
  const session = await connecterUtilisateur(email, motDePasse);

  return envoyerSucces(
    reponse,
    session,
    200,
    undefined,
    'Connexion réussie.',
  );
}

// POST /api/v1/auth/actualiser
export async function actualiser(requete, reponse) {
  const { jetonActualisation } = requete.validees.body;
  const nouveauxJetons = await actualiserSession(jetonActualisation);

  return envoyerSucces(
    reponse,
    nouveauxJetons,
    200,
    undefined,
    'Session actualisée.',
  );
}

// POST /api/v1/auth/deconnexion
export async function deconnexion(requete, reponse) {
  const { jetonActualisation } = requete.validees.body;
  const resultat = await deconnecterSession(jetonActualisation);

  return envoyerSucces(
    reponse,
    resultat,
    200,
    undefined,
    resultat.sessionRevoquee ? 'Déconnexion réussie.' : 'La session était déjà fermée.',
  );
}
