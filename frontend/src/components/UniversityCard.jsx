import { ArrowUpRight, BookOpen, MapPin, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge.jsx';

const images = [
  '/images/campus-goma.webp',
  '/images/campus-jardin.webp',
  '/images/campus-technologie.webp',
];

export function UniversityCard({ university, index = 0 }) {
  const category = { UNIVERSITE: 'Université', INSTITUT_SUPERIEUR: 'Institut supérieur', ECOLE_SECONDAIRE: 'École secondaire' }[university.categorie_etablissement] || 'Université';
  const publicType = university.type_universite === 'PUBLIQUE'
    ? (university.categorie_etablissement === 'ECOLE_SECONDAIRE' ? 'publique' : 'public')
    : (university.categorie_etablissement === 'ECOLE_SECONDAIRE' ? 'privée' : 'privé');
  return (
    <article className="university-card">
      <div className="university-card__image">
        <img src={university.url_couverture || images[index % images.length]} alt={`Campus de ${university.nom}`} />
        <div className="official-badge"><ShieldCheck size={15} /> Institution vérifiée</div>
      </div>
      <div className="university-card__body">
        <div className="university-card__title">
          <div>
            <span className="eyebrow">{category} {publicType}</span>
            <h3>{university.nom}</h3>
          </div>
          <StatusBadge status={university.statut_verification} />
        </div>
        <p className="location"><MapPin size={16} /> {university.ville}, {university.province}</p>
        <div className="university-card__stats">
          <span><BookOpen size={16} /> {university.nombre_filieres || 0} filières</span>
          <span><Users size={16} /> {university.nombre_etudiants || 0} étudiants</span>
        </div>
        <Link className="button button--outline button--full" to={`/universites/${university.code_universite}`}>Voir la fiche <ArrowUpRight size={17} /></Link>
      </div>
    </article>
  );
}
