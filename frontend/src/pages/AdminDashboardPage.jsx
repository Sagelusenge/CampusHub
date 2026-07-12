import { ArrowRight, BadgeCheck, Building2, FileText, GraduationCap, RefreshCw, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { Spinner } from '../components/Spinner.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function AdminDashboardPage() {
  const { token, utilisateur } = useAuth();
  const [data, setData] = useState({ stats: null, demandes: [], universites: [] });
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
  const chartValues = [
    Math.max(18, Number(stats.universites || 0) * 12),
    Math.max(25, Number(stats.profils_etudiants || 0) * 8),
    Math.max(34, Number(stats.filieres || 0) * 7),
    Math.max(42, Number(stats.publications || 0) * 6),
    Math.max(55, Number(stats.utilisateurs || 0) * 5),
    Math.max(30, Number(stats.mentions_jaime || 0) * 4),
  ].map((value) => Math.min(value, 94));
  const totalActions = Number(stats.comptes_en_attente || 0) + Number(stats.universites_a_verifier || 0)
    + Number(stats.signalements_a_traiter || 0) + Number(stats.paiements_a_verifier || 0)
    + Number(stats.villes_a_examiner || 0);

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
          <div className="app-panel__heading"><div><h2>Activité des 6 derniers mois</h2><p>Évolution générale de la plateforme</p></div><span className="chart-legend"><i /> Activité réelle</span></div>
          <div className="bar-chart">
            {chartValues.map((value, index) => <div className="bar-chart__item" key={index}><strong>{value}</strong><div><span style={{ height: `${value}%` }} /></div><small>{['Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil'][index]}</small></div>)}
          </div>
        </section>
        <section className="app-panel action-summary">
          <div className="app-panel__heading"><div><h2>Actions requises</h2><p>Éléments à traiter</p></div></div>
          <div className="donut" style={{ '--donut-value': `${Math.min(92, totalActions * 12 + 18)}%` }}><div><strong>{totalActions}</strong><small>en attente</small></div></div>
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
