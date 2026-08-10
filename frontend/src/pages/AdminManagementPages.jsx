import { Building2, Check, Eye, FileClock, RefreshCw, Search, ShieldAlert, UserRoundCheck, Users, X } from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { ListPagination } from '../components/ListPagination.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function useRemoteList(loader) {
  const [state, setState] = useState({ loading: true, data: [], error: '' });
  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try { setState({ loading: false, data: await loader(), error: '' }); }
    catch (err) { setState({ loading: false, data: [], error: err.message }); }
  }, [loader]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);
  return { ...state, refresh, setState };
}

export function AdminRequestsPage() {
  const { token } = useAuth();
  const loader = useCallback(async () => (await apiRequest('/utilisateurs?role=UNIVERSITE&statut=EN_ATTENTE&page=1&limite=50', { token })).donnees || [], [token]);
  const list = useRemoteList(loader);
  const [processing, setProcessing] = useState('');
  const [message, setMessage] = useState('');

  async function traiter(item, accepted) {
    setProcessing(item.code_utilisateur);
    try {
      await apiRequest(`/utilisateurs/${item.code_utilisateur}/statut`, { method: 'PATCH', token, body: accepted ? { statutCompte: 'ACTIF', statutVerification: 'VERIFIE' } : { statutCompte: 'SUSPENDU', statutVerification: 'REJETE' } });
      list.setState((current) => ({ ...current, data: current.data.filter((row) => row.code_utilisateur !== item.code_utilisateur) }));
      setMessage(accepted ? 'Le compte a été validé et peut maintenant se connecter.' : 'La demande a été rejetée.');
    } finally { setProcessing(''); }
  }

  return <ManagementPage title="Demandes institutionnelles" description="Validez l’identité d’un établissement avant de lui donner accès." icon={UserRoundCheck} list={list} message={message} columns={['Établissement', 'Localisation', 'Date', 'Statut', 'Actions']} renderRow={(item) => <tr key={item.code_utilisateur}><td><Identity title={item.nom_affichage} subtitle={item.email} /></td><td>{item.ville || '—'}, {item.province || '—'}</td><td>{formatDate(item.date_creation)}</td><td><StatusBadge status={item.statut_compte} /></td><td><div className="table-actions"><button className="table-action table-action--success" disabled={processing === item.code_utilisateur} onClick={() => traiter(item, true)}>{processing === item.code_utilisateur ? <Spinner /> : <Check />}</button><button className="table-action table-action--danger" disabled={processing === item.code_utilisateur} onClick={() => traiter(item, false)}><X /></button></div></td></tr>} />;
}

export function AdminUniversitiesPage() {
  const { token } = useAuth();
  const loader = useCallback(async () => (await apiRequest('/universites')).donnees || [], []);
  const list = useRemoteList(loader);
  const [filter, setFilter] = useState('TOUTES');
  const [processing, setProcessing] = useState('');
  const [message, setMessage] = useState('');
  const visible = useMemo(() => filter === 'TOUTES' ? list.data : list.data.filter((row) => row.statut_verification === filter), [list.data, filter]);
  const categoryLabel = (item) => ({ UNIVERSITE: 'Université', INSTITUT_SUPERIEUR: 'Institut supérieur', ECOLE_SECONDAIRE: 'École secondaire' }[item.categorie_etablissement] || 'Université');

  async function verifier(item, accepted) {
    setProcessing(item.code_universite);
    try {
      const status = accepted ? 'VERIFIEE' : 'REJETEE';
      await apiRequest(`/administration/universites/${item.code_universite}/verification`, { method: 'PATCH', token, body: { statut: status } });
      list.setState((current) => ({ ...current, data: current.data.map((row) => row.code_universite === item.code_universite ? { ...row, statut_verification: status } : row) }));
      setMessage(accepted ? `${item.nom} est maintenant publié dans l’annuaire.` : `${item.nom} a été renvoyé pour correction.`);
    } finally { setProcessing(''); }
  }

  return <ManagementPage title="Établissements" description="Contrôlez les fiches avant leur publication dans l’annuaire." icon={Building2} list={{ ...list, data: visible }} message={message} extra={<div className="filter-tabs">{['TOUTES','EN_ATTENTE','VERIFIEE','REJETEE'].map((item) => <button className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item.replace('_',' ')}</button>)}</div>} columns={['Établissement', 'Catégorie', 'Localisation', 'Filières', 'Statut', 'Actions']} renderRow={(item) => <tr key={item.code_universite}><td><Identity title={item.nom} subtitle={`${item.code_universite} • ${item.type_universite === 'PUBLIQUE' ? 'Public' : 'Privé'}`} icon={Building2} /></td><td>{categoryLabel(item)}</td><td>{item.ville}, {item.province}</td><td>{item.nombre_filieres || 0}</td><td><StatusBadge status={item.statut_verification} /></td><td><div className="table-actions"><Link className="table-action" title="Consulter" to={`/universites/${item.code_universite}`} target="_blank"><Eye /></Link>{item.statut_verification === 'EN_ATTENTE' && <><button className="table-action table-action--success" disabled={processing === item.code_universite} onClick={() => verifier(item,true)}><Check /></button><button className="table-action table-action--danger" disabled={processing === item.code_universite} onClick={() => verifier(item,false)}><X /></button></>}</div></td></tr>} />;
}

