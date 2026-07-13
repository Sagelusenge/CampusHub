import { ArrowLeft, ImagePlus, MessageCircle, Plus, Search, Send, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest, uploadFile } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function initials(name = 'CH') { return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase(); }
function hour(value) { return value ? new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''; }

export function MessagesPage() {
  const { token, utilisateur } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [sending, setSending] = useState(false);
  const [newChat, setNewChat] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [contacts, setContacts] = useState([]);
  const bottomRef = useRef(null);
  const preview = useMemo(() => image ? URL.createObjectURL(image) : null, [image]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const loadConversations = useCallback(async () => {
    try {
      const response = await apiRequest('/messagerie/conversations', { token });
      setConversations(response.donnees || []);
      setError('');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversations();
  }, [loadConversations]);

  const loadMessages = useCallback(async (conversation, silent = false) => {
    if (!conversation) return;
    if (!silent) setLoadingMessages(true);
    try {
      const response = await apiRequest(`/messagerie/conversations/${conversation.code_conversation}/messages`, { token });
      setMessages(response.donnees || []);
      setConversations((current) => current.map((item) => item.code_conversation === conversation.code_conversation ? { ...item, non_lus: 0 } : item));
      setError('');
    } catch (err) { setError(err.message); }
    finally { if (!silent) setLoadingMessages(false); }
  }, [token]);

  useEffect(() => {
    if (!active) return undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMessages(active);
    const timer = window.setInterval(() => loadMessages(active, true), 8000);
    return () => window.clearInterval(timer);
  }, [active, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!newChat) return;
    const timer = window.setTimeout(() => {
      apiRequest(`/messagerie/contacts?recherche=${encodeURIComponent(contactSearch)}`, { token })
        .then((response) => setContacts(response.donnees || []))
        .catch((err) => setError(err.message));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [contactSearch, newChat, token]);

  async function chooseContact(contact) {
    try {
      const response = await apiRequest('/messagerie/conversations', { method: 'POST', token, body: { codeDestinataire: contact.code_utilisateur } });
      await loadConversations();
      setActive({ ...contact, code_conversation: response.donnees.code_conversation });
      setNewChat(false); setContactSearch('');
    } catch (err) { setError(err.message); }
  }

  async function send(event) {
    event.preventDefault();
    if (!active || (!text.trim() && !image)) return;
    setSending(true);
    try {
      let media = null;
      if (image) media = (await uploadFile('/televersements/images', image, token)).donnees;
      await apiRequest(`/messagerie/conversations/${active.code_conversation}/messages`, {
        method: 'POST', token,
        body: { contenu: text.trim() || null, urlMedia: media?.url || null, typeMedia: media ? 'IMAGE' : null },
      });
      setText(''); setImage(null); await loadMessages(active, true); await loadConversations();
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  }

  return <div className="messages-page">
    <DashboardPageHeader title="Messages" description="Discutez directement avec les étudiants et les universités de CampusHub." actions={<button className="button" onClick={() => setNewChat(true)}><Plus />Nouveau message</button>} />
    {error && <div className="alert alert--error">{error}</div>}
    <section className={`messenger app-panel ${active ? 'messenger--conversation-open' : ''}`}>
      <aside className="messenger-list">
        <div className="messenger-list__heading"><div><MessageCircle /><strong>Discussions</strong></div><button onClick={() => setNewChat(true)} aria-label="Nouvelle discussion"><Plus /></button></div>
        {loading ? <div className="content-loading"><Spinner /></div> : conversations.length ? conversations.map((item) => <button key={item.code_conversation} className={active?.code_conversation === item.code_conversation ? 'active' : ''} onClick={() => setActive(item)}>
          <span className="messenger-avatar">{item.url_photo_profil ? <img src={item.url_photo_profil} alt="" /> : initials(item.nom_affichage)}</span>
          <div><strong>{item.nom_affichage || 'Conversation'}</strong><p>{item.dernier_message || 'Démarrez la discussion'}</p></div>
          <small>{hour(item.date_dernier_message)}{Number(item.non_lus) > 0 && <i>{item.non_lus}</i>}</small>
        </button>) : <div className="messenger-empty"><MessageCircle /><strong>Aucune discussion</strong><p>Envoyez votre premier message à un membre de CampusHub.</p><button className="button button--small" onClick={() => setNewChat(true)}>Commencer</button></div>}
      </aside>

      <div className="messenger-chat">
        {active ? <>
          <header><button className="messenger-back" onClick={() => setActive(null)}><ArrowLeft /></button><span className="messenger-avatar">{active.url_photo_profil ? <img src={active.url_photo_profil} alt="" /> : initials(active.nom_affichage)}</span><div><strong>{active.nom_affichage}</strong><small>{active.role === 'UNIVERSITE' ? 'Université' : 'Étudiant CampusHub'}</small></div></header>
          <div className="messenger-messages">
            {loadingMessages ? <div className="content-loading"><Spinner /></div> : messages.length ? messages.map((message) => {
              const mine = message.code_auteur === utilisateur.code_utilisateur;
              return <div className={`message-bubble ${mine ? 'message-bubble--mine' : ''}`} key={message.code_message}>{message.url_media && <img src={message.url_media} alt="Photo envoyée" />}{message.contenu && <p>{message.contenu}</p>}<small>{hour(message.date_creation)}</small></div>;
            }) : <div className="messenger-conversation-empty"><Users /><h3>Commencez la conversation</h3><p>Envoyez un message ou une photo.</p></div>}
            <div ref={bottomRef} />
          </div>
          {preview && <div className="message-preview"><img src={preview} alt="Aperçu" /><button onClick={() => setImage(null)}><X /></button></div>}
          <form className="messenger-compose" onSubmit={send}><label title="Ajouter une photo"><ImagePlus /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] || null)} /></label><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Écrire un message…" /><button disabled={sending || (!text.trim() && !image)}>{sending ? <Spinner /> : <Send />}</button></form>
        </> : <div className="messenger-placeholder"><span><MessageCircle /></span><h2>Vos messages CampusHub</h2><p>Sélectionnez une discussion ou contactez un étudiant ou une université.</p><button className="button" onClick={() => setNewChat(true)}><Plus />Nouveau message</button></div>}
      </div>
    </section>

    {newChat && <div className="modal-backdrop" onMouseDown={() => setNewChat(false)}><div className="contact-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><small>Messagerie CampusHub</small><h2>Nouveau message</h2></div><button onClick={() => setNewChat(false)}><X /></button></header><label><Search /><input autoFocus value={contactSearch} onChange={(event) => setContactSearch(event.target.value)} placeholder="Rechercher une personne ou une université…" /></label><div className="contact-results">{contacts.length ? contacts.map((contact) => <button key={contact.code_utilisateur} onClick={() => chooseContact(contact)}><span className="messenger-avatar">{initials(contact.nom_affichage)}</span><div><strong>{contact.nom_affichage}</strong><small>{contact.role === 'UNIVERSITE' ? 'Université' : 'Étudiant'} • {contact.ville || 'CampusHub'}</small></div><Send /></button>) : <div className="messenger-empty"><Search /><p>Aucun contact trouvé.</p></div>}</div></div></div>}
  </div>;
}
