import { Building2, LogOut, Menu, Search, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { estConnecte, utilisateur, deconnexion } = useAuth();
  const navigate = useNavigate();
  const espace = utilisateur?.role === 'ADMINISTRATEUR' ? '/administration'
    : utilisateur?.role === 'ETUDIANT' ? '/espace-etudiant'
      : utilisateur?.role === 'UNIVERSITE' ? '/espace-universite' : '/reseau';
  const parametres = utilisateur?.role === 'ADMINISTRATEUR' ? '/administration/parametres'
    : utilisateur?.role === 'ETUDIANT' ? '/espace-etudiant/parametres'
      : utilisateur?.role === 'UNIVERSITE' ? '/espace-universite/parametres' : '/parametres';
  async function quitter() { await deconnexion(); navigate('/'); }
  return <header className="site-header"><div className="container header-inner">
    <Link className="brand" to="/" aria-label="Accueil CampusHub"><span className="brand-mark"><Building2 size={20} strokeWidth={2.4} /></span><span>Campus<span>Hub</span></span></Link>
    <nav className={`main-nav ${menuOpen ? 'main-nav--open' : ''}`} aria-label="Navigation principale">
      <NavLink to="/" end onClick={() => setMenuOpen(false)}>Accueil</NavLink><NavLink to="/universites" onClick={() => setMenuOpen(false)}>Établissements</NavLink><NavLink to="/reseau" onClick={() => setMenuOpen(false)}>Réseau</NavLink><NavLink to="/contact" onClick={() => setMenuOpen(false)}>Contact</NavLink>
      {!estConnecte && <NavLink className="nav-mobile-action" to="/inscription-visiteur" onClick={() => setMenuOpen(false)}>Créer un compte</NavLink>}
    </nav>
    <div className="header-actions"><button className="icon-button header-search" aria-label="Rechercher" onClick={() => navigate('/reseau')}><Search size={19} /></button>
      {estConnecte ? <><Link className="button button--small" to={espace}>{utilisateur?.role === 'VISITEUR' ? 'Mon réseau' : 'Mon espace'}</Link><Link className="header-profile-photo" to={parametres} aria-label="Modifier mon profil">{utilisateur?.url_photo_profil ? <img src={utilisateur.url_photo_profil} alt="Ma photo de profil" /> : <UserRound size={18} />}</Link><button className="icon-button" aria-label="Se déconnecter" onClick={quitter}><LogOut size={19} /></button></> : <><Link className="header-signup" to="/inscription-visiteur">Créer un compte</Link><Link className="button button--small" to="/connexion">Connexion</Link></>}
      <button className="menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Ouvrir le menu">{menuOpen ? <X /> : <Menu />}</button>
    </div>
  </div></header>;
}
