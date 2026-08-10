import {
  Bookmark,
  Building2,
  Camera,
  ChevronLeft,
  ChevronRight,
  Heart,
  ImagePlus,
  MessageCircle,
  MoreHorizontal,
  Newspaper,
  Plus,
  Search,
  Send,
  Share2,
  Repeat2,
  Trash2,
  UserCheck,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, uploadFile } from "../api/client.js";
import { DashboardPageHeader } from "../components/DashboardShell.jsx";
import { SocialNavigation } from "../components/SocialNavigation.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const types = ["TOUT", "PROJET", "ARTICLE", "RECHERCHE", "ANNONCE", "STAGE"];
const initials = (name = "CampusHub") =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const formatDate = (value) =>
  !value
    ? "À l’instant"
    : new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value));
const publicationImage = (url) =>
  !url || url.includes("exemple.test") ? "/images/projet-agritech.webp" : url;

export function SocialFeedPage({ embedded = false, initialFilter = "TOUT" }) {
  const { token, utilisateur } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState(initialFilter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reposting, setReposting] = useState("");
  const [composer, setComposer] = useState(false);
  const [form, setForm] = useState({
    titre: "",
    contenu: "",
    type: "PROJET",
    etiquettes: "",
  });
  const [media, setMedia] = useState(null);
  const [saving, setSaving] = useState(false);
  const [liked, setLiked] = useState(new Set());
  const [favorites, setFavorites] = useState(new Set());
  const [following, setFollowing] = useState(new Set());
  const [openComments, setOpenComments] = useState(null);
  const [details, setDetails] = useState({});
  const [drafts, setDrafts] = useState({});
  const [replying, setReplying] = useState(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [stories, setStories] = useState([]);
  const [storyIndex, setStoryIndex] = useState(null);
  const [storyComposer, setStoryComposer] = useState(false);
  const [storyFile, setStoryFile] = useState(null);
  const [storyText, setStoryText] = useState("");
  const [storySaving, setStorySaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response =
        filter === "TOUT"
          ? await apiRequest("/recherche/recommandations", { token })
          : await apiRequest(`/publications?page=1&limite=30&type=${filter}`);
      setItems(response.donnees || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, token]);
  const loadStories = useCallback(async () => {
    try {
      setStories((await apiRequest("/stories", { token })).donnees || []);
    } catch {
      setStories([]);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStories();
  }, [loadStories]);
  useEffect(() => {
    apiRequest("/interactions/favoris", { token })
      .then((response) =>
        setFavorites(
          new Set(
            (response.donnees || []).map((item) => item.code_publication),
          ),
        ),
      )
      .catch(() => null);
    apiRequest("/interactions/universites-suivies", { token })
      .then((response) =>
        setFollowing(
          new Set((response.donnees || []).map((item) => item.code_universite)),
        ),
      )
      .catch(() => null);
  }, [token]);

  const preview = useMemo(
    () => (media ? URL.createObjectURL(media) : null),
    [media],
  );
  const storyPreview = useMemo(
    () => (storyFile ? URL.createObjectURL(storyFile) : null),
    [storyFile],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(
    () => () => {
      if (storyPreview) URL.revokeObjectURL(storyPreview);
    },
    [storyPreview],
  );

  async function runSearch(event) {
    event.preventDefault();
    if (search.trim().length < 2) {
      setSearchResults(null);
      await load();
      return;
    }
    setSearching(true);
    try {
      const response = await apiRequest(
        `/recherche/globale?q=${encodeURIComponent(search.trim())}`,
        { token },
      );
      setSearchResults(response.donnees);
      setItems(response.donnees.publications || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }
  async function publish(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await apiRequest("/publications", {
        method: "POST",
        token,
        body: {
          titre: form.titre || null,
          contenu: form.contenu,
          type: form.type,
          etiquettes: form.etiquettes
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          publier: true,
        },
      });
      if (media) {
        const uploaded = await uploadFile(
          "/televersements/medias",
          media,
          token,
        );
        await apiRequest(
          `/publications/${response.donnees.code_publication}/medias`,
          {
            method: "POST",
            token,
            body: {
              type: media.type.startsWith("video/") ? "VIDEO" : "IMAGE",
              url: uploaded.donnees.url,
              typeMime: uploaded.donnees.typeMime,
              tailleOctets: uploaded.donnees.tailleOctets,
              ordre: 0,
            },
          },
        );
      }
      setForm({ titre: "", contenu: "", type: "PROJET", etiquettes: "" });
      setMedia(null);
      setComposer(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  async function createStory(event) {
    event.preventDefault();
    if (!storyFile) return;
    setStorySaving(true);
    try {
      const uploaded = await uploadFile(
        "/televersements/images",
        storyFile,
        token,
      );
      await apiRequest("/stories", {
        method: "POST",
        token,
        body: {
          typeMedia: "IMAGE",
          urlMedia: uploaded.donnees.url,
          texte: storyText || null,
        },
      });
      setStoryFile(null);
      setStoryText("");
      setStoryComposer(false);
      await loadStories();
    } catch (err) {
      setError(err.message);
    } finally {
      setStorySaving(false);
    }
  }
  async function openStory(index) {
    setStoryIndex(index);
    const story = stories[index];
    if (!story.deja_vue) {
      apiRequest(`/stories/${story.code_story}/vue`, {
        method: "POST",
        token,
      }).catch(() => null);
      setStories((current) =>
        current.map((item, position) =>
          position === index ? { ...item, deja_vue: 1 } : item,
        ),
      );
    }
  }
  async function deleteStory() {
    const story = stories[storyIndex];
    await apiRequest(`/stories/${story.code_story}`, {
      method: "DELETE",
      token,
    });
    setStoryIndex(null);
    await loadStories();
  }
  async function toggleLike(item) {
    try {
      await apiRequest(
        `/interactions/publications/${item.code_publication}/jaime`,
        { method: "POST", token },
      );
      const active = liked.has(item.code_publication);
      setLiked((current) => {
        const next = new Set(current);
        active
          ? next.delete(item.code_publication)
          : next.add(item.code_publication);
        return next;
      });
      setItems((current) =>
        current.map((post) =>
          post.code_publication === item.code_publication
            ? {
                ...post,
                nombre_jaime: Math.max(
                  0,
                  Number(post.nombre_jaime) + (active ? -1 : 1),
                ),
              }
            : post,
        ),
      );
    } catch (err) {
      setError(err.message);
    }
  }
  async function toggleFavorite(item) {
    const active = favorites.has(item.code_publication);
    try {
      await apiRequest(
        `/interactions/publications/${item.code_publication}/favori`,
        { method: active ? "DELETE" : "POST", token },
      );
      setFavorites((current) => {
        const next = new Set(current);
        active
          ? next.delete(item.code_publication)
          : next.add(item.code_publication);
        return next;
      });
    } catch (err) {
      setError(err.message);
    }
  }
  async function toggleFollow(code) {
    const active = following.has(code);
    try {
      await apiRequest(`/interactions/universites/${code}/suivre`, {
        method: active ? "DELETE" : "POST",
        token,
      });
      setFollowing((current) => {
        const next = new Set(current);
        active ? next.delete(code) : next.add(code);
        return next;
      });
    } catch (err) {
      setError(err.message);
    }
  }
  async function showComments(item) {
    const closing = openComments === item.code_publication;
    setOpenComments(closing ? null : item.code_publication);
    if (!closing && !details[item.code_publication])
      await refreshComments(item.code_publication);
  }
  async function refreshComments(code) {
    try {
      const response = await apiRequest(`/publications/${code}`);
      setDetails((current) => ({ ...current, [code]: response.donnees }));
    } catch (err) {
      setError(err.message);
    }
  }
  async function sendComment(event, item, parentCode = null) {
    event.preventDefault();
    const key = parentCode || item.code_publication;
    const content = drafts[key]?.trim();
    if (!content) return;
    try {
      await apiRequest(`/publications/${item.code_publication}/commentaires`, {
        method: "POST",
        token,
        body: {
          contenu: content,
          ...(parentCode ? { codeCommentaireParent: parentCode } : {}),
        },
      });
      setDrafts((current) => ({ ...current, [key]: "" }));
      setReplying(null);
      await refreshComments(item.code_publication);
      setItems((current) =>
        current.map((post) =>
          post.code_publication === item.code_publication
            ? {
                ...post,
                nombre_commentaires: Number(post.nombre_commentaires) + 1,
              }
            : post,
        ),
      );
    } catch (err) {
      setError(err.message);
    }
  }
  async function share(item) {
    await navigator.clipboard?.writeText(
      `${window.location.origin}/reseau#${item.code_publication}`,
    );
  }
  async function repost(item) {
    setReposting(item.code_publication);
    setError("");
    setMessage("");
    try {
      await apiRequest(
        `/interactions/publications/${item.code_publication}/reposter`,
        { method: "POST", token },
      );
      setMessage(
        "Publication republiée dans votre fil avec sa photo et sa source.",
      );
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setReposting("");
    }
  }

  function commentsFor(item) {
    const comments = details[item.code_publication]?.commentaires || [];
    const roots = comments.filter((entry) => !entry.commentaire_parent_id);
    return (
      <div className="social-comments">
        {roots.length ? (
          roots.map((entry) => (
            <CommentThread
              key={entry.code_commentaire}
              entry={entry}
              replies={comments.filter(
                (reply) =>
                  Number(reply.commentaire_parent_id) ===
                  Number(entry.id_commentaire),
              )}
              replying={replying}
              onReply={() =>
                setReplying({
                  post: item.code_publication,
                  code: entry.code_commentaire,
                  name: entry.nom_auteur,
                })
              }
              draft={drafts[entry.code_commentaire] || ""}
              setDraft={(value) =>
                setDrafts((current) => ({
                  ...current,
                  [entry.code_commentaire]: value,
                }))
              }
              send={(event) => sendComment(event, item, entry.code_commentaire)}
            />
          ))
        ) : (
          <p className="social-comments__empty">
            Soyez le premier à commenter.
          </p>
        )}
        <form
          className="social-comment-form"
          onSubmit={(event) => sendComment(event, item)}
        >
          <span>
            <ProfileAvatar
              name={utilisateur?.nom_affichage}
              url={utilisateur?.url_photo_profil}
            />
          </span>
          <input
            value={drafts[item.code_publication] || ""}
            onChange={(event) =>
              setDrafts((current) => ({
                ...current,
                [item.code_publication]: event.target.value,
              }))
            }
            placeholder="Écrire un commentaire…"
          />
          <button aria-label="Envoyer">
            <Send />
          </button>
        </form>
      </div>
    );
  }

  const chemins =
    utilisateur?.role === "UNIVERSITE"
      ? { relations: "/relations", chat: "/espace-universite/messages" }
      : utilisateur?.role === "ETUDIANT"
        ? { relations: "/relations", chat: "/espace-etudiant/messages" }
        : { relations: "/relations", chat: "/chat" };
  const canPublish = utilisateur?.role !== "VISITEUR";
  const content = (
    <div
      className={`social-page social-page--modern ${embedded ? "social-page--embedded" : "social-page--facebook"}`}
    >
      {embedded && (
        <>
          <SocialNavigation embedded />
          <DashboardPageHeader
            title="Réseau CampusHub"
            description="Stories, projets et conversations de la communauté académique."
          />
        </>
      )}
      <div
        className={
          embedded
            ? "social-layout social-layout--feed"
            : "container social-layout social-layout--feed"
        }
      >
        <main className="social-feed">
          <section className="stories app-panel">
            {canPublish && (
              <button
                className="story-add"
                onClick={() => setStoryComposer(true)}
              >
                <span>
                  <Plus />
                </span>
                <strong>Votre story</strong>
              </button>
            )}
            {stories.map((story, index) => (
              <button
                className={`story-ring ${story.deja_vue ? "story-ring--seen" : ""}`}
                key={story.code_story}
                onClick={() => openStory(index)}
              >
                <span>
                  <img src={story.url_photo_profil || story.url_media} alt="" />
                </span>
                <strong>{story.nom_auteur.split(" ")[0]}</strong>
              </button>
            ))}
          </section>
          <nav
            className="social-feed-filters app-panel"
            aria-label="Filtrer le fil"
          >
            {types.map((type) => (
              <button
                key={type}
                className={filter === type ? "active" : ""}
                onClick={() => setFilter(type)}
              >
                {type === "TOUT" ? "Pour vous" : type}
              </button>
            ))}
          </nav>
          <form className="social-smart-search app-panel" onSubmit={runSearch}>
            <Search />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher sur CampusHub…"
            />
            <button disabled={searching}>
              {searching ? <Spinner /> : "Rechercher"}
            </button>
          </form>
          {searchResults && (
            <SearchResults
              results={searchResults}
              query={search}
              close={() => {
                setSearch("");
                setSearchResults(null);
                load();
              }}
            />
          )}
          {canPublish && (
            <button
              className="social-composer-trigger app-panel"
              onClick={() => setComposer(true)}
            >
              <span>
                <ProfileAvatar
                  name={utilisateur?.nom_affichage}
                  url={utilisateur?.url_photo_profil}
                />
              </span>
              <div>
                Quoi de neuf, {utilisateur?.nom_affichage?.split(" ")[0]} ?
              </div>
              <ImagePlus />
            </button>
          )}
          {message && <div className="alert alert--success">{message}</div>}
          {error && <div className="alert alert--error">{error}</div>}
          {loading ? (
            <div className="content-loading app-panel">
              <Spinner />
              Chargement du fil…
            </div>
          ) : items.length ? (
            items.map((item) => (
              <article
                className="social-post app-panel"
                key={item.code_publication}
                id={item.code_publication}
              >
                <header>
                  <span className="social-avatar">
                    <ProfileAvatar
                      name={item.nom_auteur}
                      url={item.photo_auteur}
                    />
                  </span>
                  <div>
                    <strong>{item.nom_auteur}</strong>
                    <small>
                      {item.nom_universite || "Communauté CampusHub"} ·{" "}
                      {formatDate(item.date_publication)}
                    </small>
                  </div>
                  {item.code_universite ? (
                    <button
                      className="social-follow"
                      onClick={() => toggleFollow(item.code_universite)}
                    >
                      {following.has(item.code_universite) ? (
                        <UserCheck />
                      ) : (
                        <UserPlus />
                      )}
                      <span>
                        {following.has(item.code_universite)
                          ? "Suivie"
                          : "Suivre"}
                      </span>
                    </button>
                  ) : (
                    <button aria-label="Options">
                      <MoreHorizontal />
                    </button>
                  )}
                </header>
                {(item.code_publication_source || item.code_offre_source) && (
                  <div className="social-repost-source">
                    <Repeat2 />
                    <span>
                      <strong>Republication</strong>
                      <small>
                        {item.code_offre_source
                          ? item.nom_etablissement_source
                          : "Publication de la communauté"}
                      </small>
                    </span>
                    {item.code_offre_source && (
                      <Link to={`/offres/${item.code_offre_source}`}>
                        Voir l’offre originale
                      </Link>
                    )}
                  </div>
                )}
                <div className="social-post__body">
                  <span className="social-post__type">
                    {item.type_publication}
                  </span>
                  {item.titre && <h2>{item.titre}</h2>}
                  <p>{item.contenu}</p>
                  {Array.isArray(item.etiquettes) && (
                    <div className="social-tags">
                      {item.etiquettes.map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                {item.url_media && (
                  item.type_media === "VIDEO" ? (
                    <video
                      className="social-post__media social-post__video"
                      src={item.url_media}
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <img
                      className="social-post__media"
                      src={publicationImage(item.url_media)}
                      alt={item.titre || "Média de la publication"}
                    />
                  )
                )}
                <div className="social-post__counts">
                  <span>{item.nombre_jaime || 0} appréciation(s)</span>
                  <span>{item.nombre_commentaires || 0} commentaire(s)</span>
                </div>
                <footer>
                  <button
                    className={liked.has(item.code_publication) ? "active" : ""}
                    onClick={() => toggleLike(item)}
                  >
                    <Heart />
                    J’aime
                  </button>
                  <button onClick={() => showComments(item)}>
                    <MessageCircle />
                    Commenter
                  </button>
                  <button
                    className={
                      favorites.has(item.code_publication) ? "active" : ""
                    }
                    onClick={() => toggleFavorite(item)}
                  >
                    <Bookmark />
                    Enregistrer
                  </button>
                  {canPublish && (
                    <button
                      onClick={() => repost(item)}
                      disabled={reposting === item.code_publication}
                    >
                      {reposting === item.code_publication ? (
                        <Spinner />
                      ) : (
                        <Repeat2 />
                      )}
                      Republier
                    </button>
                  )}
                  <button onClick={() => share(item)}>
                    <Share2 />
                    Partager
                  </button>
                </footer>
                {openComments === item.code_publication &&
                  (details[item.code_publication] ? (
                    commentsFor(item)
                  ) : (
                    <div className="content-loading">
                      <Spinner />
                    </div>
                  ))}
              </article>
            ))
          ) : (
            <div className="management-empty app-panel">
              <Newspaper />
              <h3>Aucune publication</h3>
              <p>Partagez la première actualité de votre réseau.</p>
            </div>
          )}
        </main>
        <aside className="social-rightbar app-panel">
          <span>Votre réseau</span>
          <h3>Des échanges utiles et authentiques.</h3>
          <p>
            Ajoutez des étudiants à vos relations et poursuivez vos échanges
            dans le chat CampusHub.
          </p>
          <Link
            className="button button--full button--small"
            to={chemins.relations}
          >
            <UserPlus />
            Trouver des relations
          </Link>
          <Link
            className="secondary-action social-rightbar__chat"
            to={chemins.chat}
          >
            <MessageCircle />
            Ouvrir le chat
          </Link>
          <div>
            <strong>Stories et publications</strong>
            <small>
              Partagez les moments et projets de la communauté académique.
            </small>
          </div>
        </aside>
      </div>
      {canPublish && composer && (
        <PublicationComposer
          form={form}
          setForm={setForm}
          media={media}
          setMedia={setMedia}
          preview={preview}
          saving={saving}
          close={() => setComposer(false)}
          submit={publish}
        />
      )}
      {canPublish && storyComposer && (
        <StoryComposer
          file={storyFile}
          setFile={setStoryFile}
          preview={storyPreview}
          text={storyText}
          setText={setStoryText}
          saving={storySaving}
          close={() => setStoryComposer(false)}
          submit={createStory}
        />
      )}
      {storyIndex !== null && stories[storyIndex] && (
        <StoryViewer
          story={stories[storyIndex]}
          mine={
            stories[storyIndex].code_auteur === utilisateur?.code_utilisateur
          }
          previous={() => setStoryIndex((value) => Math.max(0, value - 1))}
          next={() =>
            setStoryIndex((value) => Math.min(stories.length - 1, value + 1))
          }
          close={() => setStoryIndex(null)}
          remove={deleteStory}
          hasPrevious={storyIndex > 0}
          hasNext={storyIndex < stories.length - 1}
        />
      )}
    </div>
  );
  return content;
}

function ProfileAvatar({ name, url }) {
  return url ? (
    <img src={url} alt={`Photo de ${name || "profil"}`} />
  ) : (
    initials(name)
  );
}
function CommentThread({
  entry,
  replies,
  replying,
  onReply,
  draft,
  setDraft,
  send,
}) {
  const active = replying?.code === entry.code_commentaire;
  return (
    <div className="comment-thread">
      <div className="social-comment">
        <span>
          <ProfileAvatar name={entry.nom_auteur} url={entry.url_photo_profil} />
        </span>
        <div>
          <strong>{entry.nom_auteur}</strong>
          <p>{entry.contenu}</p>
          <small>
            {formatDate(entry.date_creation)}{" "}
            <button onClick={onReply}>Répondre</button>
          </small>
        </div>
      </div>
      {replies.map((reply) => (
        <div
          className="social-comment social-comment--reply"
          key={reply.code_commentaire}
        >
          <span>
            <ProfileAvatar
              name={reply.nom_auteur}
              url={reply.url_photo_profil}
            />
          </span>
          <div>
            <strong>{reply.nom_auteur}</strong>
            <p>{reply.contenu}</p>
            <small>{formatDate(reply.date_creation)}</small>
          </div>
        </div>
      ))}
      {active && (
        <form className="social-reply-form" onSubmit={send}>
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Répondre à ${entry.nom_auteur}…`}
          />
          <button>
            <Send />
          </button>
        </form>
      )}
    </div>
  );
}
function SearchResults({ results, query, close }) {
  return (
    <div className="social-search-results app-panel">
      <header>
        <div>
          <strong>{results.total} résultat(s)</strong>
          <small>
            Termes reconnus :{" "}
            {(results.termesReconnus || []).join(", ") || query}
          </small>
        </div>
        <button onClick={close}>
          <X />
        </button>
      </header>
      {results.universites?.length > 0 && (
        <div>
          <span>Établissements</span>
          {results.universites.slice(0, 4).map((entry) => (
            <Link
              key={entry.code_universite}
              to={`/universites/${entry.code_universite}`}
            >
              <Building2 />
              <div>
                <strong>{entry.nom}</strong>
                <small>{entry.ville || entry.province}</small>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
function PublicationComposer({
  form,
  setForm,
  media,
  setMedia,
  preview,
  saving,
  close,
  submit,
}) {
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <form
        className="social-composer"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <small>Réseau CampusHub</small>
            <h2>Créer une publication</h2>
          </div>
          <button type="button" onClick={close}>
            <X />
          </button>
        </header>
        <label>
          <span>Type de publication</span>
          <select
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
          >
            {types
              .slice(1)
              .concat("AUTRE")
              .map((type) => (
                <option key={type}>{type}</option>
              ))}
          </select>
        </label>
        <input
          className="social-composer__title"
          value={form.titre}
          onChange={(event) => setForm({ ...form, titre: event.target.value })}
          placeholder="Titre de votre publication"
        />
        <textarea
          required
          maxLength="30000"
          rows="7"
          value={form.contenu}
          onChange={(event) =>
            setForm({ ...form, contenu: event.target.value })
          }
          placeholder="Que souhaitez-vous partager ?"
        />
        <input
          value={form.etiquettes}
          onChange={(event) =>
            setForm({ ...form, etiquettes: event.target.value })
          }
          placeholder="Étiquettes séparées par des virgules"
        />
        {preview && (
          <div className="social-image-preview">
            {media?.type?.startsWith("video/") ? (
              <video src={preview} controls muted />
            ) : (
              <img src={preview} alt="Aperçu" />
            )}
            <button type="button" onClick={() => setMedia(null)}>
              <X />
            </button>
          </div>
        )}
        <div className="social-composer__actions">
          <label className="image-picker">
            {media?.type?.startsWith("video/") ? <Video /> : <Camera />}
            Ajouter une photo ou vidéo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
              onChange={(event) => setMedia(event.target.files?.[0] || null)}
            />
          </label>
          <button className="button" disabled={saving || !form.contenu.trim()}>
            {saving ? (
              <Spinner />
            ) : (
              <>
                <Send />
                Publier
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
function StoryComposer({
  file,
  setFile,
  preview,
  text,
  setText,
  saving,
  close,
  submit,
}) {
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <form
        className="story-composer"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <small>Visible pendant 24 heures</small>
            <h2>Créer une story</h2>
          </div>
          <button type="button" onClick={close}>
            <X />
          </button>
        </header>
        {preview ? (
          <img src={preview} alt="Aperçu de la story" />
        ) : (
          <label className="story-dropzone">
            <ImagePlus />
            <strong>Choisir une photo</strong>
            <small>JPEG, PNG ou WebP</small>
            <input
              type="file"
              required
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>
        )}
        <textarea
          maxLength="500"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Ajouter une légende…"
        />
        <button className="button button--full" disabled={!file || saving}>
          {saving ? <Spinner /> : "Partager la story"}
        </button>
      </form>
    </div>
  );
}
function StoryViewer({
  story,
  mine,
  previous,
  next,
  close,
  remove,
  hasPrevious,
  hasNext,
}) {
  return (
    <div className="story-viewer">
      <div className="story-viewer__progress">
        <span />
      </div>
      <header>
        <span>{initials(story.nom_auteur)}</span>
        <div>
          <strong>{story.nom_auteur}</strong>
          <small>{formatDate(story.date_creation)}</small>
        </div>
        {mine && (
          <button onClick={remove} aria-label="Supprimer">
            <Trash2 />
          </button>
        )}
        <button onClick={close} aria-label="Fermer">
          <X />
        </button>
      </header>
      <img src={story.url_media} alt={`Story de ${story.nom_auteur}`} />
      {story.texte && <p>{story.texte}</p>}
      {hasPrevious && (
        <button className="story-viewer__previous" onClick={previous}>
          <ChevronLeft />
        </button>
      )}
      {hasNext && (
        <button className="story-viewer__next" onClick={next}>
          <ChevronRight />
        </button>
      )}
    </div>
  );
}
