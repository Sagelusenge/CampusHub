import { ChevronDown, LifeBuoy, LogOut, Settings, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const routes = {
  ADMINISTRATEUR: { settings: '/administration/parametres', space: '/administration', role: 'Administrateur' },
  ETUDIANT: { settings: '/espace-etudiant/parametres', space: '/espace-etudiant', role: 'Étudiant' },
  UNIVERSITE: { settings: '/espace-universite/parametres', space: '/espace-universite', role: 'Gestionnaire' },
  VISITEUR: { settings: '/parametres', space: '/reseau', role: 'Visiteur' },
};

export function AccountMenu({ variant = 'topbar', roleLabel }) {
  const { utilisateur, deconnexion } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const navigate = useNavigate();
  const config = routes[utilisateur?.role] || routes.VISITEUR;
  const displayName = utilisateur?.nom_affichage || utilisateur?.nomAffichage || 'Utilisateur CampusHub';
  const initials = displayName.split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    function close(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function escape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  async function quitter() {
    setOpen(false);
    await deconnexion();
    navigate('/connexion');
  }

  return (
    <div className={`account-menu account-menu--${variant}`} ref={rootRef}>
      <button type="button" className={variant === 'header' ? 'header-profile-trigger' : 'topbar-profile'} onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open}>
        {variant === 'topbar' && <div><strong>{displayName}</strong><small>{roleLabel || config.role}</small></div>}
        <span className="account-avatar">{utilisateur?.url_photo_profil ? <img src={utilisateur.url_photo_profil} alt={`Photo de ${displayName}`} /> : initials || <UserRound />}</span>
        <ChevronDown className="account-menu__chevron" />
      </button>
      {open && <div className="account-menu__dropdown" role="menu">
        <div className="account-menu__identity">
          <span className="account-avatar">{utilisateur?.url_photo_profil ? <img src={utilisateur.url_photo_profil} alt="" /> : initials}</span>
          <div><strong>{displayName}</strong><small>{utilisateur?.email || config.role}</small></div>
        </div>
        <Link to={config.settings} role="menuitem" onClick={() => setOpen(false)}><Settings /><span>Paramètres</span></Link>
        <Link to="/faq" role="menuitem" onClick={() => setOpen(false)}><LifeBuoy /><span>Support</span></Link>
        <button type="button" className="account-menu__logout" role="menuitem" onClick={quitter}><LogOut /><span>Déconnexion</span></button>
      </div>}
    </div>
  );
}
