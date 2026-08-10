import { ArrowLeft, BadgeCheck, BookOpen, Building2, CalendarCheck, ClipboardList, ExternalLink, Globe2, GraduationCap, Handshake, Mail, MapPin, Phone, School, Users, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { LocationMap } from '../components/LocationMap.jsx';
import { PageShell } from '../components/PageShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const cover = '/images/campus-goma.webp';
const categoryLabels = { UNIVERSITE: 'Université', INSTITUT_SUPERIEUR: 'Institut supérieur', ECOLE_SECONDAIRE: 'École secondaire' };

export function UniversityDetailPage() {
  const { code } = useParams(); const navigate = useNavigate(); const { token, estConnecte } = useAuth();
  const [u, setU] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [partners, setPartners] = useState([]); const [enrollmentOpen, setEnrollmentOpen] = useState(false);
  const [following, setFollowing] = useState(false); const [selectedCampus, setSelectedCampus] = useState('');
  useEffect(() => {
    Promise.all([
      apiRequest(`/universites/${code}`),
      apiRequest(`/communaute/partenaires/universites/${code}`).catch(() => ({ donnees: [] })),
      apiRequest(`/communaute/inscriptions/universites/${code}/formulaire`).catch(() => ({ donnees: null })),
    ]).then(([institution, partnerResponse, enrollmentResponse]) => {
      setU(institution.donnees); setSelectedCampus(institution.donnees.campus?.[0]?.code_campus || '');
      setPartners(partnerResponse.donnees || []); setEnrollmentOpen(Boolean(enrollmentResponse.donnees));
    }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [code]);
  const campus = u?.campus?.find((site) => site.code_campus === selectedCampus) || u?.campus?.[0];
  const filieres = useMemo(() => (u?.filieres || []).filter((filiere) => { if (!selectedCampus) return true; const codes = String(filiere.codes_campus || '').split(',').filter(Boolean); return codes.length === 0 || codes.includes(selectedCampus); }), [u, selectedCampus]);
  async function follow() { if (!estConnecte) { navigate('/connexion'); return; } try { await apiRequest(`/interactions/universites/${code}/suivre`, { method: 'POST', token }); setFollowing(true); } catch (err) { setError(err.message); } }
  if (loading) return <PageShell><div className="full-loading"><Spinner />Chargement de la fiche…</div></PageShell>;
  if (!u) return <PageShell><div className="not-found"><Building2 /><h1>Établissement introuvable</h1><p>{error}</p><Link className="button" to="/universites"><ArrowLeft />Retour</Link></div></PageShell>;
  const category = categoryLabels[u.categorie_etablissement] || 'Université';
  const publicType = u.type_universite === 'PUBLIQUE'
    ? (u.categorie_etablissement === 'ECOLE_SECONDAIRE' ? 'publique' : 'public')
    : (u.categorie_etablissement === 'ECOLE_SECONDAIRE' ? 'privée' : 'privé');
  const mapSource = campus || u;
  return <PageShell><section className="university-detail-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(4,27,85,.96),rgba(4,27,85,.55)),url(${u.url_couverture || cover})` }}><div className="container"><Link to="/universites"><ArrowLeft />Tous les établissements</Link><div className="detail-identity"><div className="detail-logo">{u.url_logo ? <img src={u.url_logo} alt={`Logo ${u.nom}`} /> : <Building2 />}</div><div><span className="pill pill--light"><BadgeCheck />Établissement vérifié</span><h1>{u.nom}</h1><p><MapPin />{u.ville}, {u.province} • {category} {publicType}</p></div></div></div></section>
    <section className="detail-stats"><div className="container">{[[u.nombre_etudiants, 'Étudiants', Users], [u.nombre_facultes, u.categorie_etablissement === 'ECOLE_SECONDAIRE' ? 'Sections' : 'Facultés', School], [u.nombre_filieres, 'Filières', GraduationCap], [u.nombre_campus, 'Campus', MapPin]].map(([value, label, Icon]) => <div key={label}><Icon /><strong>{value || 0}</strong><span>{label}</span></div>)}</div></section>
    <section className="section"><div className="container detail-layout"><div className="detail-main">{error && <div className="alert alert--error">{error}</div>}<section className="app-panel detail-section"><h2>À propos de l’établissement</h2><p>{u.description || 'Cet établissement n’a pas encore ajouté de présentation détaillée.'}</p></section>
      {partners.length > 0 && <a className="institution-partners-highlight app-panel" href="#partenaires"><span><Handshake /></span><div><small>Réseau de l’établissement</small><strong>{partners.length} partenaire(s) déclaré(s)</strong><p>Découvrez les organisations qui accompagnent les étudiants, les formations et les projets de cet établissement.</p></div><ExternalLink /></a>}
      <section className="app-panel detail-section campus-map-section"><div className="detail-section__heading"><div><h2>Campus et localisation</h2><p>Sélectionnez un campus pour afficher son adresse et ses formations.</p></div></div>{u.campus?.length > 0 && <div className="campus-filter">{u.campus.map((site) => <button className={selectedCampus === site.code_campus ? 'active' : ''} onClick={() => setSelectedCampus(site.code_campus)} key={site.code_campus}><MapPin /><span><strong>{site.nom}</strong><small>{site.ville}{site.est_principal ? ' • Principal' : ''}</small></span></button>)}</div>}<LocationMap titre={campus?.nom || u.nom} latitude={mapSource.latitude} longitude={mapSource.longitude} adresse={mapSource.adresse || u.adresse} ville={mapSource.ville || u.ville} province={mapSource.province || u.province} pays={u.pays} /></section>
      <section className="app-panel detail-section"><div className="detail-section__heading"><div><h2>Filières proposées</h2><p>{filieres.length} formation(s) {campus ? `au ${campus.nom}` : 'disponible(s)'}</p></div></div><div className="public-programs">{filieres.length ? filieres.map((filiere) => <article key={filiere.code_filiere}><span><GraduationCap /></span><div><h3>{filiere.nom_filiere}</h3><p>{filiere.nom_faculte} • {filiere.domaine}</p><small>{filiere.niveau_diplome} • {filiere.duree_annees || '—'} an(s) • {filiere.frais_minimum || 0}–{filiere.frais_maximum || 0} {filiere.devise}</small></div></article>) : <div className="management-empty"><GraduationCap /><h3>Aucune filière pour ce campus</h3><p>L’établissement doit encore associer ses formations à ce campus.</p></div>}</div></section>
      <section className="app-panel detail-section"><h2>Services et infrastructures</h2><div className="feature-grid">{u.services?.map((item) => <div key={item.code_service}><Wrench /><strong>{item.nom}</strong><small>{item.description}</small></div>)}{u.infrastructures?.map((item) => <div key={item.code_infrastructure}><School /><strong>{item.nom}</strong><small>{item.categorie} {item.quantite ? `• ${item.quantite}` : ''}</small></div>)}</div></section><section className="app-panel detail-section"><h2>Conditions d’admission</h2><div className="admission-list">{u.conditionsAdmission?.length ? u.conditionsAdmission.map((item) => <div key={item.code_condition}><CalendarCheck /><div><strong>{item.titre}</strong><p>{item.description}</p><small>{item.niveau_diplome || 'Tous niveaux'}</small></div></div>) : <p>Aucune condition publiée.</p>}</div></section>
      {partners.length > 0 && <section id="partenaires" className="app-panel detail-section institution-partners-section"><div className="detail-section__heading"><div><h2>Partenaires de l’établissement</h2><p>Ces organisations collaborent avec l’établissement dans la formation, les stages, les projets ou l’accompagnement des étudiants.</p></div><Handshake /></div><div className="public-partners-grid">{partners.map((partner) => <article key={partner.code_partenaire}><div>{partner.url_logo ? <img src={partner.url_logo} alt={`Logo ${partner.nom}`} /> : <Handshake />}</div><span>{partner.categorie}</span><h3>{partner.nom}</h3><p>{partner.description || 'Partenaire déclaré par cet établissement.'}</p>{partner.site_web && <a href={partner.site_web} target="_blank" rel="noreferrer">Visiter le site <ExternalLink /></a>}</article>)}</div></section>}
    </div><aside className="detail-aside"><section className="contact-card"><h2>Intéressé par {u.sigle || u.nom} ?</h2><p>Contactez directement le service des admissions.</p>{enrollmentOpen && <Link className="button button--full" to={`/universites/${code}/inscription-en-ligne`}><ClipboardList />S’inscrire en ligne</Link>}{u.email && <a href={`mailto:${u.email}`}><Mail />{u.email}</a>}{u.telephone && <a href={`tel:${u.telephone}`}><Phone />{u.telephone}</a>}{u.site_web && <a href={u.site_web} target="_blank" rel="noreferrer"><Globe2 />Site officiel</a>}<button className="button button--teal button--full" onClick={follow}>{following ? 'Établissement suivi' : 'Suivre l’établissement'}</button></section><section className="app-panel detail-facts"><h3>Informations</h3><div><BookOpen /><span><small>Catégorie</small><strong>{category}</strong></span></div><div><CalendarCheck /><span><small>Inscriptions</small><strong>{enrollmentOpen ? 'En ligne' : (u.inscriptions_ouvertes ? 'Ouvertes' : 'Fermées')}</strong></span></div>{partners.length > 0 && <div><Handshake /><span><small>Partenaires déclarés</small><strong>{partners.length} organisation(s)</strong></span></div>}</section></aside></div></section>
  </PageShell>;
}
