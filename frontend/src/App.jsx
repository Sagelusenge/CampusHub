import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CampusHubChatWidget } from './components/CampusHubChatWidget.jsx';
import { DashboardShell } from './components/DashboardShell.jsx';
import { PageShell } from './components/PageShell.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { InstitutionProvider } from './context/InstitutionContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.jsx';
import { AdminLocationsPage } from './pages/AdminLocationsPage.jsx';
import { AdminContactsPage } from './pages/AdminContactsPage.jsx';
import { AdminAuditPage, AdminModerationPage, AdminRequestsPage, AdminUniversitiesPage, AdminUsersPage } from './pages/AdminManagementPages.jsx';
import { ComparePage } from './pages/ComparePage.jsx';
import { ContactPage } from './pages/ContactPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { InstitutionDashboardPage } from './pages/InstitutionDashboardPage.jsx';
import { InstitutionCopilotPage } from './pages/InstitutionCopilotPage.jsx';
import { InstitutionProfilePage } from './pages/InstitutionProfilePage.jsx';
import { InstitutionProgramsPage } from './pages/InstitutionProgramsPage.jsx';
import { InstitutionPublicationsPage } from './pages/InstitutionPublicationsPage.jsx';
import { InstitutionResourcePage } from './pages/InstitutionResourcePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { MessagesPage } from './pages/MessagesPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { NotificationsPage } from './pages/NotificationsPage.jsx';
import { OrientationAIPage } from './pages/OrientationAIPage.jsx';
import { PortfolioDetailPage } from './pages/PortfolioDetailPage.jsx';
import { PortfoliosPage } from './pages/PortfoliosPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { SocialFeedPage } from './pages/SocialFeedPage.jsx';
import { SocialRelationsPage } from './pages/SocialRelationsPage.jsx';
import { StudentAffiliationPage, StudentDashboardPage, StudentProfilePage } from './pages/StudentPages.jsx';
import { StudentRegistrationPage } from './pages/StudentRegistrationPage.jsx';
import { AdminSubscriptionsPage, InstitutionSubscriptionPage } from './pages/SubscriptionsPages.jsx';
import { UniversitiesPage } from './pages/UniversitiesPage.jsx';
import { UniversityApplicationPage } from './pages/UniversityApplicationPage.jsx';
import { OrganizationApplicationPage } from './pages/OrganizationApplicationPage.jsx';
import { UniversityAffiliationsPage } from './pages/UniversityAffiliationsPage.jsx';
import { InstitutionStudentsPage } from './pages/InstitutionStudentsPage.jsx';
import { UniversityDetailPage } from './pages/UniversityDetailPage.jsx';
import { VisitorRegistrationPage } from './pages/VisitorRegistrationPage.jsx';
import { InstitutionOffersPage } from './pages/InstitutionOffersPage.jsx';
import { OffersPage } from './pages/OffersPage.jsx';
import { OfferDetailPage } from './pages/OfferDetailPage.jsx';
import { OnlineEnrollmentPage } from './pages/OnlineEnrollmentPage.jsx';
import { InstitutionEnrollmentPage } from './pages/InstitutionEnrollmentPage.jsx';
import { InstitutionPartnersPage } from './pages/InstitutionPartnersPage.jsx';
import { FinalistOrientationPage } from './pages/FinalistOrientationPage.jsx';
import { FaqPage } from './pages/FaqPage.jsx';
import { ProfessionalReportsPage } from './pages/ProfessionalReportsPage.jsx';
import { ScrollToTop } from './components/ScrollToTop.jsx';
import { PublicUserProfilePage } from './pages/PublicUserProfilePage.jsx';
import { AppToast } from './components/AppToast.jsx';

const protectAdmin = <ProtectedRoute roles={['ADMINISTRATEUR']}><DashboardShell role="admin" /></ProtectedRoute>;
const protectInstitution = <ProtectedRoute roles={['UNIVERSITE']}><InstitutionProvider><DashboardShell role="institution" /></InstitutionProvider></ProtectedRoute>;
const protectStudent = <ProtectedRoute roles={['ETUDIANT']}><DashboardShell role="student" /></ProtectedRoute>;
const protectNetwork = <ProtectedRoute roles={['VISITEUR', 'ETUDIANT', 'UNIVERSITE', 'ENTREPRISE', 'ADMINISTRATEUR']}><SocialPageLayout /></ProtectedRoute>;

function SocialPageLayout() {
  const { utilisateur } = useAuth();
  if (utilisateur?.role === 'UNIVERSITE') {
    return <InstitutionProvider><DashboardShell role="institution" /></InstitutionProvider>;
  }
  const role = utilisateur?.role === 'ADMINISTRATEUR'
    ? 'admin'
    : utilisateur?.role === 'ETUDIANT' ? 'student' : 'visitor';
  return <DashboardShell role={role} />;
}

function destinationFor(role) {
  if (role === 'ADMINISTRATEUR') return '/administration';
  if (role === 'ETUDIANT') return '/espace-etudiant';
  if (role === 'UNIVERSITE') return '/espace-universite';
  if (role === 'VISITEUR') return '/reseau';
  if (role === 'ENTREPRISE') return '/reseau';
  return null;
}

function ConnectedHome({ children }) {
  const { estConnecte, utilisateur, initialisationTerminee } = useAuth();
  const destination = destinationFor(utilisateur?.role);
  if (!initialisationTerminee) return null;
  return estConnecte && destination
    ? <Navigate to={destination} replace /> : children;
}

function GlobalCampusHubAssistant() {
  const { pathname } = useLocation();
  const { utilisateur } = useAuth();
  const chemin = pathname.replace(/\/+$/, '');
  const roleSansAssistantFlottant = ['ADMINISTRATEUR', 'UNIVERSITE'].includes(utilisateur?.role);
  return chemin === '/connexion' || roleSansAssistantFlottant ? null : <CampusHubChatWidget />;
}

