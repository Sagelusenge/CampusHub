import { Menu, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { AccountMenu } from './AccountMenu.jsx';
import { LanguageSelector } from './LanguageSelector.jsx';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { estConnecte, utilisateur } = useAuth();
  const navigate = useNavigate();
  const espace = utilisateur?.role === 'ADMINISTRATEUR' ? '/administration'
    : utilisateur?.role === 'ETUDIANT' ? '/espace-etudiant'
      : utilisateur?.role === 'UNIVERSITE' ? '/espace-universite' : '/reseau';
  return <header className="site-header"><div className="container header-inner">
    <Link className="brand" to="/" aria-label="Accueil CampusHub"><span className="brand-mark brand-mark--logo"><img src="/favicon.svg" alt="" /></span><span>Campus<span>Hub</span></span></Link>
    <nav className={`main-nav ${menuOpen ? 'main-nav--open' : ''}`} aria-label="Navigation principale">
      <NavLink to="/" end onClick={() => setMenuOpen(false)}>Accueil</NavLink><NavLink to="/universites" onClick={() => setMenuOpen(false)}>Établissements</NavLink><NavLink to="/offres" onClick={() => setMenuOpen(false)}>Offres</NavLink><NavLink to="/orientation" onClick={() => setMenuOpen(false)}>CampusHub AI</NavLink><NavLink to="/reseau" onClick={() => setMenuOpen(false)}>Réseau</NavLink><NavLink to="/faq" onClick={() => setMenuOpen(false)}>FAQ</NavLink><NavLink to="/contact" onClick={() => setMenuOpen(false)}>Contact</NavLink>
      {!estConnecte && <NavLink className="nav-mobile-action" to="/inscription-visiteur" onClick={() => setMenuOpen(false)}>Créer un compte</NavLink>}
    </nav>
    <div className="header-actions"><LanguageSelector compact /><button className="icon-button header-search" aria-label="Rechercher" onClick={() => navigate('/reseau')}><Search size={19} /></button>
      {estConnecte ? <><Link className="button button--small" to={espace}>{utilisateur?.role === 'VISITEUR' ? 'Mon réseau' : 'Mon espace'}</Link><AccountMenu variant="header" /></> : <><Link className="header-signup" to="/inscription-visiteur">Créer un compte</Link><Link className="button button--small" to="/connexion">Connexion</Link></>}
      <button className="menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Ouvrir le menu">{menuOpen ? <X /> : <Menu />}</button>
    </div>
  </div></header>;
}
