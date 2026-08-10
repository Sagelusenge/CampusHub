import {
  Bell, BriefcaseBusiness, Building2, Home, LogOut, Mail, MessageCircle, Settings,
  UserRound, UserRoundPlus, Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { DashboardShell } from './DashboardShell.jsx';

function navigationPour(role, embedded) {
  if (!embedded) return {
    accueil: '/reseau', relations: '/relations', chat: '/chat',
    notifications: '/notifications', parametres: '/parametres',
  };
  if (role === 'UNIVERSITE') return {
    accueil: '/espace-universite/reseau', relations: '/relations',
    chat: '/espace-universite/messages', notifications: '/espace-universite/notifications',
    parametres: '/espace-universite/parametres',
  };
  if (role === 'ETUDIANT') return {
    accueil: '/espace-etudiant/reseau', relations: '/relations',
    chat: '/espace-etudiant/messages', notifications: '/espace-etudiant/notifications',
    parametres: '/espace-etudiant/parametres',
  };
  if (role === 'ADMINISTRATEUR') return {
    accueil: '/administration/reseau', relations: '/relations', chat: '/chat',
    notifications: '/administration/notifications', parametres: '/administration/parametres',
  };
  return navigationPour(role, false);
}

export function SocialNavigation({ embedded = false }) {
  const { token, utilisateur, deconnexion } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const chemins = navigationPour(utilisateur?.role, embedded);
  const estNavigationVisiteur = !embedded && utilisateur?.role === 'VISITEUR';
  const links = [
    { to: chemins.accueil, label: estNavigationVisiteur ? 'Réseau' : 'Accueil', icon: Home, end: true },
    ...(estNavigationVisiteur ? [
      { to: '/universites', label: 'Établissements', icon: Building2 },
      { to: '/offres', label: 'Offres', icon: BriefcaseBusiness },
    ] : []),
    { to: chemins.relations, label: 'Relations', icon: Users },
    { to: chemins.chat, label: 'Messages', icon: MessageCircle },
    ...(estNavigationVisiteur ? [
      { to: '/contact', label: 'Contact', icon: Mail },
    ] : []),
    { to: chemins.notifications, label: 'Notifications', icon: Bell, badge: true },
    { to: chemins.parametres, label: estNavigationVisiteur ? 'Mon profil' : 'Paramètres', icon: estNavigationVisiteur ? UserRound : Settings },
  ];
  useEffect(() => {
    apiRequest('/notifications?page=1&limite=1&nonLues=true', { token })
      .then((response) => setUnread(Number(response.donnees?.nonLues || 0)))
      .catch(() => setUnread(0));
  }, [token]);
  async function quitter() {
    await deconnexion();
    navigate('/connexion');
  }
  return <nav className={`social-topnav ${embedded ? 'social-topnav--embedded' : ''} ${estNavigationVisiteur ? 'social-topnav--visitor' : ''}`} aria-label={estNavigationVisiteur ? 'Navigation de l’espace visiteur' : 'Navigation du réseau CampusHub'}>
    <div className="container social-topnav__inner">
      <NavLink className="social-topnav__brand" to={chemins.accueil}><span><UserRoundPlus /></span><strong>{estNavigationVisiteur ? 'Espace visiteur' : 'CampusHub Social'}</strong></NavLink>
      <div className="social-topnav__links">{links.map((item) => <NavLink key={item.to} to={item.to} end={item.end} title={item.label} aria-label={item.label}>
        <item.icon /><span>{item.label}</span>{item.badge && unread > 0 && <i>{unread > 9 ? '9+' : unread}</i>}
      </NavLink>)}</div>
      {estNavigationVisiteur && <div className="social-topnav__account"><button type="button" onClick={quitter} aria-label="Se déconnecter"><LogOut /></button></div>}
    </div>
  </nav>;
}

export function SocialPageLayout() {
  const { utilisateur } = useAuth();
  if (utilisateur?.role === 'VISITEUR') return <DashboardShell role="visitor" />;
  return <><SocialNavigation /><main className="social-route-content"><Outlet /></main></>;
}
