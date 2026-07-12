import { BadgeCheck, BookOpen, Building2, Clock3, FileText, GraduationCap, MapPin, School, Users, Wrench } from 'lucide-react';
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
  useEffect(() => { apiRequest('/abonnements/moi', { token }).then((r) => setAbonnement(r.donnees)).catch(() => setAbonnement(null)); }, [token]);
  if (!universite) return <NoUniversity />;

  const counts = [
    { label: 'Filières actives', value: universite.filieres?.length || universite.nombre_filieres || 0, icon: GraduationCap, tone: 'blue', href: '/espace-universite/formations' },
    { label: 'Services', value: universite.services?.length || 0, icon: Wrench, tone: 'teal', href: '/espace-universite/services' },
    { label: 'Infrastructures', value: universite.infrastructures?.length || 0, icon: School, tone: 'amber', href: '/espace-universite/infrastructures' },
    { label: 'Étudiants liés', value: universite.nombre_etudiants || 0, icon: Users, tone: 'violet', href: '/espace-universite/fiche' },
  ];
  const verified = universite.statut_verification === 'VERIFIEE';

  return <div className="dashboard-view">
    <div className="dashboard-welcome institution-welcome"><div><span>Espace institutionnel</span><h1>{universite.nom}</h1><p><MapPin /> {universite.ville}, {universite.province} • {universite.code_universite}</p></div><StatusBadge status={universite.statut_verification} /></div>
    <div className={`verification-strip ${abonnement?.statut === 'ACTIF' && abonnement.jours_restants > 7 ? 'verification-strip--success' : ''}`}><span>{abonnement?.statut === 'ACTIF' ? <BadgeCheck /> : <Clock3 />}</span><div><strong>{abonnement?.statut === 'ACTIF' ? `${abonnement.jours_restants} jour(s) d’abonnement restant(s)` : 'Abonnement à renouveler'}</strong><p>{abonnement?.statut === 'ACTIF' ? 'Une alerte renforcée apparaîtra durant les 7 derniers jours.' : 'Renouvelez votre accès pour conserver les services et le badge certifié.'}</p></div><Link to="/espace-universite/abonnement">Gérer</Link></div>
    <div className={`verification-strip ${verified ? 'verification-strip--success' : ''}`}><span>{verified ? <BadgeCheck /> : <Clock3 />}</span><div><strong>{verified ? 'Votre fiche est publiée' : 'Vérification finale en cours'}</strong><p>{verified ? 'Les étudiants peuvent maintenant découvrir votre université.' : 'Vous pouvez compléter toutes les rubriques pendant l’examen.'}</p></div><Link to="/espace-universite/fiche">Voir la fiche</Link></div>
    <div className="metric-grid">{counts.map(({label,value,icon:Icon,tone,href}) => <Link className="metric-card" to={href} key={label}><span className={`metric-card__icon metric-card__icon--${tone}`}><Icon /></span><small>{label}</small><strong>{value}</strong><p>Gérer cette rubrique</p></Link>)}</div>
    <div className="analytics-grid institution-analytics">
      <section className="app-panel completion-panel"><div className="app-panel__heading"><div><h2>Complétude de la fiche</h2><p>Les rubriques à renseigner</p></div><strong>{completion(universite)}%</strong></div><div className="completion-progress"><span style={{width:`${completion(universite)}%`}} /></div><div className="completion-list"><Completion label="Identité et coordonnées" done={Boolean(universite.description && universite.email)} href="/espace-universite/fiche" /><Completion label="Facultés et filières" done={Boolean(universite.filieres?.length)} href="/espace-universite/formations" /><Completion label="Services universitaires" done={Boolean(universite.services?.length)} href="/espace-universite/services" /><Completion label="Conditions d’admission" done={Boolean(universite.conditionsAdmission?.length)} href="/espace-universite/admissions" /></div></section>
      <section className="app-panel quick-actions"><div className="app-panel__heading"><div><h2>Actions rapides</h2><p>Enrichissez votre espace</p></div></div><Link to="/espace-universite/campus"><School />Ajouter un campus</Link><Link to="/espace-universite/formations"><GraduationCap />Créer une filière</Link><Link to="/espace-universite/publications"><FileText />Publier une actualité</Link><Link to="/espace-universite/admissions"><BookOpen />Ajouter une condition</Link></section>
    </div>
  </div>;
}

function Completion({label,done,href}) { return <Link to={href}><span className={done ? 'done' : ''}>{done ? <BadgeCheck /> : <Clock3 />}</span><strong>{label}</strong><small>{done ? 'Complété' : 'À compléter'}</small></Link>; }
function completion(u) { return [u.description&&u.email,u.filieres?.length,u.services?.length,u.conditionsAdmission?.length].filter(Boolean).length*25; }
function NoUniversity() { return <div className="no-university"><span><Building2 /></span><h1>Créez d’abord votre fiche universitaire</h1><p>Votre compte est actif. La prochaine étape consiste à renseigner l’identité publique de l’établissement.</p><Link className="button" to="/espace-universite/fiche">Commencer la fiche</Link></div>; }
