import { ArrowLeft, BookOpen, Building2, Check, GitCompareArrows, GraduationCap, MapPin, Plus, School, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { PageShell } from '../components/PageShell.jsx';
import { Spinner } from '../components/Spinner.jsx';

const groups = {
  UNIVERSITES: { label: 'Universités et instituts', singular: 'Établissement supérieur', branch: 'Filière ou domaine', programs: 'Filières', members: 'Étudiants', icon: Building2 },
  ECOLES: { label: 'Écoles secondaires', singular: 'École secondaire', branch: 'Option ou branche', programs: 'Options', members: 'Élèves', icon: School },
};

const isInGroup = (item, group) => group === 'ECOLES'
  ? item.categorie_etablissement === 'ECOLE_SECONDAIRE'
  : item.categorie_etablissement !== 'ECOLE_SECONDAIRE';
const branchName = (program) => program.domaine || program.nom_filiere;
const programsFor = (item, branch) => (item.filieres || []).filter((program) => !branch || branchName(program) === branch);

export function ComparePage() {
  const [all, setAll] = useState([]);
  const [details, setDetails] = useState([]);
  const [group, setGroup] = useState('UNIVERSITES');
  const [branch, setBranch] = useState('');
  const [codes, setCodes] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');

  async function loadGroup(nextGroup, catalogue = all) {
    setLoading(true); setError('');
    try {
      const selection = catalogue.filter((item) => isInGroup(item, nextGroup));
      const loaded = await Promise.all(selection.map((item) => apiRequest(`/universites/${item.code_universite}`).then((response) => response.donnees)));
      setDetails(loaded);
      setCodes(loaded.slice(0, Math.min(3, loaded.length)).map((item) => item.code_universite));
    } catch (err) { setError(err.message); setDetails([]); setCodes([]); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    apiRequest('/universites').then(async (response) => {
      const catalogue = (response.donnees || []).filter((item) => item.statut_verification === 'VERIFIEE');
      setAll(catalogue);
      await loadGroup('UNIVERSITES', catalogue);
    }).catch((err) => { setError(err.message); setLoading(false); });
    // Le premier chargement doit rester unique.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const branches = useMemo(() => [...new Set(details.flatMap((item) =>
    (item.filieres || []).map(branchName).filter(Boolean)))].sort((a, b) => a.localeCompare(b, 'fr')), [details]);
  const eligible = useMemo(() => details.filter((item) => programsFor(item, branch).length > 0 || !branch), [details, branch]);

  useEffect(() => {
    if (codes.length < 2) return undefined;
    let active = true;
    Promise.resolve().then(async () => {
      if (!active) return;
      setComparing(true); setError('');
      try {
        const response = await apiRequest(`/universites/comparer?codes=${codes.join(',')}`);
        if (active) setData((response.donnees || []).map((item) => ({
          ...item,
          ...details.find((detail) => detail.code_universite === item.code_universite),
        })));
      } catch (err) {
        if (active) { setError(err.message); setData([]); }
      } finally {
        if (active) setComparing(false);
      }
    });
    return () => { active = false; };
  }, [codes, details]);

  async function chooseGroup(nextGroup) {
    if (nextGroup === group) return;
    setGroup(nextGroup); setBranch(''); setData([]);
    await loadGroup(nextGroup);
  }
  function chooseBranch(value) {
    setBranch(value);
    const available = details.filter((item) => programsFor(item, value).length > 0 || !value);
    setCodes(available.slice(0, Math.min(3, available.length)).map((item) => item.code_universite));
  }
  function change(index, value) { setCodes((current) => current.map((code, position) => position === index ? value : code)); }
  function add() {
    const next = eligible.find((item) => !codes.includes(item.code_universite));
    if (next) setCodes((current) => [...current, next.code_universite]);
  }

  const config = groups[group];
  return <PageShell><section className="compare-page"><div className="container">
    <Link className="back-link-public" to="/universites"><ArrowLeft />Annuaire des établissements</Link>
    <div className="public-page-heading"><span className="eyebrow eyebrow--accent">Outil d’orientation</span><h1>Comparez des établissements équivalents.</h1><p>Choisissez d’abord le niveau d’enseignement, puis la branche qui vous intéresse.</p></div>
    <div className="compare-scope app-panel">
      <div className="compare-kind-tabs" role="group" aria-label="Type d’établissement à comparer">
        {Object.entries(groups).map(([value, item]) => <button type="button" className={group === value ? 'active' : ''} onClick={() => chooseGroup(value)} key={value}><item.icon /><span><strong>{item.label}</strong><small>{value === 'ECOLES' ? 'Comparer uniquement les écoles' : 'Universités et instituts supérieurs'}</small></span>{group === value && <Check />}</button>)}
      </div>
      <label className="compare-branch"><span>{config.branch}</span><select value={branch} onChange={(event) => chooseBranch(event.target.value)}><option value="">Toutes les {group === 'ECOLES' ? 'options' : 'filières'}</option>{branches.map((value) => <option key={value} value={value}>{value}</option>)}</select><small>Seuls les établissements proposant ce choix seront affichés.</small></label>
    </div>
    {error && <div className="alert alert--error">{error}</div>}
    {loading ? <div className="content-loading"><Spinner />Chargement des établissements compatibles…</div> : <>
      <div className="compare-selectors">{codes.map((code, index) => <label key={`${group}-${index}`}><span>{config.singular} {index + 1}</span><select value={code} onChange={(event) => change(index, event.target.value)}>{eligible.map((item) => <option key={item.code_universite} value={item.code_universite} disabled={codes.includes(item.code_universite) && item.code_universite !== code}>{item.nom}</option>)}</select>{codes.length > 2 && <button type="button" aria-label="Retirer cet établissement" onClick={() => setCodes((current) => current.filter((_, position) => position !== index))}><X /></button>}</label>)}{codes.length < 3 && eligible.length > codes.length && <button type="button" className="add-compare" onClick={add}><Plus />Ajouter</button>}</div>
      {eligible.length < 2 ? <div className="management-empty app-panel"><GitCompareArrows /><h3>Pas assez d’établissements pour cette branche</h3><p>Choisissez une autre branche ou affichez toutes les formations.</p></div> : comparing ? <div className="content-loading"><Spinner />Comparaison…</div> : codes.length >= 2 && data.length >= 2 ? <ComparisonTable data={data} branch={branch} group={group} /> : <div className="management-empty app-panel"><GitCompareArrows /><h3>Choisissez au moins deux établissements</h3></div>}
    </>}
  </div></section></PageShell>;
}

