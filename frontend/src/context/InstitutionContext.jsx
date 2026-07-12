import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from './AuthContext.jsx';

const InstitutionContext = createContext(null);

export function InstitutionProvider({ children }) {
  const { token } = useAuth();
  const [universite, setUniversite] = useState(undefined);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const response = await apiRequest('/universites/moi', { token });
      setUniversite(response.donnees);
      setError('');
    } catch (err) {
      setError(err.message);
      setUniversite(null);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  if (universite === undefined) return <div className="full-loading"><Spinner /> Chargement de l’espace institutionnel…</div>;

  return <InstitutionContext.Provider value={{ universite, setUniversite, refresh, error }}>{children}</InstitutionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useInstitution() {
  const value = useContext(InstitutionContext);
  if (!value) throw new Error('useInstitution doit être utilisé dans InstitutionProvider.');
  return value;
}
