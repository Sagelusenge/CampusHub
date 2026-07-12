import {
  Activity,
  BadgeCheck,
  Building2,
  Check,
  Clock3,
  FileClock,
  LayoutDashboard,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { PageShell } from '../components/PageShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function AdminDashboardPage() {
  const { token, utilisateur } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [demandes, setDemandes] = useState([]);
  const [universites, setUniversites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const charger = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsResponse, accountsResponse, universitiesResponse] = await Promise.all([
        apiRequest('/administration/tableau-de-bord', { token }),
        apiRequest('/utilisateurs?role=UNIVERSITE&statut=EN_ATTENTE&page=1&limite=50', { token }),
        apiRequest('/universites'),
      ]);
      setDashboard(statsResponse.donnees?.indicateurs || {});
      setDemandes(accountsResponse.donnees || []);
      setUniversites((universitiesResponse.donnees || []).filter((item) => item.statut_verification === 'EN_ATTENTE'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Le chargement synchronise l'écran avec les données distantes au montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  async function traiterCompte(code, accepter) {
    setProcessing(code);
    setError('');
    try {
      await apiRequest(`/utilisateurs/${code}/statut`, {
        method: 'PATCH',
        token,
        body: accepter
          ? { statutCompte: 'ACTIF', statutVerification: 'VERIFIE' }
          : { statutCompte: 'SUSPENDU', statutVerification: 'REJETE' },
      });
      setDemandes((items) => items.filter((item) => item.code_utilisateur !== code));
      setMessage(accepter ? 'Le compte institutionnel est maintenant actif.' : 'La demande a été rejetée.');
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing('');
    }
  }

  async function traiterUniversite(code, accepter) {
    setProcessing(code);
    setError('');
    try {
      await apiRequest(`/administration/universites/${code}/verification`, {
        method: 'PATCH',
        token,
        body: { statut: accepter ? 'VERIFIEE' : 'REJETEE' },
      });
      setUniversites((items) => items.filter((item) => item.code_universite !== code));
      setMessage(accepter ? 'L’université est désormais visible publiquement.' : 'La fiche universitaire a été rejetée.');
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing('');
    }
  }

  const stats = [
    { label: 'Utilisateurs', value: dashboard?.utilisateurs || 0, icon: Users, tone: 'blue' },
    { label: 'Comptes en attente', value: dashboard?.comptes_en_attente || 0, icon: UserRoundCheck, tone: 'amber' },
    { label: 'Universités', value: dashboard?.universites || 0, icon: Building2, tone: 'teal' },
    { label: 'Signalements', value: dashboard?.signalements_a_traiter || 0, icon: Activity, tone: 'red' },
  ];

  return (
    <PageShell footer={false}>
      <section className="dashboard-page">
        <div className="container dashboard-heading">
          <div>
            <span className="eyebrow eyebrow--accent"><ShieldCheck size={15} /> Administration CampusHub</span>
            <h1>Bonjour, {utilisateur?.nom_affichage || 'Administrateur'}.</h1>
            <p>Examinez les demandes avant qu’elles rejoignent l’écosystème public.</p>
          </div>
          <button className="button button--outline" onClick={charger} disabled={loading}><RefreshCw size={17} /> Actualiser</button>
        </div>

        <div className="container dashboard-layout">
          <aside className="dashboard-nav">
            <strong>Menu</strong>
            <a className="active" href="#vue"><LayoutDashboard /> Vue d’ensemble</a>
            <a href="#comptes"><UserRoundCheck /> Comptes à valider <span>{demandes.length}</span></a>
            <a href="#fiches"><Building2 /> Fiches universités <span>{universites.length}</span></a>
            <a href="#journal"><FileClock /> Journal d’activité</a>
          </aside>

          <div className="dashboard-content" id="vue">
            {error && <div className="alert alert--error">{error}</div>}
            {message && <div className="alert alert--success"><Check size={18} /> {message}</div>}

            {loading ? <div className="loading-state panel"><Spinner /> Chargement du tableau de bord…</div> : (
              <>
                <div className="stats-grid">
                  {stats.map(({ label, value, icon: Icon, tone }) => (
                    <article className="stat-card" key={label}>
                      <span className={`stat-icon stat-icon--${tone}`}><Icon /></span>
                      <small>{label}</small>
                      <strong>{Number(value).toLocaleString('fr-FR')}</strong>
                      <span className="stat-caption">Données en temps réel</span>
                    </article>
                  ))}
                </div>

                <section className="panel" id="comptes">
                  <div className="panel-heading">
                    <div><span className="eyebrow">Première vérification</span><h2>Demandes de comptes institutionnels</h2><p>Ces établissements attendent l’autorisation de se connecter.</p></div>
                    <span className="count-badge">{demandes.length}</span>
                  </div>
                  {demandes.length ? (
                    <div className="request-list">
                      {demandes.map((item) => (
                        <article className="request-row" key={item.code_utilisateur}>
                          <div className="request-avatar">{item.nom_affichage?.slice(0, 2).toUpperCase() || 'UN'}</div>
                          <div className="request-main"><strong>{item.nom_affichage}</strong><span>{item.email}</span><small>{item.ville}, {item.province} • {item.code_utilisateur}</small></div>
                          <StatusBadge status={item.statut_compte} />
                          <div className="request-actions">
                            <button className="button button--success button--small" disabled={processing === item.code_utilisateur} onClick={() => traiterCompte(item.code_utilisateur, true)}>{processing === item.code_utilisateur ? <Spinner /> : <><Check size={16} /> Valider</>}</button>
                            <button className="button button--danger-ghost button--small" disabled={processing === item.code_utilisateur} onClick={() => traiterCompte(item.code_utilisateur, false)}><X size={16} /> Rejeter</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : <EmptyReview icon={UserRoundCheck} text="Aucune demande de compte à examiner." />}
                </section>

                <section className="panel" id="fiches">
                  <div className="panel-heading">
                    <div><span className="eyebrow">Vérification publique</span><h2>Fiches universitaires à publier</h2><p>Contrôlez les informations complétées par les établissements actifs.</p></div>
                    <span className="count-badge">{universites.length}</span>
                  </div>
                  {universites.length ? (
                    <div className="review-grid">
                      {universites.map((item) => (
                        <article className="review-card" key={item.code_universite}>
                          <div className="review-card__top"><span className="stat-icon stat-icon--teal"><Building2 /></span><StatusBadge status={item.statut_verification} /></div>
                          <h3>{item.nom}</h3>
                          <p>{item.type_universite === 'PUBLIQUE' ? 'Université publique' : 'Université privée'} • {item.ville}, {item.province}</p>
                          <small>{item.nombre_filieres || 0} filières renseignées • {item.code_universite}</small>
                          <div className="request-actions">
                            <button className="button button--success button--small" disabled={processing === item.code_universite} onClick={() => traiterUniversite(item.code_universite, true)}>{processing === item.code_universite ? <Spinner /> : <><BadgeCheck size={16} /> Publier</>}</button>
                            <button className="button button--danger-ghost button--small" disabled={processing === item.code_universite} onClick={() => traiterUniversite(item.code_universite, false)}><X size={16} /> Rejeter</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : <EmptyReview icon={BadgeCheck} text="Aucune fiche universitaire à vérifier." />}
                </section>
              </>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function EmptyReview({ icon: Icon, text }) {
  return <div className="empty-review"><span><Icon /></span><strong>Tout est à jour</strong><p>{text}</p><small><Clock3 size={14} /> Les nouvelles demandes apparaîtront automatiquement ici.</small></div>;
}
