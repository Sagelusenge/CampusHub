import {
  Building2, ChevronLeft, ChevronRight, GitCompareArrows,
  GraduationCap, MapPin, Search, SlidersHorizontal,
} from 'lucide-react';
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

const filtresInitiaux = { search: '', province: '', ville: '', type: '', categorie: '', campus: '' };
const paginationInitiale = {
  page: 1, total: 0, totalPages: 1, aPagePrecedente: false, aPageSuivante: false,
};

export function UniversitiesPage() {
  const [items, setItems] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(filtresInitiaux);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(paginationInitiale);

  useEffect(() => {
    apiRequest('/universites')
      .then((response) => setCatalogue((response.donnees || []).filter((item) => item.statut_verification === 'VERIFIEE')))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const delai = setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), limite: '10', statut: 'VERIFIEE' });
      if (filters.search) params.set('recherche', filters.search);
      if (filters.province) params.set('province', filters.province);
      if (filters.ville) params.set('ville', filters.ville);
      if (filters.type) params.set('type', filters.type);
      if (filters.categorie) params.set('categorie', filters.categorie);
      if (filters.campus) params.set('campus', filters.campus);

      setLoading(true);
      setError('');
      apiRequest(`/universites?${params}`)
        .then((response) => {
          setItems((response.donnees || []).filter((item) => item.statut_verification === 'VERIFIEE'));
          setPagination(response.meta || paginationInitiale);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, filters.search ? 250 : 0);

    return () => clearTimeout(delai);
  }, [filters, page]);

  const provinces = [...new Set(catalogue.map((item) => item.province).filter(Boolean))].sort();
  const villes = [...new Set(catalogue
    .filter((item) => !filters.province || item.province === filters.province)
    .flatMap((item) => [item.ville, ...(item.campus || []).map((site) => site.ville)])
    .filter(Boolean))].sort();
  const campuses = useMemo(() => catalogue
    .filter((item) => !filters.province || item.province === filters.province)
    .flatMap((item) => (item.campus || []).map((site) => ({ ...site, etablissement: item.nom }))), [catalogue, filters.province]);

  const update = (key) => (event) => {
    setPage(1);
    setFilters((current) => ({
      ...current,
      [key]: event.target.value,
      ...(key === 'province' ? { ville: '', campus: '' } : {}),
    }));
  };
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const changerPage = (nouvellePage) => {
    setPage(nouvellePage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <PageShell>
    <section className="directory-hero directory-hero--expanded"><div className="container">
      <span className="eyebrow eyebrow--accent">Annuaire académique vérifié</span>
      <h1>Trouvez votre prochain établissement.</h1>
      <p>Universités, instituts supérieurs et écoles secondaires réunis dans un catalogue fiable.</p>
      <div className="directory-search directory-search--advanced">
        <label><Search /><input value={filters.search} onChange={update('search')} placeholder="Nom ou sigle…" /></label>
        <select value={filters.categorie} onChange={update('categorie')}><option value="">Tous les établissements</option>{Object.entries(categories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
        <select value={filters.province} onChange={update('province')}><option value="">Toutes les provinces</option>{provinces.map((value) => <option key={value}>{value}</option>)}</select>
        <select value={filters.ville} onChange={update('ville')}><option value="">Toutes les villes</option>{villes.map((value) => <option key={value}>{value}</option>)}</select>
        <select value={filters.campus} onChange={update('campus')}><option value="">Tous les campus</option>{campuses.map((site) => <option value={site.code_campus} key={site.code_campus}>{site.nom} — {site.etablissement}</option>)}</select>
        <select value={filters.type} onChange={update('type')}><option value="">Public et privé</option><option value="PUBLIQUE">Public</option><option value="PRIVEE">Privé</option></select>
      </div>
    </div></section>
    <section className="section directory-section"><div className="container">
      <div className="directory-toolbar"><div><SlidersHorizontal /><span><strong>{pagination.total}</strong> établissement(s) trouvé(s) {activeFilters > 0 && `• ${activeFilters} filtre(s)`}</span></div><div className="directory-toolbar__actions">
        {activeFilters > 0 && <button className="secondary-action" onClick={() => { setPage(1); setFilters(filtresInitiaux); }}>Réinitialiser</button>}
        <Link className="secondary-action" to="/comparaison"><GitCompareArrows />Comparer</Link>
      </div></div>
      <div className="directory-category-summary"><span><Building2 />Universités</span><span><GraduationCap />Instituts supérieurs</span><span><MapPin />Écoles secondaires</span></div>
      {error && <div className="alert alert--error">{error}</div>}
      {loading ? <div className="content-loading"><Spinner />Chargement…</div> : items.length ? <>
        <div className="university-grid directory-grid">{items.map((item, index) => <div key={item.code_universite}><UniversityCard university={item} index={(page - 1) * 10 + index} /></div>)}</div>
        <nav className="directory-pagination" aria-label="Pagination des établissements">
          <button type="button" disabled={!pagination.aPagePrecedente} onClick={() => changerPage(page - 1)}><ChevronLeft />Précédent</button>
          <span>Page <strong>{pagination.page}</strong> sur <strong>{pagination.totalPages}</strong></span>
          <button type="button" disabled={!pagination.aPageSuivante} onClick={() => changerPage(page + 1)}>Suivant<ChevronRight /></button>
        </nav>
      </> : <div className="management-empty"><Building2 /><h3>Aucun résultat</h3><p>Modifiez la province, le campus ou le type d’établissement.</p></div>}
    </div></section>
  </PageShell>;
}
