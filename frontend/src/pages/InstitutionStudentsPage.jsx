import {
  Ban, ChevronLeft, ChevronRight, Clock3, GraduationCap, PauseCircle,
  RefreshCw, Search, UserCheck, UserMinus, Users, X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useInstitution } from '../context/InstitutionContext.jsx';

const statuts = ['ACTIF', 'SUSPENDU', 'BLOQUE', 'RETIRE'];
const libelles = { ACTIF: 'Actifs', SUSPENDU: 'Suspendus', BLOQUE: 'Bloqués', RETIRE: 'Retirés' };
const decisions = {
  ACTIF: { titre: 'Réactiver cet étudiant', action: 'Réactiver', icon: UserCheck },
  SUSPENDU: { titre: 'Suspendre temporairement', action: 'Suspendre', icon: PauseCircle },
  BLOQUE: { titre: 'Bloquer dans l’établissement', action: 'Bloquer', icon: Ban },
  RETIRE: { titre: 'Retirer de l’établissement', action: 'Retirer', icon: UserMinus },
};

export function InstitutionStudentsPage() {
  const { token } = useAuth();
  const { universite } = useInstitution();
  const isSchool = universite?.categorie_etablissement === 'ECOLE_SECONDAIRE';
  const entity = isSchool ? 'élève' : 'étudiant';
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0, statuts: {} });
  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [decision, setDecision] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page: String(page), limite: '20' });
      if (statut) query.set('statut', statut);
      if (appliedSearch) query.set('recherche', appliedSearch);
      const response = await apiRequest(`/affiliations/universite/etudiants?${query}`, { token });
      setItems(response.donnees || []);
      setMeta(response.meta || { page: 1, pages: 1, total: 0, statuts: {} });
      setError('');
    } catch (err) {
      setItems([]);
      setError(err.message);
    } finally { setLoading(false); }
  }, [token, page, statut, appliedSearch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  const totalInstitution = useMemo(() => Object.values(meta.statuts || {}).reduce((total, value) => total + Number(value || 0), 0), [meta.statuts]);

  function rechercher(event) {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  }

  async function enregistrer(donnees) {
    try {
      const response = await apiRequest(`/affiliations/universite/etudiants/${decision.etudiant.code_utilisateur}/statut`, {
        method: 'PATCH', token, body: donnees,
      });
      setMessage(response.message || `Le statut de ${decision.etudiant.nom_affichage} a été modifié.`);
      setDecision(null);
      await load();
    } catch (err) { setError(err.message); }
  }

  return <div className="institution-students-page">
    <DashboardPageHeader
      title={isSchool ? 'Gestion des élèves' : 'Gestion des étudiants'}
      description={`Contrôlez l’accès institutionnel de vos ${isSchool ? 'élèves' : 'étudiants'} sans supprimer leur compte CampusHub.`}
      actions={<button className="secondary-action" onClick={load}><RefreshCw />Actualiser</button>}
    />
    {message && <div className="alert alert--success"><UserCheck />{message}</div>}
    {error && <div className="alert alert--error">{error}</div>}
    <section className="student-management-summary" aria-label="Résumé des statuts">
      <article><span><Users /></span><div><small>Total dans l’établissement</small><strong>{totalInstitution}</strong></div></article>
      {statuts.map((item) => <article key={item}><span className={`student-summary-icon student-summary-icon--${item.toLowerCase()}`}><StatusIcon status={item} /></span><div><small>{libelles[item]}</small><strong>{meta.statuts?.[item] || 0}</strong></div></article>)}
    </section>
    <section className="app-panel management-panel">
      <div className="management-toolbar institution-students-toolbar">
        <form onSubmit={rechercher}><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Nom, e-mail, code ou matricule…`} /><button type="submit">Rechercher</button></form>
        <select className="compact-select" value={statut} onChange={(event) => { setStatut(event.target.value); setPage(1); }}>
          <option value="">Tous les statuts</option>
          {statuts.map((item) => <option key={item} value={item}>{libelles[item]}</option>)}
        </select>
      </div>
      {loading ? <div className="content-loading"><Spinner />Chargement…</div> : items.length ? <>
        <div className="table-scroll"><table className="data-table institution-students-table"><thead><tr><th>{isSchool ? 'Élève' : 'Étudiant'}</th><th>{isSchool ? 'Option' : 'Filière'}</th><th>Matricule</th><th>Statut</th><th>Dernière décision</th><th>Actions</th></tr></thead><tbody>
          {items.map((item) => <tr key={item.code_utilisateur}><td><div className="table-identity"><span>{item.url_photo_profil ? <img src={item.url_photo_profil} alt="" /> : item.nom_affichage?.slice(0, 2).toUpperCase()}</span><div><strong>{item.nom_affichage}</strong><small>{item.email} • {item.code_utilisateur}</small></div></div></td><td>{item.nom_filiere || 'Non renseignée'}<small className="cell-subtitle">{item.code_filiere || '—'}</small></td><td><strong>{item.matricule_etudiant || '—'}</strong></td><td><StatusBadge status={item.statut_institution} />{item.motif_statut && <small className="cell-subtitle status-reason" title={item.motif_statut}>{item.motif_statut}</small>}</td><td>{formatDate(item.date_statut || item.date_creation)}{item.date_fin_suspension && <small className="cell-subtitle">Fin : {formatDate(item.date_fin_suspension)}</small>}</td><td><div className="table-actions student-table-actions">{statuts.filter((value) => value !== item.statut_institution).map((value) => { const Icon = decisions[value].icon; return <button key={value} className={`table-action student-action--${value.toLowerCase()}`} title={decisions[value].titre} onClick={() => setDecision({ etudiant: item, statut: value })}><Icon /></button>; })}</div></td></tr>)}
        </tbody></table></div>
        {meta.pages > 1 && <nav className="institution-students-pagination" aria-label="Pagination"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft />Précédent</button><span>Page <strong>{meta.page}</strong> sur <strong>{meta.pages}</strong> • {meta.total} résultat(s)</span><button disabled={page >= meta.pages} onClick={() => setPage((value) => value + 1)}>Suivant<ChevronRight /></button></nav>}
      </> : <div className="management-empty"><span><GraduationCap /></span><h3>Aucun {entity}</h3><p>Les affiliations acceptées apparaîtront ici.</p></div>}
    </section>
    {decision && <StudentDecisionModal decision={decision} entity={entity} close={() => setDecision(null)} save={enregistrer} />}
  </div>;
}

function StudentDecisionModal({ decision, entity, close, save }) {
  const [motif, setMotif] = useState('');
  const [dateFinSuspension, setDateFinSuspension] = useState('');
  const [saving, setSaving] = useState(false);
  const config = decisions[decision.statut];
  const Icon = config.icon;
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try { await save({ statut: decision.statut, motif: decision.statut === 'ACTIF' ? null : motif, dateFinSuspension: decision.statut === 'SUSPENDU' && dateFinSuspension ? dateFinSuspension : null }); }
    finally { setSaving(false); }
  }
  return <div className="modal-backdrop" onMouseDown={close}><form className="resource-modal institution-student-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
    <div className="resource-modal__heading"><div><span className="eyebrow">Gestion institutionnelle</span><h2>{config.titre}</h2></div><button type="button" onClick={close} aria-label="Fermer"><X /></button></div>
    <div className="student-decision-identity"><span><Icon /></span><div><strong>{decision.etudiant.nom_affichage}</strong><small>{decision.etudiant.email} • {decision.etudiant.matricule_etudiant || 'Matricule non renseigné'}</small></div></div>
    {decision.statut === 'ACTIF' ? <p className="student-decision-note">Le {entity} retrouvera sa visibilité publique et son affiliation active à votre établissement.</p> : <>
      <label className="editor-field"><span>Motif de la décision *</span><textarea required rows="4" maxLength="1000" value={motif} onChange={(event) => setMotif(event.target.value)} placeholder="Expliquez clairement la raison. Elle sera communiquée à l’étudiant." /></label>
      {decision.statut === 'SUSPENDU' && <label className="editor-field"><span>Fin de suspension <small>Facultatif</small></span><input type="datetime-local" value={dateFinSuspension} onChange={(event) => setDateFinSuspension(event.target.value)} /></label>}
      {decision.statut === 'RETIRE' && <p className="student-decision-note student-decision-note--warning">Le compte CampusHub ne sera pas supprimé. Seule l’affiliation à votre établissement sera retirée.</p>}
    </>}
    <button className={`button button--full student-decision-submit student-decision-submit--${decision.statut.toLowerCase()}`} disabled={saving}>{saving ? <Spinner /> : <><Icon />{config.action}</>}</button>
  </form></div>;
}

function StatusIcon({ status }) {
  if (status === 'ACTIF') return <UserCheck />;
  if (status === 'SUSPENDU') return <Clock3 />;
  if (status === 'BLOQUE') return <Ban />;
  return <UserMinus />;
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
}
