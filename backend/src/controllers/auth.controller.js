import {
  actualiserSession,
  connecterUtilisateur,
  deconnecterSession,
  inscrireUtilisateur,
} from '../services/auth.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function inscription(requete, reponse) {
  const utilisateur = await inscrireUtilisateur(requete.validees.body);
  return envoyerSucces(
    reponse,
    {
      utilisateur,
      message: 'Compte créé. Il doit être activé avant la première connexion.',
    },
    201,
  );
}

export async function connexion(requete, reponse) {
  const { email, motDePasse } = requete.validees.body;
  const resultat = await connecterUtilisateur(email, motDePasse);
  return envoyerSucces(reponse, resultat);
}

export async function actualiser(requete, reponse) {
  const resultat = await actualiserSession(requete.validees.body.jetonActualisation);
  return envoyerSucces(reponse, resultat);
}

export async function deconnexion(requete, reponse) {
  const resultat = await deconnecterSession(requete.validees.body.jetonActualisation);
  return envoyerSucces(reponse, resultat);
}
