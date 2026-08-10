import { ArrowRight, BriefcaseBusiness, CalendarClock, ChevronLeft, ChevronRight, FileText, MapPin, Search, School, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { PageShell } from '../components/PageShell.jsx';
import { Spinner } from '../components/Spinner.jsx';

const typeLabels = { INSCRIPTION: 'Inscription', BOURSE: 'Bourse', FORMATION: 'Formation', STAGE: 'Stage', EMPLOI: 'Emploi', EVENEMENT: 'Événement', AUTRE: 'Autre' };
const targetLabels = { TOUS: 'Tout public', ETUDIANTS: 'Étudiants', ELEVES: 'Élèves', DIPLOMES: 'Diplômés', PARENTS: 'Parents' };

export function OffersPage() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({ recherche: '', type: '', categorie: '', universite: searchParams.get('universite') || '' });
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({ page: String(page), limite: '12' });
        Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
        const response = await apiRequest(`/offres?${query}`);
        setItems(response.donnees || []); setMeta(response.meta || { page: 1, pages: 1, total: 0 }); setError('');
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [filters, page]);

  function change(name, value) { setFilters((current) => ({ ...current, [name]: value })); setPage(1); }

  return <PageShell>
    <section className="offers-hero"><div className="container"><span className="eyebrow">Opportunités CampusHub</span><h1>Des offres utiles, publiées par des établissements vérifiés</h1><p>Admissions, inscriptions scolaires, bourses, formations, stages, emplois et événements réunis au même endroit.</p><div className="offers-hero__proof"><span><School />Écoles et universités vérifiées</span><span><CalendarClock />Dates limites clairement indiquées</span></div></div></section>
    <section className="section offers-directory"><div className="container">
      <div className="offer-filters">
        <label className="offer-search"><Search /><input value={filters.recherche} onChange={(e) => change('recherche', e.target.value)} placeholder="Rechercher une offre ou un établissement…" /></label>
        <select value={filters.type} onChange={(e) => change('type', e.target.value)}><option value="">Tous les types</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select value={filters.categorie} onChange={(e) => change('categorie', e.target.value)}><option value="">Tous les établissements</option><option value="UNIVERSITE">Universités</option><option value="INSTITUT_SUPERIEUR">Instituts supérieurs</option><option value="ECOLE_SECONDAIRE">Écoles secondaires</option></select>
      </div>
      <div className="offers-results-heading"><div><span>{meta.total || 0}</span><p>offre(s) active(s)</p></div><small>Les offres arrivées à expiration sont automatiquement masquées.</small></div>
      {error && <div className="alert alert--error">{error}</div>}
      {loading ? <div className="content-loading"><Spinner />Chargement des offres…</div> : items.length ? <div className="public-offer-grid">{items.map((item) => <OfferCard item={item} key={item.code_offre} />)}</div> : <div className="offers-empty"><BriefcaseBusiness /><h2>Aucune offre ne correspond à ces critères</h2><p>Modifiez les filtres ou revenez prochainement.</p></div>}
      {meta.pages > 1 && <nav className="directory-pagination" aria-label="Pagination des offres"><button disabled={page <= 1} onClick={() => { setPage(page - 1); window.scrollTo({ top: 420, behavior: 'smooth' }); }}><ChevronLeft />Précédent</button><span>Page <strong>{meta.page}</strong> sur <strong>{meta.pages}</strong></span><button disabled={page >= meta.pages} onClick={() => { setPage(page + 1); window.scrollTo({ top: 420, behavior: 'smooth' }); }}>Suivant<ChevronRight /></button></nav>}
    </div></section>
  </PageShell>;
}

function OfferCard({ item }) {
  const school = item.categorie_etablissement === 'ECOLE_SECONDAIRE';
  const image = item.url_image || (school ? '/images/campus-jardin.webp' : '/images/campus-technologie.webp');
  return <article className="public-offer-card">
    <div className="public-offer-card__image"><img src={image} alt="" /><span>{typeLabels[item.type_offre]}</span>{item.url_logo && <img className="public-offer-card__logo" src={item.url_logo} alt="" />}</div>
    <div className="public-offer-card__body"><small>{school ? 'École secondaire' : item.categorie_etablissement === 'INSTITUT_SUPERIEUR' ? 'Institut supérieur' : 'Université'}</small><h2>{item.titre}</h2><Link className="offer-institution" to={`/universites/${item.code_universite}`}>{item.nom_etablissement}</Link><p>{item.description}</p><div className="offer-card-meta"><span><MapPin />{item.ville || item.province || 'RDC'}</span><span><Users />{targetLabels[item.public_cible]}</span><span><CalendarClock />{item.date_limite ? `Jusqu’au ${formatDate(item.date_limite)}` : 'Sans date limite'}</span>{item.url_document && <span><FileText />Document PDF disponible</span>}</div><Link className="offer-card-link" to={`/offres/${item.code_offre}`}>Voir l’offre<ArrowRight /></Link></div>
  </article>;
}

function formatDate(value) { return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR'); }
