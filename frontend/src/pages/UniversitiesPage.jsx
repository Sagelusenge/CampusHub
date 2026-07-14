import { ArrowRight, Building2, GitCompareArrows, GraduationCap, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { PageShell } from '../components/PageShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { UniversityCard } from '../components/UniversityCard.jsx';

const categories = {
  UNIVERSITE: 'Université',
  INSTITUT_SUPERIEUR: 'Institut supérieur',
  ECOLE_SECONDAIRE: 'École secondaire',
};

export function UniversitiesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ search: '', province: '', ville: '', type: '', categorie: '', campus: '' });

  useEffect(() => {
    apiRequest('/universites').then((response) => setItems((response.donnees || []).filter((item) => item.statut_verification === 'VERIFIEE')))
      .catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const provinces = [...new Set(items.map((item) => item.province).filter(Boolean))].sort();
  const villes = [...new Set(items.filter((item) => !filters.province || item.province === filters.province).map((item) => item.ville).filter(Boolean))].sort();
  const campuses = useMemo(() => items.flatMap((item) => (item.campus || []).map((site) => ({ ...site, etablissement: item.nom }))), [items]);
  const visible = useMemo(() => items.filter((item) => {
    const text = `${item.nom} ${item.sigle || ''}`.toLowerCase();
    return (!filters.search || text.includes(filters.search.toLowerCase()))
      && (!filters.province || item.province === filters.province)
      && (!filters.ville || item.ville === filters.ville || item.campus?.some((site) => site.ville === filters.ville))
      && (!filters.type || item.type_universite === filters.type)
      && (!filters.categorie || item.categorie_etablissement === filters.categorie)
      && (!filters.campus || item.campus?.some((site) => site.code_campus === filters.campus));
  }), [items, filters]);

  const update = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value, ...(key === 'province' ? { ville: '' } : {}) }));
  const activeFilters = Object.values(filters).filter(Boolean).length;

  return <PageShell><section className="directory-hero directory-hero--expanded"><div className="container"><span className="eyebrow eyebrow--accent">Annuaire académique vérifié</span><h1>Trouvez votre prochain établissement.</h1><p>Universités, instituts supérieurs et écoles secondaires réunis dans un catalogue fiable.</p>
    <div className="directory-search directory-search--advanced"><label><Search /><input value={filters.search} onChange={update('search')} placeholder="Nom ou sigle…" /></label><select value={filters.categorie} onChange={update('categorie')}><option value="">Tous les établissements</option>{Object.entries(categories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><select value={filters.province} onChange={update('province')}><option value="">Toutes les provinces</option>{provinces.map((value) => <option key={value}>{value}</option>)}</select><select value={filters.ville} onChange={update('ville')}><option value="">Toutes les villes</option>{villes.map((value) => <option key={value}>{value}</option>)}</select><select value={filters.campus} onChange={update('campus')}><option value="">Tous les campus</option>{campuses.map((site) => <option value={site.code_campus} key={site.code_campus}>{site.nom} — {site.etablissement}</option>)}</select><select value={filters.type} onChange={update('type')}><option value="">Public et privé</option><option value="PUBLIQUE">Public</option><option value="PRIVEE">Privé</option></select></div>
  </div></section><section className="section directory-section"><div className="container"><div className="directory-toolbar"><div><SlidersHorizontal /><span><strong>{visible.length}</strong> établissement(s) trouvé(s) {activeFilters > 0 && `• ${activeFilters} filtre(s)`}</span></div><div className="directory-toolbar__actions">{activeFilters > 0 && <button className="secondary-action" onClick={() => setFilters({ search: '', province: '', ville: '', type: '', categorie: '', campus: '' })}>Réinitialiser</button>}<Link className="secondary-action" to="/comparaison"><GitCompareArrows />Comparer</Link></div></div>
    <div className="directory-category-summary"><span><Building2 />Universités</span><span><GraduationCap />Instituts supérieurs</span><span><MapPin />Écoles secondaires</span></div>
    {error && <div className="alert alert--error">{error}</div>}{loading ? <div className="content-loading"><Spinner />Chargement…</div> : visible.length ? <div className="university-grid directory-grid">{visible.map((item, index) => <div key={item.code_universite}><UniversityCard university={item} index={index} /><Link className="card-overlay-link" to={`/universites/${item.code_universite}`}>Voir la fiche <ArrowRight /></Link></div>)}</div> : <div className="management-empty"><Building2 /><h3>Aucun résultat</h3><p>Modifiez la province, le campus ou le type d’établissement.</p></div>}
  </div></section></PageShell>;
}
