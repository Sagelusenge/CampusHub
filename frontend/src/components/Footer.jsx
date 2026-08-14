import { Building2, ExternalLink, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link className="brand brand--footer" to="/">
            <span className="brand-mark"><Building2 size={19} /></span>
            <span>Campus<span>Hub</span></span>
          </Link>
          <p>Le point de rencontre entre les établissements vérifiés et les talents de demain.</p>
          <div className="footer-contact"><MapPin size={16} /> Goma, République démocratique du Congo</div>
        </div>
        <div>
          <h3>Explorer</h3>
          <Link to="/universites">Établissements</Link>
          <Link to="/offres">Offres et opportunités</Link>
          <Link to="/reseau">Réseau CampusHub</Link>
          <Link to="/partenariat">Partenariat universitaire</Link>
        </div>
        <div>
          <h3>CampusHub</h3>
          <Link to="/contact"><Mail size={15} /> Contacter l’administration</Link>
          <a href="https://portfolio-sagelusenge.onrender.com/" target="_blank" rel="noreferrer">À propos du développeur <ExternalLink size={14} /></a>
          <span>Processus de vérification</span>
          <span>Confidentialité</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 CampusHub.</span>
        <span>Éducation • Transparence • Innovation</span>
      </div>
    </footer>
  );
}
