import { ArrowLeft, BriefcaseBusiness, CalendarClock, ExternalLink, Mail, MapPin, School, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { PageShell } from '../components/PageShell.jsx';
import { Spinner } from '../components/Spinner.jsx';

const labels = { INSCRIPTION: 'Inscription', BOURSE: 'Bourse', FORMATION: 'Formation', STAGE: 'Stage', EMPLOI: 'Emploi', EVENEMENT: 'Événement', AUTRE: 'Autre', TOUS: 'Tout public', ETUDIANTS: 'Étudiants', ELEVES: 'Élèves', DIPLOMES: 'Diplômés', PARENTS: 'Parents', PRESENTIEL: 'Présentiel', EN_LIGNE: 'En ligne', HYBRIDE: 'Hybride' };

export function OfferDetailPage() {
  const { code } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { apiRequest(`/offres/${code}`).then((r) => setItem(r.donnees)).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [code]);
  return <PageShell>{loading ? <div className="offer-detail-loading"><Spinner />Chargement…</div> : error || !item ? <section className="section"><div className="container offers-empty"><BriefcaseBusiness /><h1>Offre introuvable</h1><p>{error}</p><Link className="button" to="/offres">Retour aux offres</Link></div></section> : <OfferDetail item={item} />}</PageShell>;
}

function OfferDetail({ item }) {
  return <>
    <section className="offer-detail-hero">{item.url_image && <img src={item.url_image} alt="" />}<div className="container"><Link to="/offres"><ArrowLeft />Toutes les offres</Link><span>{labels[item.type_offre]}</span><h1>{item.titre}</h1><Link to={`/universites/${item.code_universite}`}>{item.nom_etablissement}</Link></div></section>
    <section className="section offer-detail-section"><div className="container offer-detail-layout"><article className="offer-detail-content"><h2>À propos de l’offre</h2><p>{item.description}</p>{item.conditions && <><h2>Conditions et prérequis</h2><p>{item.conditions}</p></>}</article><aside className="offer-detail-aside"><h2>Informations pratiques</h2><div><MapPin /><span><small>Lieu</small><strong>{item.ville || 'À préciser'}, {item.province || 'RDC'}</strong></span></div><div><Users /><span><small>Public cible</small><strong>{labels[item.public_cible]}</strong></span></div><div><School /><span><small>Modalité</small><strong>{labels[item.modalite]}</strong></span></div><div><CalendarClock /><span><small>Date limite</small><strong>{item.date_limite ? formatDate(item.date_limite) : 'Aucune date limite'}</strong></span></div>{item.url_candidature ? <a className="button button--full" href={item.url_candidature} target="_blank" rel="noreferrer">Candidater<ExternalLink /></a> : item.email_contact ? <a className="button button--full" href={`mailto:${item.email_contact}?subject=${encodeURIComponent(item.titre)}`}>Contacter l’établissement<Mail /></a> : <Link className="button button--full" to={`/universites/${item.code_universite}`}>Voir l’établissement</Link>}</aside></div></section>
  </>;
}
function formatDate(value) { return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
