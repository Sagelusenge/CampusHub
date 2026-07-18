import { ArrowLeft, BriefcaseBusiness, CalendarClock, Download, ExternalLink, FileText, Mail, MapPin, Repeat2, School, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { PageShell } from '../components/PageShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const labels = { INSCRIPTION: 'Inscription', BOURSE: 'Bourse', FORMATION: 'Formation', STAGE: 'Stage', EMPLOI: 'Emploi', EVENEMENT: 'Événement', AUTRE: 'Autre', TOUS: 'Tout public', ETUDIANTS: 'Étudiants', ELEVES: 'Élèves', DIPLOMES: 'Diplômés', PARENTS: 'Parents', PRESENTIEL: 'Présentiel', EN_LIGNE: 'En ligne', HYBRIDE: 'Hybride' };

export function OfferDetailPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { token, estConnecte } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reposting, setReposting] = useState(false);
  useEffect(() => { apiRequest(`/offres/${code}`).then((r) => setItem(r.donnees)).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [code]);
  async function repost() {
    if (!estConnecte) { navigate('/connexion'); return; }
    setReposting(true); setError('');
    try { await apiRequest(`/interactions/offres/${item.code_offre}/reposter`, { method: 'POST', token }); setMessage('L’offre a été republiée dans votre fil CampusHub.'); }
    catch (err) { setError(err.message); }
    finally { setReposting(false); }
  }
  return <PageShell>{loading ? <div className="offer-detail-loading"><Spinner />Chargement…</div> : error && !item ? <section className="section"><div className="container offers-empty"><BriefcaseBusiness /><h1>Offre introuvable</h1><p>{error}</p><Link className="button" to="/offres">Retour aux offres</Link></div></section> : item && <OfferDetail item={item} error={error} message={message} repost={repost} reposting={reposting} />}</PageShell>;
}

function OfferDetail({ item, error, message, repost, reposting }) {
  const [reader, setReader] = useState(false);
  const documentUrl = localDocumentUrl(item.url_document);
  return <>
    <section className="offer-detail-hero">{item.url_image && <img src={item.url_image} alt="" />}<div className="container"><Link to="/offres"><ArrowLeft />Toutes les offres</Link><span>{labels[item.type_offre]}</span><h1>{item.titre}</h1><Link to={`/universites/${item.code_universite}`}>{item.nom_etablissement}</Link></div></section>
    <section className="section offer-detail-section"><div className="container">{message && <div className="alert alert--success">{message}</div>}{error && <div className="alert alert--error">{error}</div>}<div className="offer-detail-layout"><article className="offer-detail-content"><h2>À propos de l’offre</h2><p>{item.description}</p>{item.conditions && <><h2>Conditions et prérequis</h2><p>{item.conditions}</p></>}{item.url_document && <section className="offer-pdf-section"><div><FileText /><span><small>Document de l’offre</small><h2>{item.nom_document || 'Document PDF'}</h2></span><a href={documentUrl} download><Download />Télécharger</a></div><button className="offer-pdf-preview" onClick={() => setReader(true)}><iframe title="Aperçu de la première page" src={`${documentUrl}?apercu=1#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`} tabIndex="-1" /><span><FileText />Cliquer pour lire toutes les pages</span></button></section>}</article><aside className="offer-detail-aside"><h2>Informations pratiques</h2><div><MapPin /><span><small>Lieu</small><strong>{item.ville || 'À préciser'}, {item.province || 'RDC'}</strong></span></div><div><Users /><span><small>Public cible</small><strong>{labels[item.public_cible]}</strong></span></div><div><School /><span><small>Modalité</small><strong>{labels[item.modalite]}</strong></span></div><div><CalendarClock /><span><small>Date limite</small><strong>{item.date_limite ? formatDate(item.date_limite) : 'Aucune date limite'}</strong></span></div>{item.url_candidature ? <a className="button button--full" href={item.url_candidature} target="_blank" rel="noreferrer">Candidater<ExternalLink /></a> : item.email_contact ? <a className="button button--full" href={`mailto:${item.email_contact}?subject=${encodeURIComponent(item.titre)}`}>Contacter l’établissement<Mail /></a> : <Link className="button button--full" to={`/universites/${item.code_universite}`}>Voir l’établissement</Link>}<button className="secondary-action offer-repost" onClick={repost} disabled={reposting}>{reposting ? <Spinner /> : <Repeat2 />}Republier dans mon fil</button></aside></div></div></section>
    {reader && <div className="pdf-reader" role="dialog" aria-modal="true" aria-label="Lecteur du document PDF"><header><div><FileText /><span><strong>{item.nom_document || 'Document PDF'}</strong><small>Utilisez les contrôles pour parcourir toutes les pages.</small></span></div><div><a href={documentUrl} download><Download />Télécharger</a><button onClick={() => setReader(false)} aria-label="Fermer"><X /></button></div></header><iframe title={item.nom_document || 'Document complet'} src={`${documentUrl}?lecture=1#toolbar=1&navpanes=1&view=FitH`} /></div>}
  </>;
}
function formatDate(value) { return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
function localDocumentUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin || url.pathname.startsWith('/uploads/') ? `${url.pathname}${url.search}` : value;
  } catch {
    return value;
  }
}
