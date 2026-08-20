import { Ban, Building2, Check, Eye, FileClock, Pencil, PauseCircle, Plus, RefreshCw, Search, ShieldAlert, ShieldCheck, Trash2, UserRoundCheck, Users, X } from 'lucide-react';
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
  const loader = useCallback(async () => (await apiRequest('/utilisateurs?role=UNIVERSITE&verification=EN_ATTENTE&page=1&limite=50', { token })).donnees || [], [token]);
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
  const [editor, setEditor] = useState(null);
  const [actionError, setActionError] = useState('');
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

  async function saveInstitution(event) {
    event.preventDefault(); setProcessing(editor.code_universite); setActionError('');
    try {
      const body = { nom: editor.nom, email: editor.email || null, telephone: editor.telephone || null, ville: editor.ville, province: editor.province, description: editor.description || null };
      await apiRequest(`/universites/${editor.code_universite}`, { method: 'PATCH', token, body });
      setMessage('La fiche de l’établissement a été modifiée.'); setEditor(null); await list.refresh();
    } catch (error) { setActionError(error.message); }
    finally { setProcessing(''); }
  }

  async function removeInstitution(item) {
    if (!window.confirm(`Supprimer définitivement « ${item.nom} » et ses données académiques ?`)) return;
    setProcessing(item.code_universite); setActionError('');
    try { await apiRequest(`/universites/${item.code_universite}`, { method: 'DELETE', token }); setMessage('L’établissement a été supprimé.'); await list.refresh(); }
    catch (error) { setActionError(error.message); }
    finally { setProcessing(''); }
  }

  return <><ManagementPage title="Établissements" description="Modifiez, vérifiez, bloquez ou supprimez les établissements depuis une seule vue." icon={Building2} list={{ ...list, data: visible }} message={message} externalError={actionError} extra={<div className="filter-tabs">{['TOUTES','EN_ATTENTE','VERIFIEE','REJETEE'].map((item) => <button className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item.replace('_',' ')}</button>)}</div>} columns={['Établissement', 'Catégorie', 'Localisation', 'Filières', 'Statut', 'Actions']} renderRow={(item) => <tr key={item.code_universite}><td><Identity title={item.nom} subtitle={`${item.code_universite} • ${item.type_universite === 'PUBLIQUE' ? 'Public' : 'Privé'}`} icon={Building2} /></td><td>{categoryLabel(item)}</td><td>{item.ville}, {item.province}</td><td>{item.nombre_filieres || 0}</td><td><StatusBadge status={item.statut_verification} /></td><td><div className="table-actions"><Link className="table-action" title="Consulter" to={`/universites/${item.code_universite}`} target="_blank"><Eye /></Link><button className="table-action" title="Modifier" onClick={() => setEditor({ ...item })}><Pencil /></button>{item.statut_verification !== 'VERIFIEE' && <button className="table-action table-action--success" title="Vérifier" disabled={processing === item.code_universite} onClick={() => verifier(item,true)}><Check /></button>}{item.statut_verification !== 'REJETEE' && <button className="table-action table-action--warning" title="Bloquer la fiche" disabled={processing === item.code_universite} onClick={() => verifier(item,false)}><Ban /></button>}<button className="table-action table-action--danger" title="Supprimer" disabled={processing === item.code_universite} onClick={() => removeInstitution(item)}><Trash2 /></button></div></td></tr>} />{editor && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditor(null); }}><form className="resource-modal resource-modal--large" onSubmit={saveInstitution}><header className="resource-modal__heading"><div><span className="eyebrow">Administration</span><h2>Modifier l’établissement</h2></div><button type="button" onClick={() => setEditor(null)}><X /></button></header>{actionError && <div className="alert alert--error">{actionError}</div>}<div className="form-grid"><label className="editor-field form-field--wide"><span>Nom officiel</span><input required value={editor.nom || ''} onChange={(event) => setEditor({ ...editor, nom: event.target.value })} /></label><label className="editor-field"><span>E-mail public</span><input type="email" value={editor.email || ''} onChange={(event) => setEditor({ ...editor, email: event.target.value })} /></label><label className="editor-field"><span>Téléphone</span><input value={editor.telephone || ''} onChange={(event) => setEditor({ ...editor, telephone: event.target.value })} /></label><label className="editor-field"><span>Ville</span><input required value={editor.ville || ''} onChange={(event) => setEditor({ ...editor, ville: event.target.value })} /></label><label className="editor-field"><span>Province</span><input required value={editor.province || ''} onChange={(event) => setEditor({ ...editor, province: event.target.value })} /></label><label className="editor-field form-field--wide"><span>Description</span><textarea rows="5" value={editor.description || ''} onChange={(event) => setEditor({ ...editor, description: event.target.value })} /></label></div><button className="button button--full" disabled={processing === editor.code_universite}>{processing === editor.code_universite ? <Spinner /> : <><Check />Enregistrer</>}</button></form></div>}</>;
}

