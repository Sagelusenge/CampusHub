import { CheckCircle2, Inbox, Mail, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function AdminContactsPage() {
  const { token } = useAuth(); const [items, setItems] = useState([]); const [filter, setFilter] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); try { const res = await apiRequest(`/contact/administration${filter ? `?statut=${filter}` : ''}`, { token }); setItems(res.donnees || []); setError(''); } catch (err) { setError(err.message); } finally { setLoading(false); } }, [token, filter]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  async function update(code, statut) { try { await apiRequest(`/contact/administration/${code}`, { method: 'PATCH', token, body: { statut } }); await load(); } catch (err) { setError(err.message); } }
  return <><DashboardPageHeader title="Messages de contact" description="Demandes envoyées depuis la page publique." actions={<button className="secondary-action" onClick={load}><RefreshCw />Actualiser</button>} />
    <div className="management-toolbar"><div className="filter-tabs">{['', 'NOUVEAU', 'EN_COURS', 'TRAITE', 'ARCHIVE'].map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value || 'Tous'}</button>)}</div></div>{error && <div className="alert alert--error">{error}</div>}
    {loading ? <div className="content-loading app-panel"><Spinner />Chargement…</div> : items.length ? <div className="contact-admin-list">{items.map((item) => <article className="app-panel" key={item.code_contact}><header><span><Mail /></span><div><strong>{item.sujet}</strong><small>{item.nom} · {item.email}</small></div><em className={`status status--${item.statut.toLowerCase()}`}>{item.statut}</em></header><p>{item.message}</p><footer><small>{new Date(item.date_creation).toLocaleString('fr-FR')}</small><div>{item.statut === 'NOUVEAU' && <button onClick={() => update(item.code_contact, 'EN_COURS')}>Prendre en charge</button>}{!['TRAITE', 'ARCHIVE'].includes(item.statut) && <button className="button button--small" onClick={() => update(item.code_contact, 'TRAITE')}><CheckCircle2 />Marquer traité</button>}</div></footer></article>)}</div>
      : <div className="management-empty app-panel"><Inbox /><h3>Aucun message</h3><p>Les nouvelles demandes apparaîtront ici.</p></div>}
  </>;
}
