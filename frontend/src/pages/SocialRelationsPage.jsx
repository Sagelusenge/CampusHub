import { Check, MessageCircle, Search, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const initials = (name = 'CH') => name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase();
function Avatar({ person }) { return person.url_photo_profil ? <img src={person.url_photo_profil} alt="" /> : initials(person.nom_affichage); }

export function SocialRelationsPage() {
  const { token } = useAuth(); const navigate = useNavigate();
  const [tab, setTab] = useState('suggestions'); const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]); const [invitations, setInvitations] = useState([]);
  const [relations, setRelations] = useState([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');

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

  const items = tab === 'invitations' ? invitations : tab === 'relations' ? relations : suggestions;
  return <section className="social-relations-page">
    <div className="container social-relations-shell">
      <header><div><span className="eyebrow"><Users />Communauté académique</span><h1>Relations</h1><p>Retrouvez des étudiants, développez votre réseau et échangez directement.</p></div>
        <form onSubmit={(event) => event.preventDefault()}><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un étudiant…" /></form></header>
      <div className="social-relations-tabs">
        <button className={tab === 'suggestions' ? 'active' : ''} onClick={() => setTab('suggestions')}>Suggestions</button>
        <button className={tab === 'invitations' ? 'active' : ''} onClick={() => setTab('invitations')}>Invitations {invitations.length > 0 && <span>{invitations.length}</span>}</button>
        <button className={tab === 'relations' ? 'active' : ''} onClick={() => setTab('relations')}>Mes relations <span>{relations.length}</span></button>
      </div>
      {message && <div className="alert alert--success">{message}</div>}{error && <div className="alert alert--error">{error}</div>}
      {loading ? <div className="content-loading app-panel"><Spinner />Chargement du réseau…</div> : items.length ? <div className="relations-grid">{items.map((person) => <article className="relation-card app-panel" key={person.code_relation || person.code_utilisateur}>
        <span className="relation-card__avatar"><Avatar person={person} /></span><div><h2>{person.nom_affichage}</h2><p>{person.titre || person.nom_etablissement || (person.role === 'ETUDIANT' ? 'Étudiant CampusHub' : person.role)}</p>{person.message && <blockquote>{person.message}</blockquote>}</div>
        <footer>{tab === 'suggestions' && (!person.statut_relation || ['REFUSEE', 'ANNULEE'].includes(person.statut_relation)) && <button className="button button--small" onClick={() => invite(person)}><UserPlus />Inviter</button>}
          {tab === 'suggestions' && person.statut_relation === 'EN_ATTENTE' && <span className="relation-status">Invitation {person.sens_relation === 'RECUE' ? 'reçue' : 'envoyée'}</span>}
          {tab === 'suggestions' && person.statut_relation === 'ACCEPTEE' && <button className="secondary-action" onClick={() => chat(person)}><MessageCircle />Message</button>}
          {tab === 'invitations' && <><button className="button button--small" onClick={() => answer(person, 'ACCEPTEE')}><Check />Accepter</button><button className="secondary-action" onClick={() => answer(person, 'REFUSEE')}><X />Refuser</button></>}
          {tab === 'relations' && <><button className="button button--small" onClick={() => chat(person)}><MessageCircle />Message</button><button className="secondary-action relation-remove" onClick={() => remove(person)}><UserMinus />Retirer</button></>}</footer>
      </article>)}</div> : <div className="management-empty app-panel"><Users /><h3>Aucun résultat</h3><p>Les nouvelles relations apparaîtront ici.</p></div>}
    </div>
  </section>;
}