export function App() {
  return <><ScrollToTop /><Routes>
    <Route path="/" element={<ConnectedHome><HomePage /></ConnectedHome>} />
    <Route path="/universites" element={<UniversitiesPage />} />
    <Route path="/universites/:code" element={<UniversityDetailPage />} />
    <Route path="/comparaison" element={<ComparePage />} />
    <Route path="/portfolios" element={<PortfoliosPage />} />
    <Route path="/portfolios/:code" element={<PortfolioDetailPage />} />
    <Route element={protectNetwork}>
      <Route path="/reseau" element={<SocialFeedPage embedded />} />
      <Route path="/annonces" element={<SocialFeedPage key="annonces" initialFilter="ANNONCE" />} />
      <Route path="/relations" element={<SocialRelationsPage />} />
      <Route path="/profils-utilisateurs/:code" element={<PublicUserProfilePage />} />
      <Route path="/chat" element={<div className="container social-utility-page"><MessagesPage /></div>} />
      <Route path="/notifications" element={<div className="container social-utility-page"><NotificationsPage /></div>} />
      <Route path="/parametres" element={<section className="public-settings-page"><div className="container"><SettingsPage /></div></section>} />
    </Route>
    <Route path="/actualites" element={<Navigate to="/reseau" replace />} />
    <Route path="/faq" element={<FaqPage />} />
    <Route path="/contact" element={<ContactPage />} />
    <Route path="/offres" element={<OffersPage />} />
    <Route path="/offres/:code" element={<OfferDetailPage />} />
    <Route path="/universites/:code/inscription-en-ligne" element={<ProtectedRoute roles={['VISITEUR', 'ETUDIANT']}><OnlineEnrollmentPage /></ProtectedRoute>} />
    <Route path="/connexion" element={<ConnectedHome><LoginPage /></ConnectedHome>} />
    <Route path="/partenariat" element={<UniversityApplicationPage />} />
    <Route path="/partenariat-organisation" element={<OrganizationApplicationPage />} />
    <Route path="/inscription-etudiant" element={<StudentRegistrationPage />} />
    <Route path="/inscription-visiteur" element={<VisitorRegistrationPage />} />
    <Route path="/orientation" element={<ProtectedRoute roles={['VISITEUR', 'ETUDIANT']}><PageShell><OrientationAIPage /></PageShell></ProtectedRoute>} />
    <Route path="/orientation-finaliste" element={<ProtectedRoute roles={['VISITEUR', 'ETUDIANT']}><PageShell><FinalistOrientationPage /></PageShell></ProtectedRoute>} />

    <Route element={protectAdmin}>
      <Route path="/administration" element={<AdminDashboardPage />} />
      <Route path="/administration/demandes" element={<AdminRequestsPage />} />
      <Route path="/administration/universites" element={<AdminUniversitiesPage />} />
      <Route path="/administration/utilisateurs" element={<AdminUsersPage />} />
      <Route path="/administration/moderation" element={<AdminModerationPage />} />
      <Route path="/administration/audit" element={<AdminAuditPage />} />
      <Route path="/administration/abonnements" element={<AdminSubscriptionsPage />} />
      <Route path="/administration/localisations" element={<AdminLocationsPage />} />
      <Route path="/administration/contacts" element={<AdminContactsPage />} />
      <Route path="/administration/reseau" element={<SocialFeedPage embedded />} />
      <Route path="/administration/rapports" element={<ProfessionalReportsPage role="admin" />} />
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
      <Route path="/espace-universite/offres" element={<InstitutionOffersPage />} />
      <Route path="/espace-universite/inscriptions-en-ligne" element={<InstitutionEnrollmentPage />} />
      <Route path="/espace-universite/partenaires" element={<InstitutionPartnersPage />} />
      <Route path="/espace-universite/reseau" element={<SocialFeedPage embedded />} />
      <Route path="/espace-universite/rapports" element={<ProfessionalReportsPage role="institution" />} />
      <Route path="/espace-universite/copilote" element={<InstitutionCopilotPage />} />
      <Route path="/espace-universite/messages" element={<MessagesPage />} />
      <Route path="/espace-universite/affiliations" element={<UniversityAffiliationsPage />} />
      <Route path="/espace-universite/etudiants" element={<InstitutionStudentsPage />} />
      <Route path="/espace-universite/abonnement" element={<InstitutionSubscriptionPage />} />
      <Route path="/espace-universite/notifications" element={<NotificationsPage />} />
      <Route path="/espace-universite/parametres" element={<SettingsPage />} />
    </Route>

    <Route element={protectStudent}>
      <Route path="/espace-etudiant" element={<StudentDashboardPage />} />
      <Route path="/espace-etudiant/affiliation" element={<StudentAffiliationPage />} />
      <Route path="/espace-etudiant/profil" element={<StudentProfilePage />} />
      <Route path="/espace-etudiant/rapports" element={<ProfessionalReportsPage role="student" />} />
      <Route path="/espace-etudiant/reseau" element={<SocialFeedPage embedded />} />
      <Route path="/espace-etudiant/orientation" element={<OrientationAIPage embedded />} />
      <Route path="/espace-etudiant/orientation-finaliste" element={<FinalistOrientationPage embedded />} />
      <Route path="/espace-etudiant/actualites" element={<Navigate to="/espace-etudiant/reseau" replace />} />
      <Route path="/espace-etudiant/messages" element={<MessagesPage />} />
      <Route path="/espace-etudiant/notifications" element={<NotificationsPage />} />
      <Route path="/espace-etudiant/parametres" element={<SettingsPage />} />
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Routes><GlobalCampusHubAssistant /><AppToast /></>;
}
