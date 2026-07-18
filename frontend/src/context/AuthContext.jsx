import { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [initialisationTerminee, setInitialisationTerminee] = useState(false);

  useEffect(() => {
    let actif = true;
    // Supprime une éventuelle session héritée de l’ancienne version qui stockait les jetons côté navigateur.
    globalThis.localStorage?.removeItem('campushub_session');
    apiRequest('/auth/actualiser', { method: 'POST' })
      .then((response) => {
        if (actif) setSession({
          utilisateur: response.donnees.utilisateur,
          jetonAcces: response.donnees.jetonAcces,
        });
      })
      .catch(() => {
        if (actif) setSession(null);
      })
      .finally(() => {
        if (actif) setInitialisationTerminee(true);
      });
    return () => { actif = false; };
  }, []);

  async function connexion(email, motDePasse) {
    const response = await apiRequest('/auth/connexion', {
      method: 'POST',
      body: { email, motDePasse },
    });
    const nouvelleSession = {
      utilisateur: response.donnees.utilisateur,
      jetonAcces: response.donnees.jetonAcces,
    };
    setSession(nouvelleSession);
    return nouvelleSession;
  }

  async function deconnexion() {
    try {
      await apiRequest('/auth/deconnexion', { method: 'POST' });
    } finally {
      setSession(null);
    }
  }

  function mettreAJourUtilisateur(utilisateur) {
    setSession((sessionActuelle) => {
      if (!sessionActuelle) return sessionActuelle;
      return { ...sessionActuelle, utilisateur };
    });
  }

  const value = {
    session,
    utilisateur: session?.utilisateur || null,
    token: session?.jetonAcces || null,
    connexion,
    deconnexion,
    mettreAJourUtilisateur,
    estConnecte: Boolean(session?.jetonAcces),
    initialisationTerminee,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  return context;
}