export function AdminUsersPage() {
  const { token } = useAuth();
  const [role, setRole] = useState('');
  const loader = useCallback(async () => (await apiRequest(`/utilisateurs?page=1&limite=100${role ? `&role=${role}` : ''}`, { token })).donnees || [], [token, role]);
  const list = useRemoteList(loader);
  return <ManagementPage title="Utilisateurs" description="Consultez les comptes et leur état d’accès à la plateforme." icon={Users} list={list} extra={<select className="compact-select" value={role} onChange={(event) => setRole(event.target.value)}><option value="">Tous les rôles</option><option value="ETUDIANT">Étudiants</option><option value="UNIVERSITE">Universités</option><option value="ENTREPRISE">Entreprises</option><option value="ADMINISTRATEUR">Administrateurs</option></select>} columns={['Utilisateur','Rôle','Localisation','Inscription','Statut']} renderRow={(item) => <tr key={item.code_utilisateur}><td><Identity title={item.nom_affichage} subtitle={`${item.email} • ${item.code_utilisateur}`} /></td><td><span className="role-chip">{item.role}</span></td><td>{item.ville || '—'}, {item.province || '—'}</td><td>{formatDate(item.date_creation)}</td><td><StatusBadge status={item.statut_compte} /></td></tr>} />;
}

export function AdminModerationPage() {
  const { token } = useAuth();
  const loader = useCallback(async () => (await apiRequest('/moderation/signalements?page=1&limite=50', { token })).donnees || [], [token]);
  const list = useRemoteList(loader);
  const [processing, setProcessing] = useState('');
  async function resolve(item, statut) {
    setProcessing(item.code_signalement);
    try {
      await apiRequest(`/moderation/signalements/${item.code_signalement}`, { method:'PATCH', token, body:{ statut, resolution: statut === 'RESOLU' ? 'Signalement examiné et traité par l’administration.' : 'Aucune violation confirmée après examen.' } });
      list.refresh();
    } finally { setProcessing(''); }
  }
  return <ManagementPage title="Modération" description="Examinez les contenus signalés par la communauté." icon={ShieldAlert} list={list} columns={['Signalement','Motif','Auteur','Date','Statut','Actions']} renderRow={(item) => <tr key={item.code_signalement}><td><strong>{item.code_signalement}</strong><small className="cell-subtitle">Publication {item.code_publication || item.publication_id}</small></td><td>{item.motif}<small className="cell-subtitle">{item.details || 'Aucun détail'}</small></td><td>{item.nom_declarant || item.code_declarant || 'Utilisateur'}</td><td>{formatDate(item.date_creation)}</td><td><StatusBadge status={item.statut_signalement} /></td><td><div className="table-actions"><button className="table-action table-action--success" disabled={processing === item.code_signalement} onClick={() => resolve(item,'RESOLU')}><Check /></button><button className="table-action table-action--danger" disabled={processing === item.code_signalement} onClick={() => resolve(item,'REJETE')}><X /></button></div></td></tr>} />;
}

