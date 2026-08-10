import { ArrowRight, BadgeCheck, Building2, FileText, GraduationCap, RefreshCw, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { Spinner } from '../components/Spinner.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function AdminDashboardPage() {
  const { token, utilisateur } = useAuth();
  const [data, setData] = useState({ stats: null, activite: [], demandes: [], universites: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboard, demandes, universites] = await Promise.all([
        apiRequest('/administration/tableau-de-bord', { token }),
        apiRequest('/utilisateurs?role=UNIVERSITE&statut=EN_ATTENTE&page=1&limite=5', { token }),
        apiRequest('/universites'),
      ]);
      setData({
        stats: dashboard.donnees?.indicateurs || {},
        activite: dashboard.donnees?.activiteMensuelle || [],
        demandes: demandes.donnees || [],
        universites: (universites.donnees || []).filter((item) => item.statut_verification === 'EN_ATTENTE').slice(0, 4),
      });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  if (loading) return <div className="content-loading"><Spinner /> Chargement des indicateurs…</div>;

  const stats = data.stats || {};
  const cards = [
    { label: 'Utilisateurs actifs', value: stats.utilisateurs || 0, icon: Users, tone: 'blue', note: 'Tous les comptes' },
    { label: 'Universités', value: stats.universites || 0, icon: Building2, tone: 'teal', note: `${stats.universites_a_verifier || 0} à vérifier` },
    { label: 'Profils étudiants', value: stats.profils_etudiants || 0, icon: GraduationCap, tone: 'amber', note: 'Profils visibles' },
    { label: 'Publications', value: stats.publications || 0, icon: FileText, tone: 'violet', note: `${stats.signalements_a_traiter || 0} signalement(s)` },
  ];
  const maximumActivite = Math.max(1, ...data.activite.map((item) => Number(item.nouveauxUtilisateurs)));
  const maximumRevenus = Math.max(1, ...data.activite.map((item) => Number(item.revenus)));
  const chartValues = data.activite.map((item) => ({
    ...item,
    hauteur: Math.max(4, Math.round(Number(item.nouveauxUtilisateurs) / maximumActivite * 94)),
    hauteurRevenus: Math.max(4, Math.round(Number(item.revenus) / maximumRevenus * 94)),
  }));
  const totalActions = Number(stats.comptes_en_attente || 0) + Number(stats.universites_a_verifier || 0)
    + Number(stats.signalements_a_traiter || 0) + Number(stats.paiements_a_verifier || 0)
    + Number(stats.villes_a_examiner || 0);
  const comptesPart = totalActions ? Number(stats.comptes_en_attente || 0) / totalActions * 100 : 0;
  const universitesPart = totalActions ? comptesPart + Number(stats.universites_a_verifier || 0) / totalActions * 100 : 0;
  const moderationPart = totalActions ? universitesPart + Number(stats.signalements_a_traiter || 0) / totalActions * 100 : 0;

  return (
    <div className="dashboard-view">
      <div className="dashboard-welcome">
        <div><span>Vue d’ensemble</span><h1>Bonjour, {utilisateur?.nom_affichage || 'Administrateur'}</h1><p>Voici l’activité récente de CampusHub.</p></div>
        <button className="secondary-action" onClick={charger}><RefreshCw /> Actualiser</button>
      </div>
      {error && <div className="alert alert--error">{error}</div>}

      <div className="metric-grid">
        {cards.map(({ label, value, icon: Icon, tone, note }) => (
          <article className="metric-card" key={label}>
            <span className={`metric-card__icon metric-card__icon--${tone}`}><Icon /></span>
            <small>{label}</small><strong>{Number(value).toLocaleString('fr-FR')}</strong><p>{note}</p>
          </article>
        ))}
      </div>

      <div className="analytics-grid">
        <section className="app-panel analytics-chart">
          <div className="app-panel__heading"><div><h2>Activité des 6 derniers mois</h2><p>Nouveaux comptes et revenus validés</p></div></div>
          <div className="institution-chart-legend"><span><i className="dot dot--blue" /> Utilisateurs</span><span><i className="dot dot--teal" /> Revenus (USD)</span></div>
          <div className="bar-chart bar-chart--grouped">
            {chartValues.map((item) => <div className="bar-chart__item" key={item.mois}><strong>{item.nouveauxUtilisateurs} / ${Number(item.revenus).toLocaleString('fr-FR')}</strong><div className="grouped-bars grouped-bars--admin"><span className="bar--application" title={`${item.nouveauxUtilisateurs} nouveau(x) utilisateur(s)`} style={{ height: `${item.hauteur}%` }} /><span className="bar--publication" title={`${item.revenus} USD validé(s)`} style={{ height: `${item.hauteurRevenus}%` }} /></div><small>{new Date(`${item.mois}-02`).toLocaleDateString('fr-FR',{month:'short'})}</small></div>)}
          </div>
        </section>
        <section className="app-panel action-summary">
          <div className="app-panel__heading"><div><h2>Actions requises</h2><p>Éléments à traiter</p></div></div>
          <div className="donut donut--actions" style={{ '--actions-one': `${comptesPart}%`, '--actions-two': `${universitesPart}%`, '--actions-three': `${moderationPart}%` }}><div><strong>{totalActions}</strong><small>en attente</small></div></div>
          <div className="summary-rows">
            <Link to="/administration/demandes"><span><i className="dot dot--amber" /> Comptes</span><strong>{stats.comptes_en_attente || 0}</strong></Link>
            <Link to="/administration/universites"><span><i className="dot dot--teal" /> Universités</span><strong>{stats.universites_a_verifier || 0}</strong></Link>
            <Link to="/administration/moderation"><span><i className="dot dot--red" /> Signalements</span><strong>{stats.signalements_a_traiter || 0}</strong></Link>
            <Link to="/administration/abonnements"><span><i className="dot dot--amber" /> Paiements</span><strong>{stats.paiements_a_verifier || 0}</strong></Link>
            <Link to="/administration/localisations"><span><i className="dot dot--teal" /> Villes proposées</span><strong>{stats.villes_a_examiner || 0}</strong></Link>
          </div>
        </section>
      </div>

      <div className="dashboard-lists">
        <section className="app-panel">
          <div className="app-panel__heading"><div><h2>Demandes récentes</h2><p>Comptes institutionnels à examiner</p></div><Link to="/administration/demandes">Tout voir <ArrowRight /></Link></div>
          <div className="compact-list">
            {data.demandes.length ? data.demandes.map((item) => <div key={item.code_utilisateur}><span className="list-avatar">{item.nom_affichage?.slice(0,2).toUpperCase()}</span><div><strong>{item.nom_affichage}</strong><small>{item.email}</small></div><StatusBadge status={item.statut_compte} /></div>) : <EmptyLine text="Aucune demande en attente" />}
          </div>
        </section>
        <section className="app-panel">
          <div className="app-panel__heading"><div><h2>Fiches à vérifier</h2><p>Universités prêtes à être publiées</p></div><Link to="/administration/universites">Tout voir <ArrowRight /></Link></div>
          <div className="compact-list">
            {data.universites.length ? data.universites.map((item) => <div key={item.code_universite}><span className="list-avatar list-avatar--teal"><Building2 /></span><div><strong>{item.nom}</strong><small>{item.ville} • {item.code_universite}</small></div><StatusBadge status={item.statut_verification} /></div>) : <EmptyLine text="Aucune fiche à vérifier" />}
          </div>
        </section>
      </div>
    </div>
  );
}

function EmptyLine({ text }) {
  return <div className="compact-empty"><BadgeCheck /> <span>{text}</span></div>;
}
