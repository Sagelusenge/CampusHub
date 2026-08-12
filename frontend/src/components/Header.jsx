import { Menu, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { AccountMenu } from './AccountMenu.jsx';
import { LanguageSelector } from './LanguageSelector.jsx';

const headerLabels = {
  fr: { home: 'Accueil', institutions: 'Établissements', offers: 'Offres', network: 'Réseau', contact: 'Contact', signup: 'Créer un compte', login: 'Connexion', myNetwork: 'Mon réseau', mySpace: 'Mon espace', search: 'Rechercher', menu: 'Ouvrir le menu' },
  en: { home: 'Home', institutions: 'Institutions', offers: 'Offers', network: 'Network', contact: 'Contact', signup: 'Create account', login: 'Sign in', myNetwork: 'My network', mySpace: 'My space', search: 'Search', menu: 'Open menu' },
  es: { home: 'Inicio', institutions: 'Instituciones', offers: 'Ofertas', network: 'Red', contact: 'Contacto', signup: 'Crear una cuenta', login: 'Iniciar sesión', myNetwork: 'Mi red', mySpace: 'Mi espacio', search: 'Buscar', menu: 'Abrir menú' },
};

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { estConnecte, utilisateur } = useAuth();
  const language = globalThis.localStorage?.getItem('campushub-language') || 'fr';
  const labels = headerLabels[language] || headerLabels.fr;
  const navigate = useNavigate();
  const espace = utilisateur?.role === 'ADMINISTRATEUR' ? '/administration'
    : utilisateur?.role === 'ETUDIANT' ? '/espace-etudiant'
      : utilisateur?.role === 'UNIVERSITE' ? '/espace-universite' : '/reseau';
  return <header className="site-header notranslate" translate="no"><div className="container header-inner">
    <Link className="brand" to="/" aria-label="Accueil CampusHub"><span className="brand-mark brand-mark--logo"><img src="/favicon.svg" alt="" /></span><span>Campus<span>Hub</span></span></Link>
    <nav className={`main-nav ${menuOpen ? 'main-nav--open' : ''}`} aria-label="Navigation principale">
      <NavLink to="/" end onClick={() => setMenuOpen(false)}>{labels.home}</NavLink><NavLink to="/universites" onClick={() => setMenuOpen(false)}>{labels.institutions}</NavLink><NavLink to="/offres" onClick={() => setMenuOpen(false)}>{labels.offers}</NavLink><NavLink to="/orientation" onClick={() => setMenuOpen(false)}>CampusHubIA</NavLink><NavLink to="/reseau" onClick={() => setMenuOpen(false)}>{labels.network}</NavLink><NavLink to="/faq" onClick={() => setMenuOpen(false)}>FAQ</NavLink><NavLink to="/contact" onClick={() => setMenuOpen(false)}>{labels.contact}</NavLink>
      {!estConnecte && <NavLink className="nav-mobile-action" to="/inscription-visiteur" onClick={() => setMenuOpen(false)}>{labels.signup}</NavLink>}
    </nav>
    <div className="header-actions"><LanguageSelector compact /><button className="icon-button header-search" aria-label={labels.search} onClick={() => navigate('/reseau')}><Search size={19} /></button>
      {estConnecte ? <><Link className="button button--small" to={espace}>{utilisateur?.role === 'VISITEUR' ? labels.myNetwork : labels.mySpace}</Link><AccountMenu variant="header" /></> : <><Link className="header-signup" to="/inscription-visiteur">{labels.signup}</Link><Link className="button button--small" to="/connexion">{labels.login}</Link></>}
      <button className="menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label={labels.menu}>{menuOpen ? <X /> : <Menu />}</button>
    </div>
  </div></header>;
}