export function AdminUsersPage() {
  const { token, utilisateur } = useAuth();
  const [role, setRole] = useState('');
  const [statut, setStatut] = useState('');
  const [editor, setEditor] = useState(null);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [processing, setProcessing] = useState('');
  const loader = useCallback(async () => (await apiRequest(`/utilisateurs?page=1&limite=100${role ? `&role=${role}` : ''}${statut ? `&statut=${statut}` : ''}`, { token })).donnees || [], [token, role, statut]);
  const list = useRemoteList(loader);

  async function saveUser(payload, item) {
    setProcessing(item?.code_utilisateur || 'CREATION'); setActionError(''); setMessage('');
    try {
      await apiRequest(item ? `/utilisateurs/${item.code_utilisateur}` : '/utilisateurs', {
        method: item ? 'PATCH' : 'POST', token, body: payload,
      });
      setMessage(item ? 'Le compte a été modifié.' : 'Le compte a été créé, vérifié et activé immédiatement.');
      setEditor(null);
      await list.refresh();
    } catch (error) { setActionError(error.message); throw error; }
    finally { setProcessing(''); }
  }

  async function changeStatus(item, statutCompte) {
    setProcessing(item.code_utilisateur); setActionError(''); setMessage('');
    try {
      await apiRequest(`/utilisateurs/${item.code_utilisateur}/statut`, { method: 'PATCH', token, body: { statutCompte } });
      setMessage(statutCompte === 'ACTIF' ? 'Le compte est de nouveau actif.' : statutCompte === 'BLOQUE' ? 'Le compte a été bloqué et ses sessions ont été révoquées.' : 'Le compte a été suspendu et ses sessions ont été révoquées.');
      await list.refresh();
    } catch (error) { setActionError(error.message); }
    finally { setProcessing(''); }
  }

  async function removeUser(item) {
    if (!window.confirm(`Supprimer le compte de ${item.nom_affichage} ? Cette suppression désactivera définitivement sa connexion.`)) return;
    setProcessing(item.code_utilisateur); setActionError(''); setMessage('');
    try {
      await apiRequest(`/utilisateurs/${item.code_utilisateur}`, { method: 'DELETE', token });
      setMessage('Le compte a été supprimé et toutes ses sessions ont été révoquées.');
      await list.refresh();
    } catch (error) { setActionError(error.message); }
    finally { setProcessing(''); }
  }

  return <>
    <ManagementPage
      title="Gestion des utilisateurs"
      description="Créez, modifiez et contrôlez les comptes non institutionnels. Les comptes créés ici sont automatiquement vérifiés."
      icon={Users}
      list={list}
      message={message}
      externalError={actionError}
      actions={<button className="button" type="button" onClick={() => setEditor({ mode: 'create', item: null })}><Plus />Ajouter un utilisateur</button>}
      tableClassName="admin-users-table"
      extra={<div className="management-filters"><select className="compact-select" value={role} onChange={(event) => setRole(event.target.value)}><option value="">Tous les rôles</option><option value="VISITEUR">Visiteurs</option><option value="ETUDIANT">Étudiants</option><option value="UNIVERSITE">Universités</option><option value="ENTREPRISE">Entreprises</option><option value="ADMINISTRATEUR">Administrateurs</option></select><select className="compact-select" value={statut} onChange={(event) => setStatut(event.target.value)}><option value="">Tous les statuts</option><option value="ACTIF">Actifs</option><option value="SUSPENDU">Suspendus</option><option value="BLOQUE">Bloqués</option><option value="SUPPRIME">Supprimés</option></select></div>}
      columns={['Utilisateur','Rôle','Localisation','Vérification','Statut','Actions']}
      renderRow={(item) => {
        const administrable = item.role !== 'UNIVERSITE';
        const self = item.code_utilisateur === utilisateur?.code_utilisateur;
        return <tr key={item.code_utilisateur}><td><Identity title={item.nom_affichage} subtitle={`${item.email} • ${item.code_utilisateur}`} /></td><td><span className="role-chip">{item.role}</span>{item.matricule_etudiant && <small className="cell-subtitle">Matricule : {item.matricule_etudiant}</small>}</td><td>{item.ville || '—'}, {item.province || '—'}</td><td><StatusBadge status={item.statut_verification} /></td><td><StatusBadge status={item.statut_compte} /></td><td>{administrable ? <div className="table-actions admin-user-actions">{item.statut_compte !== 'SUPPRIME' && <button className="table-action" type="button" title="Modifier" onClick={() => setEditor({ mode: 'edit', item })}><Pencil /></button>}{!self && item.statut_compte === 'ACTIF' && <><button className="table-action table-action--warning" type="button" title="Suspendre" disabled={processing === item.code_utilisateur} onClick={() => changeStatus(item, 'SUSPENDU')}><PauseCircle /></button><button className="table-action table-action--danger" type="button" title="Bloquer" disabled={processing === item.code_utilisateur} onClick={() => changeStatus(item, 'BLOQUE')}><Ban /></button></>}{!self && ['SUSPENDU','BLOQUE','EN_ATTENTE'].includes(item.statut_compte) && <button className="table-action table-action--success" type="button" title="Réactiver" disabled={processing === item.code_utilisateur} onClick={() => changeStatus(item, 'ACTIF')}><ShieldCheck /></button>}{!self && item.statut_compte !== 'SUPPRIME' && <button className="table-action table-action--danger" type="button" title="Supprimer" disabled={processing === item.code_utilisateur} onClick={() => removeUser(item)}><Trash2 /></button>}</div> : <span className="admin-user-readonly">Via Établissements</span>}</td></tr>;
      }}
    />
    {editor && <AdminUserEditor item={editor.item} loading={Boolean(processing)} onClose={() => setEditor(null)} onSave={saveUser} />}
  </>;
}