export function AdminAuditPage() {
  const { token } = useAuth();
  const loader = useCallback(async () => (await apiRequest('/administration/audit?page=1&limite=100', { token })).donnees || [], [token]);
  const list = useRemoteList(loader);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [groupMode, setGroupMode] = useState('JOUR');
  const actions = useMemo(() => [...new Set(list.data.map((item) => item.action).filter(Boolean))].sort(), [list.data]);
  const entities = useMemo(() => [...new Set(list.data.map((item) => item.type_entite).filter(Boolean))].sort(), [list.data]);
  const visible = useMemo(() => list.data.filter((item) => (!actionFilter || item.action === actionFilter) && (!entityFilter || item.type_entite === entityFilter)), [actionFilter, entityFilter, list.data]);
  const groupBy = useCallback((item) => {
    if (groupMode === 'ACTION') return item.action || 'Autre action';
    if (groupMode === 'ENTITE') return item.type_entite || 'Autre entité';
    if (groupMode === 'JOUR') return item.date_creation ? new Date(item.date_creation).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : 'Date inconnue';
    return '';
  }, [groupMode]);
  return <ManagementPage title="Journal d’audit" description="Traçabilité des consultations et opérations sensibles, avec valeurs avant/après et adresse IP." icon={FileClock} list={{ ...list, data: visible }} groupBy={groupMode === 'AUCUN' ? null : groupBy} extra={<div className="management-filters"><select className="compact-select" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}><option value="">Toutes les actions</option>{actions.map((action) => <option key={action}>{action}</option>)}</select><select className="compact-select" value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)}><option value="">Toutes les entités</option>{entities.map((entity) => <option key={entity}>{entity}</option>)}</select><select className="compact-select" value={groupMode} onChange={(event) => setGroupMode(event.target.value)}><option value="JOUR">Grouper par jour</option><option value="ACTION">Grouper par action</option><option value="ENTITE">Grouper par entité</option><option value="AUCUN">Sans groupement</option></select></div>} columns={['Action','Entité','Utilisateur','Détails','Date']} renderRow={(item) => <tr key={item.code_audit || item.id}><td><strong>{item.action}</strong><small className="cell-subtitle">{item.code_audit}</small></td><td><span className="role-chip">{item.type_entite}</span><small className="cell-subtitle">ID {item.identifiant_entite || '—'}</small></td><td>{item.nom_affichage || 'Système / anonyme'}<small className="cell-subtitle">{item.code_utilisateur || item.adresse_ip || ''}</small></td><td className="audit-details-cell"><details><summary>Consulter les données</summary><pre>{formatAuditDetails(item)}</pre></details></td><td>{formatDateTime(item.date_creation)}</td></tr>} />;
}

function ManagementPage({ title, description, icon: Icon, list, columns, renderRow, extra, message, groupBy }) {
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => list.data.filter((item) => JSON.stringify(item).toLocaleLowerCase('fr-FR').includes(search.toLocaleLowerCase('fr-FR'))), [list.data, search]);
  const ordered = useMemo(() => {
    if (!groupBy) return filtered;
    const groupOrder = new Map();
    filtered.forEach((item) => { const group = String(groupBy(item)); if (!groupOrder.has(group)) groupOrder.set(group, groupOrder.size); });
    return [...filtered].sort((first, second) => groupOrder.get(String(groupBy(first))) - groupOrder.get(String(groupBy(second))));
  }, [filtered, groupBy]);
  const pageCount = Math.max(1, Math.ceil(ordered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = ordered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [list.data, pageSize]);
  return <div><DashboardPageHeader title={title} description={description} actions={<button className="secondary-action" onClick={list.refresh}><RefreshCw /> Actualiser</button>} />{message && <div className="alert alert--success"><Check /> {message}</div>}{list.error && <div className="alert alert--error">{list.error}</div>}<section className="app-panel management-panel"><div className="management-toolbar"><label><Search /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Rechercher dans la liste…" /></label>{extra}</div>{list.loading ? <div className="content-loading"><Spinner /> Chargement…</div> : ordered.length ? <><div className="table-scroll"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{visible.map((item, index) => { const group = groupBy?.(item); const previousGroup = index > 0 ? groupBy?.(visible[index - 1]) : null; return <Fragment key={item.code_audit || item.code_utilisateur || item.code_universite || item.code_signalement || item.id || index}>{groupBy && group !== previousGroup && <tr className="table-group-row"><td colSpan={columns.length}>{group}</td></tr>}{renderRow(item)}</Fragment>; })}</tbody></table></div><ListPagination page={currentPage} pageSize={pageSize} total={ordered.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /></> : <div className="management-empty"><span><Icon /></span><h3>Aucun élément</h3><p>La liste est actuellement vide.</p></div>}</section></div>;
}

function Identity({ title, subtitle, icon: Icon }) { return <div className="table-identity"><span>{Icon ? <Icon /> : title?.slice(0,2).toUpperCase()}</span><div><strong>{title}</strong><small>{subtitle}</small></div></div>; }
function formatDate(value) { return value ? new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium'}).format(new Date(value)) : '—'; }
function formatDateTime(value) { return value ? new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) : '—'; }
function formatAuditDetails(item) {
  const parse = (value) => { if (!value) return null; if (typeof value === 'object') return value; try { return JSON.parse(value); } catch { return value; } };
  return JSON.stringify({ avant: parse(item.anciennes_valeurs), apres: parse(item.nouvelles_valeurs), adresseIp: item.adresse_ip || null }, null, 2);
}
