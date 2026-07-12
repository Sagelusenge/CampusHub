import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { InstitutionDashboardPage } from './pages/InstitutionDashboardPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { UniversityApplicationPage } from './pages/UniversityApplicationPage.jsx';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/partenariat" element={<UniversityApplicationPage />} />
      <Route path="/administration" element={<ProtectedRoute roles={['ADMINISTRATEUR']}><AdminDashboardPage /></ProtectedRoute>} />
      <Route path="/espace-universite" element={<ProtectedRoute roles={['UNIVERSITE']}><InstitutionDashboardPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
