import { Archive, CheckCircle2, Inbox, Mail, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { ListPagination } from '../components/ListPagination.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function AdminContactsPage() {
  const { token } = useAuth(); const [items, setItems] = useState([]); const [filter, setFilter] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState(''); const [pageSize, setPageSize] = useState(10); const [page, setPage] = useState(1);
  const load = useCallback(async () => { setLoading(true); try { const res = await apiRequest(`/contact/administration${filter ? `?statut=${filter}` : ''}`, { token }); setItems(res.donnees || []); setError(''); } catch (err) { setError(err.message); } finally { setLoading(false); } }, [token, filter]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  async function update(code, statut) { try { const response = await apiRequest(`/contact/administration/${code}`, { method: 'PATCH', token, body: { statut } }); setMessage(response.donnees?.email_expediteur_envoye ? 'Statut mis à jour et e-mail envoyé à l’expéditeur.' : 'Statut mis à jour. L’e-mail n’a pas pu être envoyé.'); await load(); } catch (err) { setError(err.message); } }
  const filteredItems = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('fr-FR');
    return needle ? items.filter((item) => [item.nom, item.email, item.sujet, item.message].filter(Boolean).join(' ').toLocaleLowerCase('fr-FR').includes(needle)) : items;
  }, [items, search]);
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visibleItems = filteredItems.slice((Math.min(page, pageCount) - 1) * pageSize, Math.min(page, pageCount) * pageSize);
  return <><DashboardPageHeader title="Messages de contact" description="Demandes envoyées depuis la page publique." actions={<button className="secondary-action" onClick={load}><RefreshCw />Actualiser</button>} />
    <div className="management-toolbar contact-management-toolbar"><label><Search /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Rechercher un message…" /></label><div className="filter-tabs">{['', 'NOUVEAU', 'EN_COURS', 'TRAITE', 'ARCHIVE'].map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => { setFilter(value); setPage(1); }}>{value || 'Tous'}</button>)}</div></div>{error && <div className="alert alert--error">{error}</div>}{message && <div className="alert alert--success">{message}</div>}
    {loading ? <div className="content-loading app-panel"><Spinner />Chargement…</div> : filteredItems.length ? <><div className="contact-admin-list">{visibleItems.map((item) => <article className="app-panel" key={item.code_contact}><header><span><Mail /></span><div><strong>{item.sujet}</strong><small>{item.nom} · {item.email}</small></div><em className={`status status--${item.statut.toLowerCase()}`}>{item.statut}</em></header><p>{item.message}</p><footer><small>{new Date(item.date_creation).toLocaleString('fr-FR')}</small><div>{item.statut === 'NOUVEAU' && <button onClick={() => update(item.code_contact, 'EN_COURS')}>Prendre en charge</button>}{!['TRAITE', 'ARCHIVE'].includes(item.statut) && <button className="contact-treat-button" onClick={() => update(item.code_contact, 'TRAITE')}><CheckCircle2 />Marquer traité</button>}{item.statut === 'TRAITE' && <button onClick={() => update(item.code_contact, 'ARCHIVE')}><Archive />Archiver</button>}</div></footer></article>)}</div><ListPagination page={Math.min(page, pageCount)} pageSize={pageSize} total={filteredItems.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /></>
      : <div className="management-empty app-panel"><Inbox /><h3>Aucun message</h3><p>Les nouvelles demandes apparaîtront ici.</p></div>}
  </>;
}
