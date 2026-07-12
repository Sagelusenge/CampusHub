import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedRoute({ roles, children }) {
  const { estConnecte, utilisateur } = useAuth();
  const location = useLocation();

  if (!estConnecte) return <Navigate to="/connexion" state={{ from: location }} replace />;
  if (roles && !roles.includes(utilisateur?.role)) return <Navigate to="/" replace />;
  return children;
}
