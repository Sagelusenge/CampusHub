import {
  Activity,
  Bell,
  Bot,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  FileClock,
  FileText,
  GraduationCap,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  MapPin,
  Mail,
  MessageCircle,
  Settings,
  ShieldCheck,
  School,
  UserRound,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { AccountMenu } from './AccountMenu.jsx';
import { LanguageSelector } from './LanguageSelector.jsx';
import { SocialNavigation } from './SocialNavigation.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useInstitution } from '../context/InstitutionContext.jsx';
import { notifierNouvelleActivite } from '../utils/notifications-navigateur.js';

const SIDEBAR_STORAGE_PREFIX = 'campushub-sidebar-collapsed';

function lireEtatSidebar(role) {
  try {
    return globalThis.localStorage?.getItem(`${SIDEBAR_STORAGE_PREFIX}-${role}`) === 'true';
  } catch {
    return false;
  }
}

const adminNavigation = [
  { to: '/administration', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/administration/demandes', label: 'Demandes', icon: ClipboardCheck },
  { to: '/administration/universites', label: 'Établissements', icon: Building2 },
  { to: '/administration/utilisateurs', label: 'Utilisateurs', icon: Users },
  { to: '/administration/moderation', label: 'Modération', icon: ShieldCheck },
  { to: '/administration/audit', label: 'Journal d’audit', icon: FileClock },
  { to: '/administration/abonnements', label: 'Abonnements', icon: CreditCard },
  { to: '/administration/localisations', label: 'Villes proposées', icon: MapPin },
  { to: '/administration/contacts', label: 'Messages de contact', icon: Mail },
  { to: '/administration/reseau', label: 'Réseau CampusHub', icon: Newspaper },
  { to: '/administration/rapports', label: 'Rapports', icon: FileText },
  { to: '/administration/notifications', label: 'Notifications', icon: Bell },
];

function institutionNavigation(isSchool) {
  const navigation = [
    { to: '/espace-universite', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
    { to: '/espace-universite/fiche', label: 'Fiche publique', icon: Building2 },
    { label: isSchool ? 'École' : 'Campus & formations', icon: School, children: [
      { to: '/espace-universite/campus', label: isSchool ? 'Sites scolaires' : 'Campus', icon: MapPin },
      { to: '/espace-universite/formations', label: isSchool ? 'Sections & options' : 'Facultés & filières', icon: GraduationCap },
      { to: '/espace-universite/services', label: isSchool ? 'Services scolaires' : 'Services', icon: Wrench },
      { to: '/espace-universite/infrastructures', label: 'Infrastructures', icon: Activity },
      { to: '/espace-universite/admissions', label: isSchool ? 'Conditions d’inscription' : 'Admissions', icon: BookOpen },
    ] },
    { to: '/espace-universite/offres', label: 'Offres', icon: BriefcaseBusiness },
    { to: '/espace-universite/inscriptions-en-ligne', label: 'Inscriptions en ligne', icon: ClipboardCheck },
    { to: '/espace-universite/partenaires', label: 'Partenaires', icon: Handshake },
    { to: '/espace-universite/publications', label: 'Publications', icon: FileText },
    { to: '/espace-universite/reseau', label: 'Réseau CampusHub', icon: Newspaper },
    { to: '/espace-universite/rapports', label: 'Rapports', icon: FileText },
  ];
  if (!isSchool) navigation.push({ to: '/espace-universite/copilote', label: 'Copilote établissement', icon: Bot });
  navigation.push(
    { to: '/espace-universite/messages', label: 'Messages', icon: MessageCircle },
    { to: '/espace-universite/affiliations', label: isSchool ? 'Demandes des élèves' : 'Demandes étudiantes', icon: ClipboardCheck },
    { to: '/espace-universite/etudiants', label: isSchool ? 'Gestion des élèves' : 'Gestion des étudiants', icon: Users },
    { to: '/espace-universite/abonnement', label: 'Abonnement', icon: CreditCard },
    { to: '/espace-universite/notifications', label: 'Notifications', icon: Bell },
  );
  return navigation;
}

const studentNavigation = [
  { to: '/espace-etudiant', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/espace-etudiant/reseau', label: 'Réseau CampusHub', icon: Newspaper },
  { to: '/espace-etudiant/orientation', label: 'CampusHubIA', icon: Bot },
  { to: '/espace-etudiant/orientation-finaliste', label: 'Orientation finaliste', icon: BookOpen },
  { to: '/espace-etudiant/messages', label: 'Messages', icon: MessageCircle },
  { to: '/espace-etudiant/affiliation', label: 'Mon affiliation', icon: Building2 },
  { to: '/espace-etudiant/profil', label: 'Mon profil', icon: GraduationCap },
  { to: '/espace-etudiant/rapports', label: 'Rapports', icon: FileText },
  { to: '/espace-etudiant/notifications', label: 'Notifications', icon: Bell },
];

const visitorNavigation = [
  { to: '/reseau', label: 'Réseau', icon: Newspaper, end: true },
  { action: 'assistant', label: 'CampusHubIA', icon: Bot },
  { to: '/universites', label: 'Établissements', icon: Building2 },
  { to: '/offres', label: 'Offres', icon: BriefcaseBusiness },
  { to: '/contact', label: 'Contact', icon: Mail },
  { to: '/faq', label: 'Aide', icon: BookOpen },
];

const titles = {
  '/administration': 'Tableau de bord',
  '/administration/demandes': 'Demandes institutionnelles',
  '/administration/universites': 'Établissements',
  '/administration/utilisateurs': 'Utilisateurs',
  '/administration/moderation': 'Modération',
  '/administration/audit': 'Journal d’audit',
  '/administration/abonnements': 'Abonnements et paiements',
  '/administration/localisations': 'Villes proposées',
  '/administration/contacts': 'Messages de contact',
  '/administration/reseau': 'Réseau CampusHub',
  '/administration/rapports': 'Rapports professionnels',
  '/administration/notifications': 'Notifications',
  '/espace-universite': 'Tableau de bord',
  '/espace-universite/fiche': 'Fiche publique',
  '/espace-universite/campus': 'Campus',
  '/espace-universite/formations': 'Facultés et filières',
  '/espace-universite/services': 'Services universitaires',
  '/espace-universite/infrastructures': 'Infrastructures',
  '/espace-universite/admissions': 'Conditions d’admission',
  '/espace-universite/publications': 'Publications',
  '/espace-universite/offres': 'Offres',
  '/espace-universite/inscriptions-en-ligne': 'Inscriptions en ligne',
  '/espace-universite/partenaires': 'Partenaires',
  '/espace-universite/reseau': 'Réseau CampusHub',
  '/espace-universite/rapports': 'Rapports professionnels',
  '/espace-universite/copilote': 'Copilote établissement',
  '/espace-universite/messages': 'Messages',
  '/espace-universite/affiliations': 'Demandes étudiantes',
  '/espace-universite/etudiants': 'Gestion des étudiants',
  '/espace-universite/abonnement': 'Abonnement',
  '/espace-universite/notifications': 'Notifications',
  '/espace-etudiant': 'Tableau de bord',
  '/espace-etudiant/reseau': 'Réseau CampusHub',
  '/espace-etudiant/orientation': 'CampusHubIA',
  '/espace-etudiant/orientation-finaliste': 'Orientation finaliste',
  '/espace-etudiant/messages': 'Messages',
  '/espace-etudiant/affiliation': 'Mon affiliation',
  '/espace-etudiant/profil': 'Mon profil',
  '/espace-etudiant/rapports': 'Rapports professionnels',
  '/espace-etudiant/notifications': 'Notifications',
  '/reseau': 'Réseau CampusHub',
  '/orientation': 'Conseiller universitaire CampusHubIA',
  '/universites': 'Établissements',
  '/offres': 'Offres',
  '/annonces': 'Annonces',
  '/relations': 'Relations',
  '/chat': 'Messages',
  '/contact': 'Contact',
  '/faq': 'Centre d’aide',
  '/notifications': 'Notifications',
  '/parametres': 'Mon profil',
};

export function DashboardShell({ role, children }) {
  if (role === 'institution') return <InstitutionDashboardShell>{children}</InstitutionDashboardShell>;
  return <DashboardShellContent role={role}>{children}</DashboardShellContent>;
}

function InstitutionDashboardShell({ children }) {
  const { universite } = useInstitution();
  return <DashboardShellContent role="institution" institution={universite}>{children}</DashboardShellContent>;
}

function DashboardShellContent({ role, institution, children }) {
  const [collapsed, setCollapsed] = useState(() => lireEtatSidebar(role));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [campusOpen, setCampusOpen] = useState(true);
  const { token, deconnexion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSchool = institution?.categorie_etablissement === 'ECOLE_SECONDAIRE';
  const socialRoute = isSocialRoute(location.pathname);
  const navigation = role === 'admin'
    ? adminNavigation
    : role === 'student'
      ? studentNavigation
      : role === 'visitor'
        ? visitorNavigation
        : institutionNavigation(isSchool);

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(`${SIDEBAR_STORAGE_PREFIX}-${role}`, String(collapsed));
    } catch {
      // La navigation reste utilisable lorsque le stockage du navigateur est indisponible.
    }
  }, [collapsed, role]);

  useEffect(() => {
    let actif = true;
    const verifier = () => apiRequest('/notifications?page=1&limite=1&nonLues=true', { token })
      .then((response) => {
        if (!actif) return;
        setUnread(Number(response.donnees?.nonLues || 0));
        notifierNouvelleActivite(response.donnees?.notifications?.[0]).catch(() => null);
      })
      .catch(() => { if (actif) setUnread(0); });
    verifier();
    const intervalle = window.setInterval(verifier, 20_000);
    return () => { actif = false; window.clearInterval(intervalle); };
  }, [token, location.pathname]);

  async function quitter() {
    await deconnexion();
    navigate('/connexion');
  }

  function ouvrirAssistant() {
    window.dispatchEvent(new CustomEvent('campushub:ouvrir-assistant'));
    setMobileOpen(false);
  }

  return (
    <div className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`}>
      <aside className={`app-sidebar ${mobileOpen ? 'app-sidebar--open' : ''}`}>
        <div className="app-brand">
          <span className="app-brand__mark"><Building2 /></span>
          <span className="app-brand__text"><strong>CampusHub</strong><small>{role === 'admin' ? 'Administration centrale' : role === 'student' ? 'Espace étudiant' : role === 'visitor' ? 'Espace visiteur' : isSchool ? 'Espace scolaire' : 'Espace institutionnel'}</small></span>
          <button className="sidebar-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu"><X /></button>
        </div>

        <nav className="app-navigation" aria-label="Navigation de l’espace connecté">
          <span className="app-navigation__label">Menu principal</span>
          {navigation.map((item) => item.children ? (
            <div className={`nav-group ${campusOpen ? 'nav-group--open' : ''}`} key={item.label}>
              <button type="button" className="nav-group__trigger" onClick={() => setCampusOpen((value) => !value)} title={collapsed ? item.label : undefined}>
                <item.icon /><span>{item.label}</span><ChevronDown className="nav-group__chevron" />
              </button>
              {campusOpen && <div className="nav-group__children">{item.children.map((child) => <NavLink key={child.to} to={child.to} onClick={() => setMobileOpen(false)}><child.icon /><span>{child.label}</span></NavLink>)}</div>}
            </div>
          ) : item.action === 'assistant' ? (
            <button className="app-navigation__action" key={item.action} type="button" onClick={ouvrirAssistant} title={collapsed ? item.label : undefined}>
              <item.icon /><span>{item.label}</span>
            </button>
          ) : (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMobileOpen(false)} title={collapsed ? item.label : undefined}>
              <item.icon /><span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar__bottom">
          <NavLink to={role === 'admin' ? '/administration/parametres' : role === 'student' ? '/espace-etudiant/parametres' : role === 'visitor' ? '/parametres' : '/espace-universite/parametres'}>{role === 'visitor' ? <UserRound /> : <Settings />}<span>{role === 'visitor' ? 'Profil & paramètres' : 'Paramètres'}</span></NavLink>
          <button onClick={quitter}><LogOut /><span>Déconnexion</span></button>
        </div>
        <button className="sidebar-collapse" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}>{collapsed ? <ChevronRight /> : <ChevronLeft />}</button>
      </aside>

      {mobileOpen && <button className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu" />}

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar__start">
            <button className="mobile-menu-trigger" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu"><Menu /></button>
            <div><small>{role === 'admin' ? 'Administration' : role === 'student' ? 'Mon parcours' : role === 'visitor' ? 'Mon espace' : isSchool ? 'Mon école' : 'Mon université'}</small><strong>{schoolTitle(location.pathname, isSchool) || titles[location.pathname] || visitorTitle(location.pathname, role) || 'CampusHub'}</strong></div>
          </div>
          <div className="app-topbar__actions">
            <LanguageSelector compact />
            <NavLink className="topbar-icon" to={role === 'admin' ? '/administration/notifications' : role === 'student' ? '/espace-etudiant/notifications' : role === 'visitor' ? '/notifications' : '/espace-universite/notifications'} aria-label={`${unread} notification(s) non lue(s)`}><Bell />{unread > 0 && <span title={`${unread} non lue(s)`} />}</NavLink>
            <AccountMenu roleLabel={role === 'admin' ? 'Administrateur' : role === 'student' ? 'Étudiant' : role === 'visitor' ? 'Visiteur' : isSchool ? 'Gestionnaire scolaire' : 'Gestionnaire'} />
          </div>
        </header>
        {socialRoute && <div className="app-social-navigation"><SocialNavigation embedded /></div>}
        <main className={`app-content ${role === 'visitor' ? 'app-content--visitor' : ''}`}>{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}

function isSocialRoute(path) {
  return path === '/reseau'
    || path === '/relations'
    || path === '/chat'
    || path === '/administration/reseau'
    || path === '/espace-universite/reseau'
    || path === '/espace-universite/messages'
    || path === '/espace-etudiant/reseau'
    || path === '/espace-etudiant/messages';
}

function visitorTitle(path, role) {
  if (role !== 'visitor') return null;
  if (path.startsWith('/universites/')) return 'Fiche de l’établissement';
  if (path.startsWith('/offres/')) return 'Détail de l’offre';
  if (path.startsWith('/portfolios/')) return 'Profil CampusHub';
  if (path.includes('orientation')) return 'Orientation';
  return null;
}

function schoolTitle(path, isSchool) {
  if (!isSchool) return null;
  return {
    '/espace-universite/campus': 'Sites scolaires',
    '/espace-universite/formations': 'Sections et options',
    '/espace-universite/services': 'Services scolaires',
    '/espace-universite/admissions': 'Conditions d’inscription',
    '/espace-universite/affiliations': 'Demandes des élèves',
    '/espace-universite/etudiants': 'Gestion des élèves',
  }[path];
}

export function DashboardPageHeader({ title, description, actions }) {
  return (
    <div className="content-heading">
      <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {actions && <div className="content-heading__actions">{actions}</div>}
    </div>
  );
}
