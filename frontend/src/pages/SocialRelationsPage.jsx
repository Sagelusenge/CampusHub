import { Check, MessageCircle, Search, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { Spinner } from '../components/Spinner.jsx';
import { ListPagination } from '../components/ListPagination.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const initials = (name = 'CH') => name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase();
function Avatar({ person }) { return person.url_photo_profil ? <img src={person.url_photo_profil} alt="" /> : initials(person.nom_affichage); }

export function SocialRelationsPage() {
  const { token } = useAuth(); const navigate = useNavigate();
  const [tab, setTab] = useState('suggestions'); const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]); const [invitations, setInvitations] = useState([]);
  const [relations, setRelations] = useState([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [roleFilter, setRoleFilter] = useState(''); const [pageSize, setPageSize] = useState(15); const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, i, r] = await Promise.all([
        apiRequest(`/communaute/relations/suggestions?recherche=${encodeURIComponent(query)}`, { token }),
        apiRequest('/communaute/relations/invitations', { token }),
        apiRequest('/communaute/relations', { token }),
      ]);
      setSuggestions(s.donnees || []); setInvitations(i.donnees || []); setRelations(r.donnees || []); setError('');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, [query, token]);
  useEffect(() => { const timer = window.setTimeout(load, 250); return () => window.clearTimeout(timer); }, [load]);

  async function invite(person) {
    try { await apiRequest('/communaute/relations/invitations', { method: 'POST', token, body: { codeDestinataire: person.code_utilisateur } }); setMessage(`Invitation envoyée à ${person.nom_affichage}.`); await load(); }
    catch (err) { setError(err.message); }
  }
  async function answer(invitation, statut) {
    try { await apiRequest(`/communaute/relations/invitations/${invitation.code_relation}`, { method: 'PATCH', token, body: { statut } }); await load(); }
    catch (err) { setError(err.message); }
  }
  async function remove(person) {
    try { await apiRequest(`/communaute/relations/${person.code_utilisateur}`, { method: 'DELETE', token }); await load(); }
    catch (err) { setError(err.message); }
  }
  async function chat(person) {
    try { await apiRequest('/messagerie/conversations', { method: 'POST', token, body: { codeDestinataire: person.code_utilisateur } }); navigate('/chat'); }
    catch (err) { setError(err.message); }
  }

  const sourceItems = tab === 'invitations' ? invitations : tab === 'relations' ? relations : suggestions;
  const items = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('fr-FR');
    return sourceItems.filter((person) => {
      const matchesRole = !roleFilter || person.role === roleFilter;
      const haystack = [person.nom_affichage, person.titre, person.nom_etablissement, person.role].filter(Boolean).join(' ').toLocaleLowerCase('fr-FR');
      return matchesRole && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [query, roleFilter, sourceItems]);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const visibleItems = items.slice((Math.min(page, pageCount) - 1) * pageSize, Math.min(page, pageCount) * pageSize);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [tab, query, roleFilter, pageSize]);

  return <section className="social-relations-page">
    <div className="container social-relations-shell">
      <header><div><span className="eyebrow"><Users />Communauté académique</span><h1>Relations</h1><p>Retrouvez des étudiants, développez votre réseau et échangez directement.</p></div>
        <form onSubmit={(event) => event.preventDefault()}><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un étudiant…" /></form></header>
      <div className="social-relations-tabs">
        <button className={tab === 'suggestions' ? 'active' : ''} onClick={() => setTab('suggestions')}>Suggestions</button>
        <button className={tab === 'invitations' ? 'active' : ''} onClick={() => setTab('invitations')}>Invitations {invitations.length > 0 && <span>{invitations.length}</span>}</button>
        <button className={tab === 'relations' ? 'active' : ''} onClick={() => setTab('relations')}>Mes relations <span>{relations.length}</span></button>
      </div>
      <div className="relations-controls app-panel">
        <label>Type de profil<select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="">Tous les profils</option><option value="ETUDIANT">Étudiants</option><option value="UNIVERSITE">Établissements</option><option value="VISITEUR">Visiteurs</option></select></label>
        <p><strong>{items.length}</strong> personne(s) trouvée(s)</p>
      </div>
      {message && <div className="alert alert--success">{message}</div>}{error && <div className="alert alert--error">{error}</div>}
      {loading ? <div className="content-loading app-panel"><Spinner />Chargement du réseau…</div> : items.length ? <><div className="relations-grid">{visibleItems.map((person) => <article className="relation-card app-panel" key={person.code_relation || person.code_utilisateur}>
        <button className="relation-card__profile" type="button" onClick={() => navigate(`/profils-utilisateurs/${person.code_utilisateur}`)}><span className="relation-card__avatar"><Avatar person={person} /></span><div><h2>{person.nom_affichage}</h2><p>{person.titre || person.nom_etablissement || (person.role === 'ETUDIANT' ? 'Étudiant CampusHub' : person.role)}</p>{person.message && <blockquote>{person.message}</blockquote>}</div></button>
        <footer>{tab === 'suggestions' && (!person.statut_relation || ['REFUSEE', 'ANNULEE'].includes(person.statut_relation)) && <button className="button button--small" onClick={() => invite(person)}><UserPlus />Inviter</button>}
          {tab === 'suggestions' && person.statut_relation === 'EN_ATTENTE' && <span className="relation-status">Invitation {person.sens_relation === 'RECUE' ? 'reçue' : 'envoyée'}</span>}
          {tab === 'suggestions' && person.statut_relation === 'ACCEPTEE' && <button className="secondary-action" onClick={() => chat(person)}><MessageCircle />Message</button>}
          {tab === 'invitations' && <><button className="button button--small" onClick={() => answer(person, 'ACCEPTEE')}><Check />Accepter</button><button className="secondary-action" onClick={() => answer(person, 'REFUSEE')}><X />Refuser</button></>}
          {tab === 'relations' && <><button className="button button--small" onClick={() => chat(person)}><MessageCircle />Message</button><button className="secondary-action relation-remove" onClick={() => remove(person)}><UserMinus />Retirer</button></>}</footer>
      </article>)}</div><ListPagination page={Math.min(page, pageCount)} pageSize={pageSize} total={items.length} pageSizes={[15,30,45,60]} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /></> : <div className="management-empty app-panel"><Users /><h3>Aucun résultat</h3><p>Les nouvelles relations apparaîtront ici.</p></div>}
    </div>
  </section>;
}
