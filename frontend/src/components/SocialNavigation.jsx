import {
  Home, MessageCircle, UserRoundPlus, Users,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function navigationPour(role) {
  if (role === 'UNIVERSITE') return {
    accueil: '/espace-universite/reseau', relations: '/relations',
    chat: '/espace-universite/messages',
  };
  if (role === 'ETUDIANT') return {
    accueil: '/espace-etudiant/reseau', relations: '/relations',
    chat: '/espace-etudiant/messages',
  };
  if (role === 'ADMINISTRATEUR') return {
    accueil: '/administration/reseau', relations: '/relations', chat: '/chat',
  };
  return { accueil: '/reseau', relations: '/relations', chat: '/chat' };
}

export function SocialNavigation({ embedded = false }) {
  const { utilisateur } = useAuth();
  const chemins = navigationPour(utilisateur?.role);
  const links = [
    { to: chemins.accueil, label: 'Accueil', icon: Home, end: true },
    { to: chemins.relations, label: 'Relations', icon: Users },
    { to: chemins.chat, label: 'Messages', icon: MessageCircle },
  ];
  return <nav className={`social-topnav ${embedded ? 'social-topnav--embedded' : ''}`} aria-label="Navigation du réseau CampusHub">
    <div className="container social-topnav__inner">
      <NavLink className="social-topnav__brand" to={chemins.accueil}><span><UserRoundPlus /></span><strong>CampusHub Social</strong></NavLink>
      <div className="social-topnav__links">{links.map((item) => <NavLink key={item.to} to={item.to} end={item.end} title={item.label} aria-label={item.label}>
        <item.icon /><span>{item.label}</span>
      </NavLink>)}</div>
    </div>
  </nav>;
}
