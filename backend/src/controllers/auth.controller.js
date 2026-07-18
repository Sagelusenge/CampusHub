import {
  actualiserSession,
  connecterUtilisateur,
  deconnecterSession,
  inscrireUtilisateur,
} from '../services/auth.service.js';
import { environnement } from '../config/environnement.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { envoyerSucces } from '../utils/reponse-api.js';

const NOM_COOKIE_ACTUALISATION = 'campushub_refresh';
const optionsCookie = {
  httpOnly: true,
  secure: environnement.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/v1/auth',
};

function lireCookieActualisation(requete) {
  const entete = requete.headers.cookie;
  if (!entete) return null;
  const prefixe = `${NOM_COOKIE_ACTUALISATION}=`;
  const cookie = entete.split(';').map((partie) => partie.trim())
    .find((partie) => partie.startsWith(prefixe));
  return cookie ? decodeURIComponent(cookie.slice(prefixe.length)) : null;
}

function definirCookieActualisation(reponse, jeton) {
  reponse.cookie(NOM_COOKIE_ACTUALISATION, jeton, {
    ...optionsCookie,
    maxAge: environnement.REFRESH_TOKEN_DAYS * 86_400_000,
  });
}

function supprimerCookieActualisation(reponse) {
  reponse.clearCookie(NOM_COOKIE_ACTUALISATION, optionsCookie);
}

function sansJetonActualisation(session) {
  const { jetonActualisation: _jetonActualisation, ...donneesPubliques } = session;
  return donneesPubliques;
}

// POST /api/v1/auth/inscription
export async function inscription(requete, reponse) {
  const donneesInscription = requete.validees.body;
  const utilisateur = await inscrireUtilisateur(donneesInscription);

  return envoyerSucces(
    reponse,
    utilisateur,
    201,
    undefined,
    ['ETUDIANT', 'VISITEUR'].includes(donneesInscription.role)
      ? 'Compte créé. Vous pouvez maintenant vous connecter.'
      : 'Compte créé. Le paiement mensuel doit être validé avant la première connexion.',
  );
}

// POST /api/v1/auth/connexion
export async function connexion(requete, reponse) {
  const { email, motDePasse } = requete.validees.body;
  const session = await connecterUtilisateur(email, motDePasse);
  definirCookieActualisation(reponse, session.jetonActualisation);

  return envoyerSucces(
    reponse,
    sansJetonActualisation(session),
    200,
    undefined,
    'Connexion réussie.',
  );
}

// POST /api/v1/auth/actualiser
export async function actualiser(requete, reponse) {
  const jetonActualisation = lireCookieActualisation(requete);
  if (!jetonActualisation) throw new ErreurApi(401, 'La session ne peut pas être actualisée.');

  let nouveauxJetons;
  try {
    nouveauxJetons = await actualiserSession(jetonActualisation);
  } catch (erreur) {
    supprimerCookieActualisation(reponse);
    throw erreur;
  }
  definirCookieActualisation(reponse, nouveauxJetons.jetonActualisation);

  return envoyerSucces(
    reponse,
    sansJetonActualisation(nouveauxJetons),
    200,
    undefined,
    'Session actualisée.',
  );
}

// POST /api/v1/auth/deconnexion
export async function deconnexion(requete, reponse) {
  const jetonActualisation = lireCookieActualisation(requete);
  const resultat = jetonActualisation
    ? await deconnecterSession(jetonActualisation)
    : { sessionRevoquee: false };
  supprimerCookieActualisation(reponse);

  return envoyerSucces(
    reponse,
    resultat,
    200,
    undefined,
    resultat.sessionRevoquee ? 'Déconnexion réussie.' : 'La session était déjà fermée.',
  );
}
