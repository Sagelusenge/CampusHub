import { createContext, useContext, useState } from 'react';
import { apiRequest } from '../api/client.js';

const STORAGE_KEY = 'campushub_session';
const AuthContext = createContext(null);

function lireSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(lireSession);

  async function connexion(email, motDePasse) {
    const response = await apiRequest('/auth/connexion', {
      method: 'POST',
      body: { email, motDePasse },
    });
    const nouvelleSession = {
      utilisateur: response.donnees.utilisateur,
      jetonAcces: response.donnees.jetonAcces,
      jetonActualisation: response.donnees.jetonActualisation,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nouvelleSession));
    setSession(nouvelleSession);
    return nouvelleSession;
  }

  async function deconnexion() {
    if (session?.jetonActualisation) {
      await apiRequest('/auth/deconnexion', {
        method: 'POST',
        body: { jetonActualisation: session.jetonActualisation },
      }).catch(() => null);
    }
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }

  const value = {
    session,
    utilisateur: session?.utilisateur || null,
    token: session?.jetonAcces || null,
    connexion,
    deconnexion,
    estConnecte: Boolean(session?.jetonAcces),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  return context;
}
