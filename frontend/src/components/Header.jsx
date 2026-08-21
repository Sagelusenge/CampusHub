import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { AccountMenu } from './AccountMenu.jsx';
import { LanguageSelector } from './LanguageSelector.jsx';

const headerLabels = {
  fr: { home: 'Accueil', institutions: 'Établissements', offers: 'Offres', network: 'Réseau', contact: 'Contact', access: 'Connexion / Inscription', myNetwork: 'Mon réseau', mySpace: 'Mon espace', search: 'Rechercher', menu: 'Ouvrir le menu' },
  en: { home: 'Home', institutions: 'Institutions', offers: 'Offers', network: 'Network', contact: 'Contact', access: 'Sign in / Sign up', myNetwork: 'My network', mySpace: 'My space', search: 'Search', menu: 'Open menu' },
  es: { home: 'Inicio', institutions: 'Instituciones', offers: 'Ofertas', network: 'Red', contact: 'Contacto', access: 'Acceso / Registro', myNetwork: 'Mi red', mySpace: 'Mi espacio', search: 'Buscar', menu: 'Abrir menú' },
};

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { estConnecte, utilisateur } = useAuth();
  const language = globalThis.localStorage?.getItem('campushub-language') || 'fr';
  const labels = headerLabels[language] || headerLabels.fr;
  const espace = utilisateur?.role === 'ADMINISTRATEUR' ? '/administration'
    : utilisateur?.role === 'ETUDIANT' ? '/espace-etudiant'
      : utilisateur?.role === 'UNIVERSITE' ? '/espace-universite' : '/reseau';
  return <header className="site-header notranslate" translate="no"><div className="container header-inner">
    <Link className="brand" to="/" aria-label="Accueil CampusHub"><span className="brand-mark brand-mark--logo"><img src="/favicon.svg" alt="" /></span><span>Campus<span>Hub</span></span></Link>
    <nav className={`main-nav ${menuOpen ? 'main-nav--open' : ''}`} aria-label="Navigation principale">
      <NavLink to="/" end onClick={() => setMenuOpen(false)}>{labels.home}</NavLink><NavLink to="/universites" onClick={() => setMenuOpen(false)}>{labels.institutions}</NavLink><NavLink to="/offres" onClick={() => setMenuOpen(false)}>{labels.offers}</NavLink><NavLink to="/reseau" onClick={() => setMenuOpen(false)}>{labels.network}</NavLink><NavLink to="/faq" onClick={() => setMenuOpen(false)}>FAQ</NavLink><NavLink to="/contact" onClick={() => setMenuOpen(false)}>{labels.contact}</NavLink>
      {!estConnecte && <NavLink className="nav-mobile-action nav-mobile-action--login" to="/connexion" onClick={() => setMenuOpen(false)}>{labels.access}</NavLink>}
    </nav>
    <div className="header-actions"><LanguageSelector compact />
      {estConnecte ? <><Link className="button button--small" to={espace}>{utilisateur?.role === 'VISITEUR' ? labels.myNetwork : labels.mySpace}</Link><AccountMenu variant="header" /></> : <Link className="button button--small" to="/connexion">{labels.access}</Link>}
      <button className="menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label={labels.menu}>{menuOpen ? <X /> : <Menu />}</button>
    </div>
  </div></header>;
}
