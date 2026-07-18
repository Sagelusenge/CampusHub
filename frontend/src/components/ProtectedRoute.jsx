import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from './Spinner.jsx';

export function ProtectedRoute({ roles, children }) {
  const { estConnecte, utilisateur, initialisationTerminee } = useAuth();
  const location = useLocation();

  if (!initialisationTerminee) return <div className="full-loading"><Spinner />Vérification de la session…</div>;
  if (!estConnecte) return <Navigate to="/connexion" state={{ from: location }} replace />;
  if (roles && !roles.includes(utilisateur?.role)) return <Navigate to="/" replace />;
  return children;
}
