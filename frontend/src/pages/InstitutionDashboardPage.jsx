import { BadgeCheck, BookOpen, BriefcaseBusiness, Building2, Clock3, FileText, GraduationCap, MapPin, RefreshCw, School, Users, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useInstitution } from '../context/InstitutionContext.jsx';

export function InstitutionDashboardPage() {
  const { universite } = useInstitution();
  const { token } = useAuth();
  const [abonnement, setAbonnement] = useState(null);
  const [statistiques, setStatistiques] = useState({ indicateurs: null, activiteMensuelle: [], repartitionDemandes: {} });
  const [chargementStats, setChargementStats] = useState(true);
  useEffect(() => {
    if (!universite?.code_universite) return;
    let actif = true;
    Promise.all([
      apiRequest('/abonnements/moi', { token }).catch(() => ({ donnees: null })),
      apiRequest(`/universites/${universite.code_universite}/statistiques`, { token }).catch(() => ({ donnees: null })),
    ]).then(([abonnementResponse, statistiquesResponse]) => {
      if (!actif) return;
      setAbonnement(abonnementResponse.donnees);
      if (statistiquesResponse.donnees) setStatistiques(statistiquesResponse.donnees);
    }).finally(() => { if (actif) setChargementStats(false); });
    return () => { actif = false; };
  }, [token, universite?.code_universite]);
  if (!universite) return <NoUniversity />;
  const isSchool = universite.categorie_etablissement === 'ECOLE_SECONDAIRE';
  const indicateurs = statistiques.indicateurs || {};

  const counts = [
    { label: isSchool ? 'Options actives' : 'Filières actives', value: indicateurs.nombre_filieres ?? universite.filieres?.length ?? universite.nombre_filieres ?? 0, icon: GraduationCap, tone: 'blue', href: '/espace-universite/formations' },
    { label: isSchool ? 'Services scolaires' : 'Services', value: indicateurs.nombre_services ?? universite.services?.length ?? 0, icon: Wrench, tone: 'teal', href: '/espace-universite/services' },
    { label: 'Infrastructures', value: universite.infrastructures?.length || 0, icon: School, tone: 'amber', href: '/espace-universite/infrastructures' },
    { label: isSchool ? 'Élèves liés' : 'Étudiants liés', value: indicateurs.nombre_etudiants ?? universite.nombre_etudiants ?? 0, icon: Users, tone: 'violet', href: '/espace-universite/fiche' },
  ];
  const verified = universite.statut_verification === 'VERIFIEE';
  const maximumActivite = Math.max(1, ...statistiques.activiteMensuelle.flatMap((item) => [Number(item.publications), Number(item.offres), Number(item.candidatures)]));
  const repartition = statistiques.repartitionDemandes || {};
  const totalDemandes = Number(repartition.enAttente || 0) + Number(repartition.acceptees || 0) + Number(repartition.rejetees || 0);
  const acceptation = totalDemandes ? Math.round(Number(repartition.acceptees || 0) / totalDemandes * 100) : 0;

  return <div className="dashboard-view">
    <div className="dashboard-welcome institution-welcome"><div><span>{isSchool ? 'Espace de gestion scolaire' : 'Espace institutionnel'}</span><h1>{universite.nom}</h1><p><MapPin /> {universite.ville}, {universite.province} • {universite.code_universite}</p></div><StatusBadge status={universite.statut_verification} /></div>
    <div className={`verification-strip ${abonnement?.statut === 'ACTIF' && abonnement.jours_restants > 7 ? 'verification-strip--success' : ''}`}><span>{abonnement?.statut === 'ACTIF' ? <BadgeCheck /> : <Clock3 />}</span><div><strong>{abonnement?.statut === 'ACTIF' ? `${abonnement.jours_restants} jour(s) d’abonnement restant(s)` : 'Abonnement à renouveler'}</strong><p>{abonnement?.statut === 'ACTIF' ? 'Une alerte renforcée apparaîtra durant les 7 derniers jours.' : 'Renouvelez votre accès pour conserver les services et le badge certifié.'}</p></div><Link to="/espace-universite/abonnement">Gérer</Link></div>
    <div className={`verification-strip ${verified ? 'verification-strip--success' : ''}`}><span>{verified ? <BadgeCheck /> : <Clock3 />}</span><div><strong>{verified ? 'Votre fiche est publiée' : 'Vérification finale en cours'}</strong><p>{verified ? (isSchool ? 'Les élèves et les familles peuvent maintenant découvrir votre école.' : 'Les étudiants peuvent maintenant découvrir votre université.') : 'Vous pouvez compléter toutes les rubriques pendant l’examen.'}</p></div><Link to="/espace-universite/fiche">Voir la fiche</Link></div>
    <div className="metric-grid">{counts.map(({label,value,icon:Icon,tone,href}) => <Link className="metric-card" to={href} key={label}><span className={`metric-card__icon metric-card__icon--${tone}`}><Icon /></span><small>{label}</small><strong>{value}</strong><p>Gérer cette rubrique</p></Link>)}</div>
    <div className="analytics-grid institution-data-analytics">
      <section className="app-panel analytics-chart">
        <div className="app-panel__heading"><div><h2>Activité réelle des 6 derniers mois</h2><p>Publications, offres et candidatures enregistrées dans MySQL</p></div>{chargementStats && <RefreshCw className="dashboard-refresh-icon" />}</div>
        <div className="institution-chart-legend"><span><i className="dot dot--teal" /> Publications</span><span><i className="dot dot--amber" /> Offres</span><span><i className="dot dot--blue" /> Candidatures</span></div>
        <div className="bar-chart bar-chart--grouped">
          {statistiques.activiteMensuelle.map((item) => <div className="bar-chart__item" key={item.mois}><strong>{Number(item.publications) + Number(item.offres) + Number(item.candidatures)}</strong><div className="grouped-bars"><span className="bar--publication" title={`${item.publications} publication(s)`} style={{ height: `${Math.max(4, Number(item.publications) / maximumActivite * 94)}%` }} /><span className="bar--offer" title={`${item.offres} offre(s)`} style={{ height: `${Math.max(4, Number(item.offres) / maximumActivite * 94)}%` }} /><span className="bar--application" title={`${item.candidatures} candidature(s)`} style={{ height: `${Math.max(4, Number(item.candidatures) / maximumActivite * 94)}%` }} /></div><small>{new Date(`${item.mois}-02`).toLocaleDateString('fr-FR',{month:'short'})}</small></div>)}
        </div>
      </section>
      <section className="app-panel action-summary institution-request-summary">
        <div className="app-panel__heading"><div><h2>Décisions sur les demandes</h2><p>Affiliations et inscriptions en ligne</p></div></div>
        <div className="donut donut--institution" style={{ '--donut-value': `${acceptation}%` }}><div><strong>{acceptation}%</strong><small>acceptées</small></div></div>
        <div className="summary-rows summary-rows--static"><div><span><i className="dot dot--amber" /> En attente</span><strong>{repartition.enAttente || 0}</strong></div><div><span><i className="dot dot--teal" /> Acceptées</span><strong>{repartition.acceptees || 0}</strong></div><div><span><i className="dot dot--red" /> Refusées</span><strong>{repartition.rejetees || 0}</strong></div></div>
      </section>
    </div>
    <div className="analytics-grid institution-analytics">
      <section className="app-panel completion-panel"><div className="app-panel__heading"><div><h2>Complétude de la fiche</h2><p>Les rubriques à renseigner</p></div><strong>{completion(universite)}%</strong></div><div className="completion-progress"><span style={{width:`${completion(universite)}%`}} /></div><div className="completion-list"><Completion label="Identité et coordonnées" done={Boolean(universite.description && universite.email)} href="/espace-universite/fiche" /><Completion label={isSchool ? 'Sections et options' : 'Facultés et filières'} done={Boolean(universite.filieres?.length)} href="/espace-universite/formations" /><Completion label={isSchool ? 'Services scolaires' : 'Services universitaires'} done={Boolean(universite.services?.length)} href="/espace-universite/services" /><Completion label={isSchool ? 'Conditions d’inscription' : 'Conditions d’admission'} done={Boolean(universite.conditionsAdmission?.length)} href="/espace-universite/admissions" /></div></section>
      <section className="app-panel quick-actions"><div className="app-panel__heading"><div><h2>Actions rapides</h2><p>Enrichissez votre espace</p></div></div><Link to="/espace-universite/campus"><School />{isSchool ? 'Ajouter un site' : 'Ajouter un campus'}</Link><Link to="/espace-universite/formations"><GraduationCap />{isSchool ? 'Créer une option' : 'Créer une filière'}</Link><Link to="/espace-universite/offres"><BriefcaseBusiness />Publier une offre</Link><Link to="/espace-universite/publications"><FileText />Publier une actualité</Link><Link to="/espace-universite/admissions"><BookOpen />Ajouter une condition</Link></section>
    </div>
  </div>;
}

function Completion({label,done,href}) { return <Link to={href}><span className={done ? 'done' : ''}>{done ? <BadgeCheck /> : <Clock3 />}</span><strong>{label}</strong><small>{done ? 'Complété' : 'À compléter'}</small></Link>; }
function completion(u) { return [u.description&&u.email,u.filieres?.length,u.services?.length,u.conditionsAdmission?.length].filter(Boolean).length*25; }
function NoUniversity() { return <div className="no-university"><span><Building2 /></span><h1>Créez d’abord votre fiche universitaire</h1><p>Votre compte est actif. La prochaine étape consiste à renseigner l’identité publique de l’établissement.</p><Link className="button" to="/espace-universite/fiche">Commencer la fiche</Link></div>; }