function AdminUserEditor({ item, loading, onClose, onSave }) {
  const editing = Boolean(item);
  const [form, setForm] = useState(() => ({
    nomAffichage: item?.nom_affichage || '', email: item?.email || '', motDePasse: '',
    role: item?.role || 'VISITEUR', matriculeEtudiant: item?.matricule_etudiant || '',
    pays: item?.pays || 'République démocratique du Congo', province: item?.province || '', ville: item?.ville || '',
  }));
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError('');
    const payload = {
      nomAffichage: form.nomAffichage, email: form.email, role: form.role,
      pays: form.pays || null, province: form.province || null, ville: form.ville || null,
    };
    if (form.motDePasse) payload.motDePasse = form.motDePasse;
    if (form.role === 'ETUDIANT') payload.matriculeEtudiant = form.matriculeEtudiant;
    try { await onSave(payload, item); } catch (submitError) { setError(submitError.message); }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="resource-modal resource-modal--large admin-user-modal" onSubmit={submit}><header className="resource-modal__heading"><div><span className="eyebrow eyebrow--accent">Administration</span><h2>{editing ? 'Modifier le compte' : 'Ajouter un utilisateur'}</h2></div><button type="button" onClick={onClose} aria-label="Fermer"><X /></button></header><div className="admin-user-modal__notice"><ShieldCheck /><p><strong>Activation immédiate</strong><span>Le compte sera actif et son adresse considérée comme vérifiée. Les universités utilisent obligatoirement le formulaire institutionnel.</span></p></div>{error && <div className="alert alert--error">{error}</div>}<div className="form-grid"><label className="editor-field"><span>Nom complet *</span><input required minLength="2" value={form.nomAffichage} onChange={(event) => setForm({ ...form, nomAffichage: event.target.value })} /></label><label className="editor-field"><span>Adresse e-mail *</span><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label className="editor-field"><span>Rôle *</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="VISITEUR">Visiteur</option><option value="ETUDIANT">Étudiant</option><option value="ENTREPRISE">Entreprise / organisation</option><option value="ADMINISTRATEUR">Administrateur</option></select></label><label className="editor-field"><span>{editing ? 'Nouveau mot de passe' : 'Mot de passe *'}</span><input required={!editing} minLength="8" type="password" value={form.motDePasse} onChange={(event) => setForm({ ...form, motDePasse: event.target.value })} placeholder={editing ? 'Laisser vide pour conserver' : '8 caractères minimum'} /></label>{form.role === 'ETUDIANT' && <label className="editor-field form-field--wide"><span>Matricule étudiant *</span><input required minLength="2" value={form.matriculeEtudiant} onChange={(event) => setForm({ ...form, matriculeEtudiant: event.target.value })} /></label>}<label className="editor-field"><span>Pays</span><input value={form.pays} onChange={(event) => setForm({ ...form, pays: event.target.value })} /></label><label className="editor-field"><span>Province / État</span><input value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })} /></label><label className="editor-field form-field--wide"><span>Ville</span><input value={form.ville} onChange={(event) => setForm({ ...form, ville: event.target.value })} /></label></div><div className="admin-user-modal__actions"><button className="secondary-action" type="button" onClick={onClose}>Annuler</button><button className="button" disabled={loading}>{loading ? <Spinner /> : <><Check />{editing ? 'Enregistrer' : 'Créer et vérifier'}</>}</button></div></form></div>;
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
  return <ManagementPage title="Journal d’audit" description="Traçabilité des consultations et opérations sensibles, avec valeurs avant/après et adresse IP." icon={FileClock} list={{ ...list, data: visible }} groupBy={groupMode === 'AUCUN' ? null : groupBy} extra={<div className="management-filters"><select className="compact-select" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}><option value="">Toutes les actions</option>{actions.map((action) => <option key={action}>{action}</option>)}</select><select className="compact-select" value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)}><option value="">Toutes les entités</option>{entities.map((entity) => <option key={entity}>{entity}</option>)}</select><select className="compact-select" value={groupMode} onChange={(event) => setGroupMode(event.target.value)}><option value="JOUR">Grouper par jour</option><option value="ACTION">Grouper par action</option><option value="ENTITE">Grouper par entité</option><option value="AUCUN">Sans groupement</option></select></div>} columns={['Action','Entité','Utilisateur','Détails','Date']} renderRow={(item) => <tr key={item.code_audit || item.id}><td><strong>{humaniserNom(item.action)}</strong><small className="cell-subtitle">{item.code_audit}</small></td><td><span className="role-chip">{humaniserNom(item.type_entite)}</span><small className="cell-subtitle">ID {item.identifiant_entite || '—'}</small></td><td>{item.nom_affichage || 'Système / anonyme'}<small className="cell-subtitle">{item.code_utilisateur || item.adresse_ip || ''}</small></td><td className="audit-details-cell"><AuditDetails item={item} /></td><td>{formatDateTime(item.date_creation)}</td></tr>} />;
}

