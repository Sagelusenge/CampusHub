import {
  Activity,
  Bell,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileClock,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MapPin,
  Settings,
  ShieldCheck,
  School,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const adminNavigation = [
  { to: '/administration', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/administration/demandes', label: 'Demandes', icon: ClipboardCheck },
  { to: '/administration/universites', label: 'Universités', icon: Building2 },
  { to: '/administration/utilisateurs', label: 'Utilisateurs', icon: Users },
  { to: '/administration/moderation', label: 'Modération', icon: ShieldCheck },
  { to: '/administration/audit', label: 'Journal d’audit', icon: FileClock },
  { to: '/administration/abonnements', label: 'Abonnements', icon: CreditCard },
  { to: '/administration/localisations', label: 'Villes proposées', icon: MapPin },
  { to: '/administration/notifications', label: 'Notifications', icon: Bell },
];

const institutionNavigation = [
  { to: '/espace-universite', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/espace-universite/fiche', label: 'Fiche publique', icon: Building2 },
  { to: '/espace-universite/campus', label: 'Campus', icon: School },
  { to: '/espace-universite/formations', label: 'Facultés & filières', icon: GraduationCap },
  { to: '/espace-universite/services', label: 'Services', icon: Wrench },
  { to: '/espace-universite/infrastructures', label: 'Infrastructures', icon: Activity },
  { to: '/espace-universite/admissions', label: 'Admissions', icon: BookOpen },
  { to: '/espace-universite/publications', label: 'Publications', icon: FileText },
  { to: '/espace-universite/affiliations', label: 'Demandes étudiantes', icon: ClipboardCheck },
  { to: '/espace-universite/abonnement', label: 'Abonnement', icon: CreditCard },
  { to: '/espace-universite/notifications', label: 'Notifications', icon: Bell },
];

const studentNavigation = [
  { to: '/espace-etudiant', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/espace-etudiant/affiliation', label: 'Mon affiliation', icon: Building2 },
  { to: '/espace-etudiant/profil', label: 'Mon profil', icon: GraduationCap },
  { to: '/espace-etudiant/notifications', label: 'Notifications', icon: Bell },
];

const titles = {
  '/administration': 'Tableau de bord',
  '/administration/demandes': 'Demandes institutionnelles',
  '/administration/universites': 'Universités',
  '/administration/utilisateurs': 'Utilisateurs',
  '/administration/moderation': 'Modération',
  '/administration/audit': 'Journal d’audit',
  '/administration/abonnements': 'Abonnements et paiements',
  '/administration/localisations': 'Villes proposées',
  '/administration/notifications': 'Notifications',
  '/espace-universite': 'Tableau de bord',
  '/espace-universite/fiche': 'Fiche publique',
  '/espace-universite/campus': 'Campus',
  '/espace-universite/formations': 'Facultés et filières',
  '/espace-universite/services': 'Services universitaires',
  '/espace-universite/infrastructures': 'Infrastructures',
  '/espace-universite/admissions': 'Conditions d’admission',
  '/espace-universite/publications': 'Publications',
  '/espace-universite/affiliations': 'Demandes étudiantes',
  '/espace-universite/abonnement': 'Abonnement',
  '/espace-universite/notifications': 'Notifications',
  '/espace-etudiant': 'Tableau de bord',
  '/espace-etudiant/affiliation': 'Mon affiliation',
  '/espace-etudiant/profil': 'Mon profil',
  '/espace-etudiant/notifications': 'Notifications',
};

export function DashboardShell({ role }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const { utilisateur, token, deconnexion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = role === 'admin' ? adminNavigation : role === 'student' ? studentNavigation : institutionNavigation;
  const displayName = utilisateur?.nom_affichage || utilisateur?.nomAffichage || (role === 'admin' ? 'Administrateur' : 'Gestionnaire');
  const initials = displayName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    apiRequest('/notifications?page=1&limite=1&nonLues=true', { token })
      .then((response) => setUnread(Number(response.donnees?.nonLues || 0)))
      .catch(() => setUnread(0));
  }, [token, location.pathname]);

  async function quitter() {
    await deconnexion();
    navigate('/connexion');
  }

  return (
    <div className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`}>
      <aside className={`app-sidebar ${mobileOpen ? 'app-sidebar--open' : ''}`}>
        <div className="app-brand">
          <span className="app-brand__mark"><Building2 /></span>
          <span className="app-brand__text"><strong>CampusHub</strong><small>{role === 'admin' ? 'Administration centrale' : role === 'student' ? 'Espace étudiant' : 'Espace institutionnel'}</small></span>
          <button className="sidebar-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu"><X /></button>
        </div>

        <nav className="app-navigation" aria-label="Navigation de l’espace connecté">
          <span className="app-navigation__label">Menu principal</span>
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined}>
              <Icon /><span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar__bottom">
          <NavLink to={role === 'admin' ? '/administration/parametres' : role === 'student' ? '/espace-etudiant/parametres' : '/espace-universite/parametres'}><Settings /><span>Paramètres</span></NavLink>
          <button onClick={quitter}><LogOut /><span>Déconnexion</span></button>
        </div>
        <button className="sidebar-collapse" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}>{collapsed ? <ChevronRight /> : <ChevronLeft />}</button>
      </aside>

      {mobileOpen && <button className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu" />}

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar__start">
            <button className="mobile-menu-trigger" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu"><Menu /></button>
            <div><small>{role === 'admin' ? 'Administration' : role === 'student' ? 'Mon parcours' : 'Mon université'}</small><strong>{titles[location.pathname] || 'CampusHub'}</strong></div>
          </div>
          <div className="app-topbar__actions">
            <NavLink className="topbar-icon" to={role === 'admin' ? '/administration/notifications' : role === 'student' ? '/espace-etudiant/notifications' : '/espace-universite/notifications'} aria-label={`${unread} notification(s) non lue(s)`}><Bell />{unread > 0 && <span title={`${unread} non lue(s)`} />}</NavLink>
            <div className="topbar-profile"><div><strong>{displayName}</strong><small>{role === 'admin' ? 'Administrateur' : role === 'student' ? 'Étudiant' : 'Gestionnaire'}</small></div><span>{initials}</span></div>
          </div>
        </header>
        <main className="app-content"><Outlet /></main>
      </div>
    </div>
  );
}

export function DashboardPageHeader({ title, description, actions }) {
  return (
    <div className="content-heading">
      <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {actions && <div className="content-heading__actions">{actions}</div>}
    </div>
  );
}
