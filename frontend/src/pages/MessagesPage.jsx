import {
  ArrowLeft,
  Ban,
  Camera,
  Check,
  CheckCheck,
  Clock3,
  Download,
  File,
  FileText,
  ImagePlus,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Plus,
  Search,
  Send,
  ShieldCheck,
  TimerReset,
  Users,
  Video,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest, uploadFile } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ephemeralOptions = [
  { value: null, label: 'Permanent' },
  { value: '1_HEURE', label: 'Éphémère · 1 h' },
  { value: '24_HEURES', label: 'Éphémère · 24 h' },
  { value: '7_JOURS', label: 'Éphémère · 7 j' },
];

function initials(name = 'CH') {
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

function hour(value) {
  return value ? new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
}

function roleLabel(role) {
  if (role === 'UNIVERSITE') return 'Établissement CampusHub';
  if (role === 'ADMINISTRATEUR') return 'Administration CampusHub';
  if (role === 'VISITEUR') return 'Membre CampusHub';
  return 'Étudiant CampusHub';
}

function expirationLabel(value) {
  if (!value) return '';
  const milliseconds = new Date(value).getTime() - Date.now();
  if (milliseconds <= 0) return 'expire bientôt';
  const hours = Math.ceil(milliseconds / 3_600_000);
  if (hours <= 1) return 'expire dans 1 h';
  if (hours < 24) return `expire dans ${hours} h`;
  return `expire dans ${Math.max(1, Math.round(milliseconds / 86_400_000))} j`;
}

function mediaType(file) {
  if (file?.type?.startsWith('image/')) return 'IMAGE';
  if (file?.type?.startsWith('video/')) return 'VIDEO';
  if (file?.type === 'application/pdf') return 'DOCUMENT';
  return 'FICHIER';
}

function mediaEndpoint(file) {
  const type = mediaType(file);
  if (type === 'IMAGE' || type === 'VIDEO') return '/televersements/medias';
  if (type === 'DOCUMENT') return '/televersements/documents';
  return '/televersements/fichiers';
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function MessageMedia({ message }) {
  if (!message.url_media) return null;
  if (message.type_media === 'VIDEO') return <video className="message-video" src={message.url_media} controls preload="metadata" />;
  if (message.type_media === 'DOCUMENT' || message.type_media === 'FICHIER') {
    return <a className="message-document" href={message.url_media} target="_blank" rel="noreferrer" download><span>{message.type_media === 'DOCUMENT' ? <FileText /> : <File />}</span><div><strong>{message.nom_media || 'Document joint'}</strong><small>{formatSize(Number(message.taille_octets)) || message.type_mime || 'Fichier'}</small></div><Download /></a>;
  }
  return <img src={message.url_media} alt="Photo envoyée" />;
}

function MessageReceipt({ status }) {
  if (!status) return null;
  if (status === 'LU') return <span className="message-receipt message-receipt--read" title="Lu"><CheckCheck /></span>;
  if (status === 'LIVRE') return <span className="message-receipt" title="Livré"><CheckCheck /></span>;
  return <span className="message-receipt" title="Envoyé"><Check /></span>;
}

function Avatar({ contact, online = false }) {
  return (
    <span className="messenger-avatar-wrap">
      <span className="messenger-avatar">
        {contact?.url_photo_profil ? <img src={contact.url_photo_profil} alt="" /> : initials(contact?.nom_affichage)}
      </span>
      {Boolean(online) && <i className="messenger-online-dot" title="En ligne" />}
    </span>
  );
}

export function MessagesPage() {
  const { token, utilisateur } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatState, setChatState] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachmentMenu, setAttachmentMenu] = useState(false);
  const [sending, setSending] = useState(false);
  const [newChat, setNewChat] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [contacts, setContacts] = useState([]);
  const [conversationMenu, setConversationMenu] = useState(false);
  const [ephemeralDuration, setEphemeralDuration] = useState(null);
  const bottomRef = useRef(null);
  const typingStopRef = useRef(null);
  const lastTypingSignalRef = useRef(0);
  const preview = useMemo(() => attachment ? URL.createObjectURL(attachment) : null, [attachment]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pingPresence = useCallback(() => {
    apiRequest('/messagerie/presence', { method: 'POST', token }).catch(() => null);
  }, [token]);

  useEffect(() => {
    pingPresence();
    const timer = window.setInterval(pingPresence, 25_000);
    return () => window.clearInterval(timer);
  }, [pingPresence]);

  const loadConversations = useCallback(async (silent = false) => {
    try {
      const response = await apiRequest('/messagerie/conversations', { token });
      setConversations(response.donnees || []);
      if (!silent) setError('');
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversations();
    const timer = window.setInterval(() => loadConversations(true), 15_000);
    return () => window.clearInterval(timer);
  }, [loadConversations]);

  const loadMessages = useCallback(async (conversation, silent = false) => {
    if (!conversation) return;
    if (!silent) setLoadingMessages(true);
    try {
      const response = await apiRequest(`/messagerie/conversations/${conversation.code_conversation}/messages`, { token });
      setMessages(response.donnees || []);
      setConversations((current) => current.map((item) => item.code_conversation === conversation.code_conversation ? { ...item, non_lus: 0 } : item));
      if (!silent) setError('');
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [token]);

  const loadChatState = useCallback(async (conversation) => {
    if (!conversation) return;
    try {
      const response = await apiRequest(`/messagerie/conversations/${conversation.code_conversation}/etat`, { token });
      setChatState(response.donnees || {});
    } catch {
      setChatState({});
    }
  }, [token]);

  useEffect(() => {
    if (!active) return undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMessages(active);
    loadChatState(active);
    const messagesTimer = window.setInterval(() => loadMessages(active, true), 5_000);
    const stateTimer = window.setInterval(() => loadChatState(active), 2_000);
    return () => {
      window.clearInterval(messagesTimer);
      window.clearInterval(stateTimer);
    };
  }, [active, loadChatState, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, chatState.est_en_train_ecrire]);

  useEffect(() => {
    if (!newChat) return undefined;
    const timer = window.setTimeout(() => {
      apiRequest(`/messagerie/contacts?recherche=${encodeURIComponent(contactSearch)}`, { token })
        .then((response) => setContacts(response.donnees || []))
        .catch((err) => setError(err.message));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [contactSearch, newChat, token]);

  const sendTypingState = useCallback((conversation, actif) => {
    if (!conversation) return;
    apiRequest(`/messagerie/conversations/${conversation.code_conversation}/saisie`, {
      method: 'POST',
      token,
      body: { actif },
    }).catch(() => null);
  }, [token]);

  useEffect(() => () => {
    window.clearTimeout(typingStopRef.current);
    if (active) sendTypingState(active, false);
  }, [active, sendTypingState]);

  function chooseConversation(conversation) {
    setActive(conversation);
    setChatState({
      est_en_ligne: conversation.est_en_ligne,
      bloque_par_moi: conversation.bloque_par_moi,
      je_suis_bloque: conversation.je_suis_bloque,
      relation_acceptee: conversation.relation_acceptee,
    });
    setConversationMenu(false);
    setText('');
    setAttachment(null);
    setAttachmentMenu(false);
  }

  function updateText(value) {
    setText(value);
    if (!active) return;
    window.clearTimeout(typingStopRef.current);
    if (!value.trim()) {
      sendTypingState(active, false);
      lastTypingSignalRef.current = 0;
      return;
    }
    const now = Date.now();
    if (now - lastTypingSignalRef.current > 1_800) {
      sendTypingState(active, true);
      lastTypingSignalRef.current = now;
    }
    typingStopRef.current = window.setTimeout(() => {
      sendTypingState(active, false);
      lastTypingSignalRef.current = 0;
    }, 2_800);
  }

  async function chooseContact(contact) {
    try {
      const response = await apiRequest('/messagerie/conversations', {
        method: 'POST',
        token,
        body: { codeDestinataire: contact.code_utilisateur },
      });
      await loadConversations();
      chooseConversation({ ...contact, code_conversation: response.donnees.code_conversation });
      setNewChat(false);
      setContactSearch('');
    } catch (err) { setError(err.message); }
  }

  async function send(event) {
    event.preventDefault();
    if (!active || (!text.trim() && !attachment) || isBlocked) return;
    setSending(true);
    try {
      let media = null;
      if (attachment) media = (await uploadFile(mediaEndpoint(attachment), attachment, token)).donnees;
      await apiRequest(`/messagerie/conversations/${active.code_conversation}/messages`, {
        method: 'POST',
        token,
        body: {
          contenu: text.trim() || null,
          urlMedia: media?.url || null,
          typeMedia: media ? mediaType(attachment) : null,
          nomMedia: media?.nom || null,
          typeMime: media?.typeMime || null,
          tailleOctets: media?.tailleOctets || null,
          dureeEphemere: ephemeralDuration,
        },
      });
      sendTypingState(active, false);
      lastTypingSignalRef.current = 0;
      setText('');
      setAttachment(null);
      await loadMessages(active, true);
      await loadConversations(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function toggleBlock() {
    if (!active?.code_utilisateur) return;
    const willBlock = !chatState.bloque_par_moi;
    if (willBlock && !window.confirm(`Bloquer ${active.nom_affichage} ? Cette personne ne pourra plus vous écrire.`)) return;
    try {
      await apiRequest(`/messagerie/contacts/${active.code_utilisateur}/blocage`, {
        method: 'PATCH',
        token,
        body: { bloque: willBlock },
      });
      setChatState((current) => ({ ...current, bloque_par_moi: willBlock ? 1 : 0 }));
      setConversationMenu(false);
      if (willBlock) {
        updateText('');
        setAttachment(null);
      }
      await loadConversations(true);
    } catch (err) { setError(err.message); }
  }

  function cycleEphemeralDuration() {
    const currentIndex = ephemeralOptions.findIndex((option) => option.value === ephemeralDuration);
    setEphemeralDuration(ephemeralOptions[(currentIndex + 1) % ephemeralOptions.length].value);
  }

  const relationMissing = chatState.relation_acceptee === 0 || active?.relation_acceptee === 0;
  const isBlocked = Boolean(chatState.bloque_par_moi || chatState.je_suis_bloque || relationMissing);
  const isOnline = Boolean(chatState.est_en_ligne);
  const isTyping = Boolean(chatState.est_en_train_ecrire);
  const selectedEphemeral = ephemeralOptions.find((option) => option.value === ephemeralDuration) || ephemeralOptions[0];

  return (
    <div className="messages-page">
      <DashboardPageHeader
        title="Messages"
        description="Discutez en direct avec les membres et établissements de CampusHub."
        actions={<button className="button" onClick={() => setNewChat(true)}><Plus />Nouveau message</button>}
      />
      {error && <div className="alert alert--error">{error}</div>}
      <section className={`messenger app-panel ${active ? 'messenger--conversation-open' : ''}`}>
        <aside className="messenger-list">
          <div className="messenger-list__heading"><div><MessageCircle /><strong>Discussions</strong></div><button onClick={() => setNewChat(true)} aria-label="Nouvelle discussion"><Plus /></button></div>
          {loading ? <div className="content-loading"><Spinner /></div> : conversations.length ? conversations.map((item) => (
            <button key={item.code_conversation} className={active?.code_conversation === item.code_conversation ? 'active' : ''} onClick={() => chooseConversation(item)}>
              <Avatar contact={item} online={item.est_en_ligne} />
              <div><strong>{item.nom_affichage || 'Conversation'}</strong><p>{item.dernier_message || 'Démarrez la discussion'}</p></div>
              <small>{hour(item.date_dernier_message)}{Number(item.non_lus) > 0 && <i>{item.non_lus}</i>}</small>
            </button>
          )) : <div className="messenger-empty"><MessageCircle /><strong>Aucune discussion</strong><p>Envoyez votre premier message à un membre de CampusHub.</p><button className="button button--small" onClick={() => setNewChat(true)}>Commencer</button></div>}
        </aside>

        <div className="messenger-chat">
          {active ? <>
            <header className="messenger-chat-header">
              <button className="messenger-back" onClick={() => setActive(null)} aria-label="Retour aux discussions"><ArrowLeft /></button>
              <Avatar contact={active} online={isOnline} />
              <div className="messenger-chat-identity">
                <strong>{active.nom_affichage}</strong>
                <small className={isTyping ? 'messenger-presence messenger-presence--typing' : 'messenger-presence'}>
                  {isTyping ? 'écrit…' : isOnline ? 'En ligne' : roleLabel(active.role)}
                </small>
              </div>
              <div className="messenger-chat-actions">
                <button type="button" onClick={() => setConversationMenu((value) => !value)} aria-label="Options de la conversation"><MoreVertical /></button>
                {conversationMenu && <div className="messenger-chat-menu">
                  <button type="button" onClick={toggleBlock}>{chatState.bloque_par_moi ? <ShieldCheck /> : <Ban />}<span><strong>{chatState.bloque_par_moi ? 'Débloquer' : 'Bloquer'}</strong><small>{chatState.bloque_par_moi ? 'Autoriser de nouveaux messages' : 'Interdire les nouveaux messages'}</small></span></button>
                </div>}
              </div>
            </header>

            {isBlocked && <div className="messenger-blocked-notice"><Ban /><div><strong>{relationMissing ? 'Connexion requise' : 'Conversation protégée'}</strong><p>{relationMissing ? 'Envoyez une demande dans Relations et attendez son acceptation avant d’écrire.' : chatState.bloque_par_moi ? 'Vous avez bloqué ce contact. Débloquez-le pour reprendre la discussion.' : 'La messagerie est indisponible pour cette conversation.'}</p></div>{chatState.bloque_par_moi && !relationMissing && <button type="button" onClick={toggleBlock}>Débloquer</button>}</div>}

            <div className="messenger-messages">
              {loadingMessages ? <div className="content-loading"><Spinner /></div> : messages.length ? messages.map((message) => {
                const mine = message.code_auteur === utilisateur.code_utilisateur;
                return (
                  <div className={`message-bubble ${mine ? 'message-bubble--mine' : ''} ${message.est_ephemere ? 'message-bubble--ephemeral' : ''}`} key={message.code_message}>
                    <MessageMedia message={message} />
                    {message.contenu && <p>{message.contenu}</p>}
                    <small>
                      <span>{hour(message.date_creation)}</span>
                      {Number(message.est_ephemere) === 1 && <em><TimerReset />{expirationLabel(message.date_expiration)}</em>}
                      {mine && <MessageReceipt status={message.statut_reception} />}
                    </small>
                  </div>
                );
              }) : <div className="messenger-conversation-empty"><Users /><h3>Commencez la conversation</h3><p>Envoyez un message, une photo, une vidéo ou un document.</p></div>}
              {isTyping && <div className="messenger-typing-bubble" aria-label={`${active.nom_affichage} écrit`}><i /><i /><i /></div>}
              <div ref={bottomRef} />
            </div>

            {preview && !isBlocked && <div className="message-preview">{mediaType(attachment) === 'IMAGE' ? <img src={preview} alt="Aperçu" /> : mediaType(attachment) === 'VIDEO' ? <video src={preview} muted /> : <div className="message-preview__file"><FileText /><span><strong>{attachment.name}</strong><small>{formatSize(attachment.size)}</small></span></div>}<button type="button" onClick={() => setAttachment(null)} aria-label="Retirer la pièce jointe"><X /></button></div>}
            {!isBlocked ? <form className="messenger-compose" onSubmit={send}>
              <div className="message-attachment-picker"><button type="button" onClick={() => setAttachmentMenu((value) => !value)} title="Joindre un média"><Paperclip /></button>{attachmentMenu && <div className="message-attachment-menu"><label><ImagePlus /><span>Photo</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { setAttachment(event.target.files?.[0] || null); setAttachmentMenu(false); }} /></label><label><Camera /><span>Caméra</span><input type="file" accept="image/*" capture="environment" onChange={(event) => { setAttachment(event.target.files?.[0] || null); setAttachmentMenu(false); }} /></label><label><Video /><span>Vidéo</span><input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => { setAttachment(event.target.files?.[0] || null); setAttachmentMenu(false); }} /></label><label><FileText /><span>Document PDF</span><input type="file" accept="application/pdf" onChange={(event) => { setAttachment(event.target.files?.[0] || null); setAttachmentMenu(false); }} /></label><label><File /><span>Fichier</span><input type="file" accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" onChange={(event) => { setAttachment(event.target.files?.[0] || null); setAttachmentMenu(false); }} /></label></div>}</div>
              <button type="button" className={ephemeralDuration ? 'message-lifespan message-lifespan--active' : 'message-lifespan'} onClick={cycleEphemeralDuration} title="Durée de conservation du message"><Clock3 /><span>{selectedEphemeral.label}</span></button>
              <input value={text} onChange={(event) => updateText(event.target.value)} placeholder="Écrire un message…" />
              <button type="submit" disabled={sending || (!text.trim() && !attachment)} aria-label="Envoyer">{sending ? <Spinner /> : <Send />}</button>
            </form> : <div className="messenger-compose-disabled"><Ban />L’envoi de nouveaux messages est désactivé.</div>}
          </> : <div className="messenger-placeholder"><span><MessageCircle /></span><h2>Vos messages CampusHub</h2><p>Sélectionnez une discussion ou contactez un membre de la communauté.</p><button className="button" onClick={() => setNewChat(true)}><Plus />Nouveau message</button></div>}
        </div>
      </section>

      {newChat && <div className="modal-backdrop" onMouseDown={() => setNewChat(false)}><div className="contact-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><small>Messagerie CampusHub</small><h2>Nouveau message</h2></div><button onClick={() => setNewChat(false)} aria-label="Fermer"><X /></button></header><label><Search /><input autoFocus value={contactSearch} onChange={(event) => setContactSearch(event.target.value)} placeholder="Rechercher une personne ou un établissement…" /></label><div className="contact-results">{contacts.length ? contacts.map((contact) => <button key={contact.code_utilisateur} onClick={() => chooseContact(contact)}><Avatar contact={contact} online={contact.est_en_ligne} /><div><strong>{contact.nom_affichage}</strong><small>{roleLabel(contact.role)} • {contact.ville || 'CampusHub'}</small></div><Send /></button>) : <div className="messenger-empty"><Search /><p>Aucun contact trouvé.</p></div>}</div></div></div>}
    </div>
  );
}
