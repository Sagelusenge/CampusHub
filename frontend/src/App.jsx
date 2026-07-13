import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardShell } from './components/DashboardShell.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { InstitutionProvider } from './context/InstitutionContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.jsx';
import { AdminLocationsPage } from './pages/AdminLocationsPage.jsx';
import { AdminAuditPage, AdminModerationPage, AdminRequestsPage, AdminUniversitiesPage, AdminUsersPage } from './pages/AdminManagementPages.jsx';
import { ComparePage } from './pages/ComparePage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { InstitutionDashboardPage } from './pages/InstitutionDashboardPage.jsx';
import { InstitutionProfilePage } from './pages/InstitutionProfilePage.jsx';
import { InstitutionProgramsPage } from './pages/InstitutionProgramsPage.jsx';
import { InstitutionPublicationsPage } from './pages/InstitutionPublicationsPage.jsx';
import { InstitutionResourcePage } from './pages/InstitutionResourcePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { MessagesPage } from './pages/MessagesPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { NotificationsPage } from './pages/NotificationsPage.jsx';
import { PortfolioDetailPage } from './pages/PortfolioDetailPage.jsx';
import { PortfoliosPage } from './pages/PortfoliosPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { SocialFeedPage } from './pages/SocialFeedPage.jsx';
import { StudentAffiliationPage, StudentDashboardPage, StudentProfilePage } from './pages/StudentPages.jsx';
import { StudentRegistrationPage } from './pages/StudentRegistrationPage.jsx';
import { AdminSubscriptionsPage, InstitutionSubscriptionPage } from './pages/SubscriptionsPages.jsx';
import { UniversitiesPage } from './pages/UniversitiesPage.jsx';
import { UniversityApplicationPage } from './pages/UniversityApplicationPage.jsx';
import { UniversityAffiliationsPage } from './pages/UniversityAffiliationsPage.jsx';
import { UniversityDetailPage } from './pages/UniversityDetailPage.jsx';

const protectAdmin = <ProtectedRoute roles={['ADMINISTRATEUR']}><DashboardShell role="admin" /></ProtectedRoute>;
const protectInstitution = <ProtectedRoute roles={['UNIVERSITE']}><InstitutionProvider><DashboardShell role="institution" /></InstitutionProvider></ProtectedRoute>;
const protectStudent = <ProtectedRoute roles={['ETUDIANT']}><DashboardShell role="student" /></ProtectedRoute>;

function destinationFor(role) {
  if (role === 'ADMINISTRATEUR') return '/administration';
  if (role === 'ETUDIANT') return '/espace-etudiant';
  if (role === 'UNIVERSITE') return '/espace-universite';
  return null;
}

function ConnectedHome({ children }) {
  const { estConnecte, utilisateur } = useAuth();
  const destination = destinationFor(utilisateur?.role);
  return estConnecte && destination ? <Navigate to={destination} replace /> : children;
}

export function App() {
  return <Routes>
    <Route path="/" element={<ConnectedHome><HomePage /></ConnectedHome>} />
    <Route path="/universites" element={<UniversitiesPage />} />
    <Route path="/universites/:code" element={<UniversityDetailPage />} />
    <Route path="/comparaison" element={<ComparePage />} />
    <Route path="/portfolios" element={<PortfoliosPage />} />
    <Route path="/portfolios/:code" element={<PortfolioDetailPage />} />
    <Route path="/actualites" element={<SocialFeedPage />} />
    <Route path="/connexion" element={<ConnectedHome><LoginPage /></ConnectedHome>} />
    <Route path="/partenariat" element={<UniversityApplicationPage />} />
    <Route path="/inscription-etudiant" element={<StudentRegistrationPage />} />

    <Route element={protectAdmin}>
      <Route path="/administration" element={<AdminDashboardPage />} />
      <Route path="/administration/demandes" element={<AdminRequestsPage />} />
      <Route path="/administration/universites" element={<AdminUniversitiesPage />} />
      <Route path="/administration/utilisateurs" element={<AdminUsersPage />} />
      <Route path="/administration/moderation" element={<AdminModerationPage />} />
      <Route path="/administration/audit" element={<AdminAuditPage />} />
      <Route path="/administration/abonnements" element={<AdminSubscriptionsPage />} />
      <Route path="/administration/localisations" element={<AdminLocationsPage />} />
      <Route path="/administration/notifications" element={<NotificationsPage />} />
      <Route path="/administration/parametres" element={<SettingsPage />} />
    </Route>

    <Route element={protectInstitution}>
      <Route path="/espace-universite" element={<InstitutionDashboardPage />} />
      <Route path="/espace-universite/fiche" element={<InstitutionProfilePage />} />
      <Route path="/espace-universite/campus" element={<InstitutionResourcePage type="campus" />} />
      <Route path="/espace-universite/formations" element={<InstitutionProgramsPage />} />
      <Route path="/espace-universite/services" element={<InstitutionResourcePage type="services" />} />
      <Route path="/espace-universite/infrastructures" element={<InstitutionResourcePage type="infrastructures" />} />
      <Route path="/espace-universite/admissions" element={<InstitutionResourcePage type="admissions" />} />
      <Route path="/espace-universite/publications" element={<InstitutionPublicationsPage />} />
      <Route path="/espace-universite/messages" element={<MessagesPage />} />
      <Route path="/espace-universite/affiliations" element={<UniversityAffiliationsPage />} />
      <Route path="/espace-universite/abonnement" element={<InstitutionSubscriptionPage />} />
      <Route path="/espace-universite/notifications" element={<NotificationsPage />} />
      <Route path="/espace-universite/parametres" element={<SettingsPage />} />
    </Route>

    <Route element={protectStudent}>
      <Route path="/espace-etudiant" element={<StudentDashboardPage />} />
      <Route path="/espace-etudiant/affiliation" element={<StudentAffiliationPage />} />
      <Route path="/espace-etudiant/profil" element={<StudentProfilePage />} />
      <Route path="/espace-etudiant/actualites" element={<SocialFeedPage embedded />} />
      <Route path="/espace-etudiant/messages" element={<MessagesPage />} />
      <Route path="/espace-etudiant/notifications" element={<NotificationsPage />} />
      <Route path="/espace-etudiant/parametres" element={<SettingsPage />} />
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Routes>;
}