function ManagementPage({ title, description, icon: Icon, list, columns, renderRow, extra, message, externalError, groupBy, actions, tableClassName = '' }) {
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
  return <div><DashboardPageHeader title={title} description={description} actions={<div className="management-header-actions">{actions}<button className="secondary-action" onClick={list.refresh}><RefreshCw /> Actualiser</button></div>} />{message && <div className="alert alert--success"><Check /> {message}</div>}{(externalError || list.error) && <div className="alert alert--error">{externalError || list.error}</div>}<section className="app-panel management-panel"><div className="management-toolbar"><label><Search /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Rechercher dans la liste…" /></label>{extra}</div>{list.loading ? <div className="content-loading"><Spinner /> Chargement…</div> : ordered.length ? <><div className="table-scroll"><table className={`data-table ${tableClassName}`}><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{visible.map((item, index) => { const group = groupBy?.(item); const previousGroup = index > 0 ? groupBy?.(visible[index - 1]) : null; return <Fragment key={item.code_audit || item.code_utilisateur || item.code_universite || item.code_signalement || item.id || index}>{groupBy && group !== previousGroup && <tr className="table-group-row"><td colSpan={columns.length}>{group}</td></tr>}{renderRow(item)}</Fragment>; })}</tbody></table></div><ListPagination page={currentPage} pageSize={pageSize} total={ordered.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /></> : <div className="management-empty"><span><Icon /></span><h3>Aucun élément</h3><p>La liste est actuellement vide.</p></div>}</section></div>;
}

function Identity({ title, subtitle, icon: Icon }) { return <div className="table-identity"><span>{Icon ? <Icon /> : title?.slice(0,2).toUpperCase()}</span><div><strong>{title}</strong><small>{subtitle}</small></div></div>; }
function formatDate(value) { return value ? new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium'}).format(new Date(value)) : '—'; }
function formatDateTime(value) { return value ? new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) : '—'; }
function parseAudit(value) { if (!value) return null; if (typeof value === 'object') return value; try { return JSON.parse(value); } catch { return value; } }
function humaniserNom(value = '') { return String(value).replaceAll('_', ' ').toLocaleLowerCase('fr-FR').replace(/^./, (letter) => letter.toLocaleUpperCase('fr-FR')); }
function valeursLisibles(value) {
  if (value == null) return [];
  if (typeof value !== 'object') return [String(value)];
  return Object.entries(value).flatMap(([key, content]) => {
    if (content == null || content === '' || (typeof content === 'object' && !Object.keys(content).length)) return [];
    if (typeof content === 'object') return valeursLisibles(content).map((line) => `${humaniserNom(key)} — ${line}`);
    return [`${humaniserNom(key)} : ${String(content)}`];
  });
}
function AuditDetails({ item }) {
  const before = valeursLisibles(parseAudit(item.anciennes_valeurs));
  const after = valeursLisibles(parseAudit(item.nouvelles_valeurs));
  return <details><summary>Voir le résumé</summary><div className="audit-readable">{before.length > 0 && <section><strong>Avant l’action</strong>{before.map((line) => <span key={`before-${line}`}>{line}</span>)}</section>}{after.length > 0 && <section><strong>Résultat de l’action</strong>{after.map((line) => <span key={`after-${line}`}>{line}</span>)}</section>}<section><strong>Origine</strong><span>Adresse IP : {item.adresse_ip || 'non enregistrée'}</span></section></div></details>;
}
