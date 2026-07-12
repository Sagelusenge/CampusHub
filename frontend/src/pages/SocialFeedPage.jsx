import {
  Bookmark, Building2, Camera, Heart, ImagePlus, MessageCircle, MoreHorizontal,
  Newspaper, Send, Share2, Sparkles, X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, uploadFile } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { PageShell } from '../components/PageShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const types = ['TOUT', 'PROJET', 'ARTICLE', 'RECHERCHE', 'ANNONCE', 'STAGE'];

function initials(name = 'CampusHub') {
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

function formatDate(value) {
  if (!value) return 'À l’instant';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function SocialFeedPage({ embedded = false }) {
  const { token, estConnecte, utilisateur } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('TOUT');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composer, setComposer] = useState(false);
  const [form, setForm] = useState({ titre: '', contenu: '', type: 'PROJET', etiquettes: '' });
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [liked, setLiked] = useState(new Set());
  const [favorites, setFavorites] = useState(new Set());
  const [openComments, setOpenComments] = useState(null);
  const [details, setDetails] = useState({});
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = filter === 'TOUT' ? '' : `&type=${filter}`;
      const response = await apiRequest(`/publications?page=1&limite=30${query}`);
      setItems(response.donnees || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  useEffect(() => {
    if (!token) return;
    apiRequest('/interactions/favoris', { token }).then((response) => {
      setFavorites(new Set((response.donnees || []).map((item) => item.code_publication)));
    }).catch(() => null);
  }, [token]);

  const preview = useMemo(() => image ? URL.createObjectURL(image) : null, [image]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function publish(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await apiRequest('/publications', {
        method: 'POST', token,
        body: {
          titre: form.titre || null,
          contenu: form.contenu,
          type: form.type,
          etiquettes: form.etiquettes.split(',').map((item) => item.trim()).filter(Boolean),
          publier: true,
        },
      });
      if (image) {
        const uploaded = await uploadFile('/televersements/images', image, token);
        await apiRequest(`/publications/${response.donnees.code_publication}/medias`, {
          method: 'POST', token,
          body: {
            type: 'IMAGE', url: uploaded.donnees.url,
            typeMime: uploaded.donnees.typeMime, tailleOctets: uploaded.donnees.tailleOctets, ordre: 0,
          },
        });
      }
      setForm({ titre: '', contenu: '', type: 'PROJET', etiquettes: '' });
      setImage(null);
      setComposer(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleLike(item) {
    if (!token) return;
    try {
      await apiRequest(`/interactions/publications/${item.code_publication}/jaime`, { method: 'POST', token });
      setLiked((current) => {
        const next = new Set(current);
        if (next.has(item.code_publication)) next.delete(item.code_publication); else next.add(item.code_publication);
        return next;
      });
      setItems((current) => current.map((post) => post.code_publication === item.code_publication
        ? { ...post, nombre_jaime: Math.max(0, Number(post.nombre_jaime) + (liked.has(item.code_publication) ? -1 : 1)) }
        : post));
    } catch (err) { setError(err.message); }
  }

  async function toggleFavorite(item) {
    if (!token) return;
    const active = favorites.has(item.code_publication);
    try {
      await apiRequest(`/interactions/publications/${item.code_publication}/favori`, { method: active ? 'DELETE' : 'POST', token });
      setFavorites((current) => { const next = new Set(current); if (active) next.delete(item.code_publication); else next.add(item.code_publication); return next; });
    } catch (err) { setError(err.message); }
  }

  async function showComments(item) {
    const closing = openComments === item.code_publication;
    setOpenComments(closing ? null : item.code_publication);
    if (!closing && !details[item.code_publication]) {
      try {
        const response = await apiRequest(`/publications/${item.code_publication}`);
        setDetails((current) => ({ ...current, [item.code_publication]: response.donnees }));
      } catch (err) { setError(err.message); }
    }
  }

  async function sendComment(event, item) {
    event.preventDefault();
    if (!comment.trim()) return;
    try {
      await apiRequest(`/publications/${item.code_publication}/commentaires`, { method: 'POST', token, body: { contenu: comment } });
      const response = await apiRequest(`/publications/${item.code_publication}`);
      setDetails((current) => ({ ...current, [item.code_publication]: response.donnees }));
      setItems((current) => current.map((post) => post.code_publication === item.code_publication ? { ...post, nombre_commentaires: Number(post.nombre_commentaires) + 1 } : post));
      setComment('');
    } catch (err) { setError(err.message); }
  }

  async function share(item) {
    const url = `${window.location.origin}/actualites#${item.code_publication}`;
    await navigator.clipboard?.writeText(url);
  }

  const content = <div className={`social-page ${embedded ? 'social-page--embedded' : ''}`}>
    {embedded
      ? <DashboardPageHeader title="Réseau CampusHub" description="Découvrez et partagez les projets de la communauté universitaire." />
      : <section className="social-hero"><div className="container"><span><Sparkles /> Réseau académique congolais</span><h1>Les idées du campus,<br />réunies au même endroit.</h1><p>Projets étudiants, recherches, annonces universitaires et opportunités.</p></div></section>}

    <div className={embedded ? 'social-layout' : 'container social-layout'}>
      <aside className="social-sidebar app-panel">
        <div className="social-sidebar__title"><Newspaper /><div><strong>Fil d’actualité</strong><small>Communauté CampusHub</small></div></div>
        <nav>{types.map((type) => <button key={type} className={filter === type ? 'active' : ''} onClick={() => setFilter(type)}>{type === 'TOUT' ? 'Toutes les publications' : type}</button>)}</nav>
        {!estConnecte && <div className="social-join"><Building2 /><strong>Rejoignez la discussion</strong><p>Connectez-vous pour publier, aimer et commenter.</p><Link className="button button--full" to="/connexion">Se connecter</Link></div>}
      </aside>

      <main className="social-feed">
        {estConnecte && <button className="social-composer-trigger app-panel" onClick={() => setComposer(true)}>
          <span>{initials(utilisateur?.nom_affichage)}</span><div>Partagez une idée, un projet ou une actualité…</div><ImagePlus />
        </button>}
        {error && <div className="alert alert--error">{error}</div>}
        {loading ? <div className="content-loading app-panel"><Spinner />Chargement du fil…</div> : items.length ? items.map((item) => {
          const comments = details[item.code_publication]?.commentaires || [];
          const commentsOpen = openComments === item.code_publication;
          return <article className="social-post app-panel" key={item.code_publication} id={item.code_publication}>
            <header><span className="social-avatar">{initials(item.nom_auteur)}</span><div><strong>{item.nom_auteur}</strong><small>{item.nom_universite || 'Communauté CampusHub'} · {formatDate(item.date_publication)}</small></div><button aria-label="Options"><MoreHorizontal /></button></header>
            <div className="social-post__body"><span className="social-post__type">{item.type_publication}</span>{item.titre && <h2>{item.titre}</h2>}<p>{item.contenu}</p>{Array.isArray(item.etiquettes) && <div className="social-tags">{item.etiquettes.map((tag) => <span key={tag}>#{tag}</span>)}</div>}</div>
            {item.url_media && <img className="social-post__media" src={item.url_media} alt={item.titre || 'Média de la publication'} />}
            <div className="social-post__counts"><span>{item.nombre_jaime || 0} appréciation(s)</span><span>{item.nombre_commentaires || 0} commentaire(s)</span></div>
            <footer>
              {estConnecte ? <button className={liked.has(item.code_publication) ? 'active' : ''} onClick={() => toggleLike(item)}><Heart />J’aime</button> : <Link to="/connexion"><Heart />J’aime</Link>}
              <button onClick={() => showComments(item)}><MessageCircle />Commenter</button>
              {estConnecte && <button className={favorites.has(item.code_publication) ? 'active' : ''} onClick={() => toggleFavorite(item)}><Bookmark />Enregistrer</button>}
              <button onClick={() => share(item)}><Share2 />Partager</button>
            </footer>
            {commentsOpen && <div className="social-comments">
              {details[item.code_publication] ? comments.length ? comments.map((entry) => <div className="social-comment" key={entry.code_commentaire}><span>{initials(entry.nom_auteur)}</span><div><strong>{entry.nom_auteur}</strong><p>{entry.contenu}</p><small>{formatDate(entry.date_creation)}</small></div></div>) : <p className="social-comments__empty">Soyez le premier à commenter.</p> : <div className="content-loading"><Spinner /></div>}
              {estConnecte && <form onSubmit={(event) => sendComment(event, item)}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Écrire un commentaire…" /><button aria-label="Envoyer"><Send /></button></form>}
            </div>}
          </article>;
        }) : <div className="management-empty app-panel"><Newspaper /><h3>Aucune publication</h3><p>Le fil sera alimenté par les étudiants et les universités.</p></div>}
      </main>

      <aside className="social-rightbar app-panel"><span>À propos du réseau</span><h3>Une communauté académique vérifiée.</h3><p>Les affiliations étudiantes sont confirmées par les universités afin de favoriser des échanges fiables.</p><div><strong>Publiez utile</strong><small>Projets, recherches, stages et annonces académiques.</small></div><div><strong>Restez respectueux</strong><small>Les contenus peuvent être signalés et modérés.</small></div></aside>
    </div>

    {composer && <div className="modal-backdrop" onMouseDown={() => setComposer(false)}><form className="social-composer" onSubmit={publish} onMouseDown={(event) => event.stopPropagation()}>
      <header><div><small>Réseau CampusHub</small><h2>Créer une publication</h2></div><button type="button" onClick={() => setComposer(false)}><X /></button></header>
      <label><span>Type de publication</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{types.slice(1).concat('AUTRE').map((type) => <option key={type}>{type}</option>)}</select></label>
      <input className="social-composer__title" value={form.titre} onChange={(event) => setForm({ ...form, titre: event.target.value })} placeholder="Titre de votre publication" />
      <textarea required minLength="1" maxLength="30000" rows="7" value={form.contenu} onChange={(event) => setForm({ ...form, contenu: event.target.value })} placeholder="Que souhaitez-vous partager avec la communauté ?" />
      <input value={form.etiquettes} onChange={(event) => setForm({ ...form, etiquettes: event.target.value })} placeholder="Étiquettes séparées par des virgules" />
      {preview && <div className="social-image-preview"><img src={preview} alt="Aperçu" /><button type="button" onClick={() => setImage(null)}><X /></button></div>}
      <div className="social-composer__actions"><label className="image-picker"><Camera />Ajouter une photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] || null)} /></label><button className="button" disabled={saving || !form.contenu.trim()}>{saving ? <Spinner /> : <><Send />Publier</>}</button></div>
    </form></div>}
  </div>;

  return embedded ? content : <PageShell>{content}</PageShell>;
}