function ComparisonTable({ data, branch, group }) {
  const config = groups[group];
  const fees = (item) => {
    const programs = programsFor(item, branch);
    const minimums = programs.map((program) => Number(program.frais_minimum)).filter(Number.isFinite);
    const maximums = programs.map((program) => Number(program.frais_maximum)).filter(Number.isFinite);
    if (!minimums.length && !maximums.length) return 'Non renseignés';
    return `${minimums.length ? Math.min(...minimums) : 0} – ${maximums.length ? Math.max(...maximums) : 0} USD`;
  };
  const rows = [
    ['Catégorie', (item) => item.categorie_etablissement === 'ECOLE_SECONDAIRE' ? 'École secondaire' : item.categorie_etablissement === 'INSTITUT_SUPERIEUR' ? 'Institut supérieur' : 'Université', group === 'ECOLES' ? School : Building2],
    ['Statut', (item) => item.type_universite === 'PUBLIQUE' ? 'Public' : 'Privé', Building2],
    ['Localisation', (item) => `${item.ville}, ${item.province}`, MapPin],
    [config.programs, (item) => branch ? programsFor(item, branch).map((program) => program.nom_filiere).join(', ') || 'Non proposée' : item.nombre_filieres || programsFor(item, '').length, GraduationCap],
    ['Frais annuels', fees, BookOpen],
    [config.members, (item) => item.nombre_etudiants || 0, Users],
    ['Inscriptions', (item) => item.inscriptions_ouvertes ? 'Ouvertes' : 'Fermées', Check],
  ];
  return <div className="comparison-table"><div className="comparison-row comparison-row--head"><div>Critères</div>{data.map((item) => <div key={item.code_universite}><span><config.icon /></span><strong>{item.sigle || item.nom}</strong><small>{item.nom}</small>{branch && <em>{branch}</em>}<Link to={`/universites/${item.code_universite}`}>Voir la fiche</Link></div>)}</div>{rows.map(([label, get, Icon]) => <div className="comparison-row" key={label}><div><Icon />{label}</div>{data.map((item) => <div key={item.code_universite}><strong>{get(item)}</strong></div>)}</div>)}</div>;
}
