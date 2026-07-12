import { Building2, LogOut, Menu, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { estConnecte, utilisateur, deconnexion } = useAuth();
  const navigate = useNavigate();

  const espace = utilisateur?.role === 'ADMINISTRATEUR' ? '/administration'
    : utilisateur?.role === 'ETUDIANT' ? '/espace-etudiant' : '/espace-universite';

  async function quitter() {
    await deconnexion();
    navigate('/');
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" to="/" aria-label="Accueil CampusHub">
          <span className="brand-mark"><Building2 size={20} strokeWidth={2.4} /></span>
          <span>Campus<span>Hub</span></span>
        </Link>

        <nav className={`main-nav ${menuOpen ? 'main-nav--open' : ''}`} aria-label="Navigation principale">
          <NavLink to="/" end onClick={() => setMenuOpen(false)}>Découvrir</NavLink>
          <NavLink to="/portfolios" onClick={() => setMenuOpen(false)}>Portfolios</NavLink>
          <NavLink to="/actualites" onClick={() => setMenuOpen(false)}>Actualités</NavLink>
          <NavLink to="/universites" onClick={() => setMenuOpen(false)}>Universités</NavLink>
          <NavLink className="nav-mobile-action" to="/partenariat" onClick={() => setMenuOpen(false)}>Devenir partenaire</NavLink>
        </nav>

        <div className="header-actions">
          <button className="icon-button header-search" aria-label="Rechercher" onClick={() => navigate('/#recherche')}>
            <Search size={19} />
          </button>
          {estConnecte ? (
            <>
              <Link className="button button--small" to={espace}>Mon espace</Link>
              <button className="icon-button" aria-label="Se déconnecter" onClick={quitter}><LogOut size={19} /></button>
            </>
          ) : (
            <Link className="button button--small" to="/connexion">Connexion</Link>
          )}
          <button className="menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Ouvrir le menu">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
