import { ArrowUpRight, BookOpen, MapPin, ShieldCheck, Users } from 'lucide-react';
import { StatusBadge } from './StatusBadge.jsx';

const images = [
  'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=82',
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=900&q=82',
];

export function UniversityCard({ university, index = 0 }) {
  return (
    <article className="university-card">
      <div className="university-card__image">
        <img src={university.url_couverture || images[index % images.length]} alt={`Campus de ${university.nom}`} />
        <div className="official-badge"><ShieldCheck size={15} /> Institution vérifiée</div>
      </div>
      <div className="university-card__body">
        <div className="university-card__title">
          <div>
            <span className="eyebrow">{university.type_universite === 'PUBLIQUE' ? 'Université publique' : 'Université privée'}</span>
            <h3>{university.nom}</h3>
          </div>
          <StatusBadge status={university.statut_verification} />
        </div>
        <p className="location"><MapPin size={16} /> {university.ville}, {university.province}</p>
        <div className="university-card__stats">
          <span><BookOpen size={16} /> {university.nombre_filieres || 0} filières</span>
          <span><Users size={16} /> {university.nombre_etudiants || 0} étudiants</span>
        </div>
        <button className="button button--outline button--full">Explorer le campus <ArrowUpRight size={17} /></button>
      </div>
    </article>
  );
}
