import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CampusHubChatWidget } from './components/CampusHubChatWidget.jsx';
import { DashboardShell } from './components/DashboardShell.jsx';
import { PageShell } from './components/PageShell.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { InstitutionProvider } from './context/InstitutionContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { ScrollToTop } from './components/ScrollToTop.jsx';
import { AppToast } from './components/AppToast.jsx';
import { SeoManager } from './components/SeoManager.jsx';
import { Spinner } from './components/Spinner.jsx';

const lazyNamed = (chargeur, nom) => lazy(() => chargeur().then((module) => ({ default: module[nom] })));
const AdminDashboardPage = lazyNamed(() => import('./pages/AdminDashboardPage.jsx'), 'AdminDashboardPage');
const AdminLocationsPage = lazyNamed(() => import('./pages/AdminLocationsPage.jsx'), 'AdminLocationsPage');
const AdminContactsPage = lazyNamed(() => import('./pages/AdminContactsPage.jsx'), 'AdminContactsPage');
const AdminAuditPage = lazyNamed(() => import('./pages/AdminManagementPages.jsx'), 'AdminAuditPage');
const AdminModerationPage = lazyNamed(() => import('./pages/AdminManagementPages.jsx'), 'AdminModerationPage');
const AdminRequestsPage = lazyNamed(() => import('./pages/AdminManagementPages.jsx'), 'AdminRequestsPage');
const AdminUniversitiesPage = lazyNamed(() => import('./pages/AdminManagementPages.jsx'), 'AdminUniversitiesPage');
const AdminUsersPage = lazyNamed(() => import('./pages/AdminManagementPages.jsx'), 'AdminUsersPage');
const ComparePage = lazyNamed(() => import('./pages/ComparePage.jsx'), 'ComparePage');
const ContactPage = lazyNamed(() => import('./pages/ContactPage.jsx'), 'ContactPage');
const HomePage = lazyNamed(() => import('./pages/HomePage.jsx'), 'HomePage');
const InstitutionDashboardPage = lazyNamed(() => import('./pages/InstitutionDashboardPage.jsx'), 'InstitutionDashboardPage');
const InstitutionCopilotPage = lazyNamed(() => import('./pages/InstitutionCopilotPage.jsx'), 'InstitutionCopilotPage');
const InstitutionProfilePage = lazyNamed(() => import('./pages/InstitutionProfilePage.jsx'), 'InstitutionProfilePage');
const InstitutionProgramsPage = lazyNamed(() => import('./pages/InstitutionProgramsPage.jsx'), 'InstitutionProgramsPage');
const InstitutionPublicationsPage = lazyNamed(() => import('./pages/InstitutionPublicationsPage.jsx'), 'InstitutionPublicationsPage');
const InstitutionResourcePage = lazyNamed(() => import('./pages/InstitutionResourcePage.jsx'), 'InstitutionResourcePage');
const LoginPage = lazyNamed(() => import('./pages/LoginPage.jsx'), 'LoginPage');
const MessagesPage = lazyNamed(() => import('./pages/MessagesPage.jsx'), 'MessagesPage');
const NotFoundPage = lazyNamed(() => import('./pages/NotFoundPage.jsx'), 'NotFoundPage');
const NotificationsPage = lazyNamed(() => import('./pages/NotificationsPage.jsx'), 'NotificationsPage');
const OrientationAIPage = lazyNamed(() => import('./pages/OrientationAIPage.jsx'), 'OrientationAIPage');
const PortfolioDetailPage = lazyNamed(() => import('./pages/PortfolioDetailPage.jsx'), 'PortfolioDetailPage');
const PortfoliosPage = lazyNamed(() => import('./pages/PortfoliosPage.jsx'), 'PortfoliosPage');
const SettingsPage = lazyNamed(() => import('./pages/SettingsPage.jsx'), 'SettingsPage');
const SocialFeedPage = lazyNamed(() => import('./pages/SocialFeedPage.jsx'), 'SocialFeedPage');
const SocialRelationsPage = lazyNamed(() => import('./pages/SocialRelationsPage.jsx'), 'SocialRelationsPage');
const StudentAffiliationPage = lazyNamed(() => import('./pages/StudentPages.jsx'), 'StudentAffiliationPage');
const StudentDashboardPage = lazyNamed(() => import('./pages/StudentPages.jsx'), 'StudentDashboardPage');
const StudentProfilePage = lazyNamed(() => import('./pages/StudentPages.jsx'), 'StudentProfilePage');
const StudentRegistrationPage = lazyNamed(() => import('./pages/StudentRegistrationPage.jsx'), 'StudentRegistrationPage');
const AdminSubscriptionsPage = lazyNamed(() => import('./pages/SubscriptionsPages.jsx'), 'AdminSubscriptionsPage');
const InstitutionSubscriptionPage = lazyNamed(() => import('./pages/SubscriptionsPages.jsx'), 'InstitutionSubscriptionPage');
const UniversitiesPage = lazyNamed(() => import('./pages/UniversitiesPage.jsx'), 'UniversitiesPage');
const UniversityApplicationPage = lazyNamed(() => import('./pages/UniversityApplicationPage.jsx'), 'UniversityApplicationPage');
const OrganizationApplicationPage = lazyNamed(() => import('./pages/OrganizationApplicationPage.jsx'), 'OrganizationApplicationPage');
const UniversityAffiliationsPage = lazyNamed(() => import('./pages/UniversityAffiliationsPage.jsx'), 'UniversityAffiliationsPage');
const InstitutionStudentsPage = lazyNamed(() => import('./pages/InstitutionStudentsPage.jsx'), 'InstitutionStudentsPage');
const UniversityDetailPage = lazyNamed(() => import('./pages/UniversityDetailPage.jsx'), 'UniversityDetailPage');
const VisitorRegistrationPage = lazyNamed(() => import('./pages/VisitorRegistrationPage.jsx'), 'VisitorRegistrationPage');
const InstitutionOffersPage = lazyNamed(() => import('./pages/InstitutionOffersPage.jsx'), 'InstitutionOffersPage');
const OffersPage = lazyNamed(() => import('./pages/OffersPage.jsx'), 'OffersPage');
const OfferDetailPage = lazyNamed(() => import('./pages/OfferDetailPage.jsx'), 'OfferDetailPage');
const OnlineEnrollmentPage = lazyNamed(() => import('./pages/OnlineEnrollmentPage.jsx'), 'OnlineEnrollmentPage');
const InstitutionEnrollmentPage = lazyNamed(() => import('./pages/InstitutionEnrollmentPage.jsx'), 'InstitutionEnrollmentPage');
const InstitutionPartnersPage = lazyNamed(() => import('./pages/InstitutionPartnersPage.jsx'), 'InstitutionPartnersPage');
const FinalistOrientationPage = lazyNamed(() => import('./pages/FinalistOrientationPage.jsx'), 'FinalistOrientationPage');
const FaqPage = lazyNamed(() => import('./pages/FaqPage.jsx'), 'FaqPage');
const ProfessionalReportsPage = lazyNamed(() => import('./pages/ProfessionalReportsPage.jsx'), 'ProfessionalReportsPage');
const PublicUserProfilePage = lazyNamed(() => import('./pages/PublicUserProfilePage.jsx'), 'PublicUserProfilePage');

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
  return <><ScrollToTop /><SeoManager /><Suspense fallback={<div className="page-lazy-loading"><Spinner /><span>Chargement de CampusHub…</span></div>}><Routes>
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
  </Routes></Suspense><GlobalCampusHubAssistant /><AppToast /></>;
}
