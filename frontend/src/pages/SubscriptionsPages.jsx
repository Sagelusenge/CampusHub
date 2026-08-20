import { AlertTriangle, CalendarCheck, CalendarClock, Check, CreditCard, DollarSign, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { FileUploadField } from '../components/FileUploadField.jsx';
import { PlanSelector } from '../components/PlanSelector.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ListPagination } from '../components/ListPagination.jsx';

export function AdminSubscriptionsPage() {
  const { token } = useAuth();
  const [payments, setPayments] = useState([]); const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true); const [processing, setProcessing] = useState(''); const [error, setError] = useState('');
  const [subscriptionPage, setSubscriptionPage] = useState(1); const [subscriptionSort, setSubscriptionSort] = useState('expiration');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([apiRequest('/abonnements/paiements?page=1&limite=100', { token }), apiRequest('/abonnements', { token })]);
      setPayments(p.donnees || []); setSubscriptions(a.donnees || []); setError('');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, [token]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  async function processPayment(item, statut) {
    setProcessing(item.code_paiement);
    try { await apiRequest(`/abonnements/paiements/${item.code_paiement}`, { method: 'PATCH', token, body: { statut, commentaire: statut === 'VALIDE' ? 'Paiement confirmé par CampusHub.' : 'Preuve ou référence non conforme.' } }); await load(); }
    catch (err) { setError(err.message); } finally { setProcessing(''); }
  }
  const expiring = subscriptions.filter((item) => item.statut === 'ACTIF' && item.jours_restants <= 7);
  const orderedSubscriptions = useMemo(() => [...subscriptions].sort((a, b) => {
    if (subscriptionSort === 'nom') return String(a.nom_universite || a.nom_affichage).localeCompare(String(b.nom_universite || b.nom_affichage), 'fr');
    if (subscriptionSort === 'statut') return String(a.statut).localeCompare(String(b.statut), 'fr');
    return Number(a.est_a_vie) - Number(b.est_a_vie) || Number(a.jours_restants) - Number(b.jours_restants);
  }), [subscriptionSort, subscriptions]);
  const visibleSubscriptions = orderedSubscriptions.slice((subscriptionPage - 1) * 10, subscriptionPage * 10);
  return <div><DashboardPageHeader title="Abonnements et paiements" description="Suivez les essais gratuits et validez les accès annuels ou à vie des établissements." actions={<button className="secondary-action" onClick={load}><RefreshCw />Actualiser</button>} />
    {error && <div className="alert alert--error">{error}</div>}{expiring.length > 0 && <div className="expiry-alert"><AlertTriangle /><div><strong>{expiring.length} abonnement(s) arrivent à expiration</strong><p>Contactez les universités concernées avant la fin de leur accès.</p></div></div>}
    <div className="subscription-metrics"><article><DollarSign /><div><small>Accès annuel</small><strong>20 $ / an</strong></div></article><article><CalendarCheck /><div><small>Accès à vie</small><strong>200 $</strong></div></article><article><CreditCard /><div><small>Paiements à vérifier</small><strong>{payments.filter((x) => x.statut === 'EN_ATTENTE').length}</strong></div></article><article><CalendarClock /><div><small>Échéances à 7 jours</small><strong>{expiring.length}</strong></div></article></div>
    <section className="app-panel subscription-section"><div className="app-panel__heading"><div><h2>Paiements reçus</h2><p>Chaque paiement validé active la formule choisie par l’établissement.</p></div></div>{loading ? <div className="content-loading"><Spinner />Chargement…</div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Institution</th><th>Commande</th><th>Montant</th><th>Référence</th><th>Preuve</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{payments.map((item) => <tr key={item.code_paiement}><td><strong>{item.nom_affichage}</strong><small className="cell-subtitle">{item.email} • {item.code_utilisateur}</small></td><td><strong>{item.nom_plan}</strong><small className="cell-subtitle">{item.est_a_vie ? 'Paiement unique' : '12 mois renouvelables'}</small></td><td><strong>{item.montant} {item.devise}</strong></td><td>{item.moyen_paiement}<small className="cell-subtitle">{item.reference_paiement}</small></td><td>{item.url_preuve ? <a className="proof-link" href={item.url_preuve} target="_blank" rel="noreferrer">Consulter</a> : '—'}</td><td><StatusBadge status={item.statut} /></td><td>{item.statut === 'EN_ATTENTE' && <div className="table-actions"><button className="table-action table-action--success" disabled={processing === item.code_paiement} onClick={() => processPayment(item, 'VALIDE')}>{processing === item.code_paiement ? <Spinner /> : <Check />}</button><button className="table-action table-action--danger" disabled={processing === item.code_paiement} onClick={() => processPayment(item, 'REJETE')}><X /></button></div>}</td></tr>)}</tbody></table></div>}</section>
    <section className="app-panel subscription-section"><div className="app-panel__heading"><div><h2>Accès des établissements</h2><p>Essais gratuits, accès annuels et accès à vie issus de la base de données.</p></div><label className="subscription-sort">Trier par<select value={subscriptionSort} onChange={(event) => { setSubscriptionSort(event.target.value); setSubscriptionPage(1); }}><option value="expiration">Expiration proche</option><option value="nom">Nom de l’établissement</option><option value="statut">Statut</option></select></label></div><div className="subscription-grid">{visibleSubscriptions.map((item) => <article className={!item.est_a_vie && item.jours_restants <= 7 ? 'subscription-card subscription-card--warning' : 'subscription-card'} key={item.code_abonnement}><div><span><CalendarCheck /></span><StatusBadge status={item.statut} /></div><h3>{item.nom_universite || item.nom_affichage}</h3><p>{item.type_abonnement === 'ESSAI' ? 'Essai gratuit de 30 jours' : item.est_a_vie ? 'Accès à vie' : 'Accès annuel'} • {item.email}</p><div className="countdown"><strong>{item.est_a_vie ? '∞' : item.jours_restants}</strong><span>{item.est_a_vie ? 'accès permanent' : 'jour(s) restant(s)'}</span></div><small>{item.est_a_vie ? 'Aucun renouvellement nécessaire' : `Échéance : ${new Date(item.date_fin).toLocaleDateString('fr-FR')}`}</small></article>)}</div><ListPagination page={subscriptionPage} pageSize={10} total={orderedSubscriptions.length} pageSizes={[10]} onPageChange={setSubscriptionPage} onPageSizeChange={() => null} /></section>
  </div>;
}

export function InstitutionSubscriptionPage() {
  const { token, utilisateur } = useAuth();
  const [subscription, setSubscription] = useState(undefined); const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ codePlan: '', typePaiement: 'ABONNEMENT', moyenPaiement: 'MOBILE_MONEY', referencePaiement: '', urlPreuve: '' });
  const [sending, setSending] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([apiRequest('/abonnements/moi', { token }), apiRequest('/abonnements/plans')])
      .then(([current, available]) => { const list = available.donnees || []; setSubscription(current.donnees); setPlans(list); setForm((value) => ({ ...value, codePlan: list.some((plan) => plan.code_plan === current.donnees?.code_plan) ? current.donnees.code_plan : list[0]?.code_plan || '' })); })
      .catch((err) => setError(err.message));
  }, [token]);
  const selectedPlan = plans.find((plan) => plan.code_plan === form.codePlan);
  async function order(event) {
    event.preventDefault(); if (!form.urlPreuve) { setError('Ajoutez la preuve du paiement.'); return; }
    setSending(true); setError(''); setMessage('');
    try { await apiRequest('/abonnements/paiements', { method: 'POST', body: { codeUtilisateur: utilisateur.code_utilisateur, ...form, typePaiement: 'ABONNEMENT' } }); setMessage('Demande de paiement envoyée pour validation.'); setForm((value) => ({ ...value, referencePaiement: '', urlPreuve: '' })); }
    catch (err) { setError(err.message); } finally { setSending(false); }
  }
  if (subscription === undefined && !error) return <div className="content-loading"><Spinner />Chargement…</div>;
  const amount = Number(selectedPlan?.prix_total || 0);
  return <div><DashboardPageHeader title="Formules CampusHub" description="Profitez d’abord de 30 jours gratuits, puis choisissez 20 $ par an ou un paiement unique de 200 $ à vie." />{message && <div className="alert alert--success"><Check />{message}</div>}{error && <div className="alert alert--error">{error}</div>}
    <section className="current-subscription current-subscription--annual app-panel"><div><small>Accès actuel</small><h2>{subscription?.type_abonnement === 'ESSAI' ? 'Essai gratuit CampusHub' : subscription?.nom_plan || 'Aucun accès actif'}</h2><p>{subscription?.est_a_vie ? 'Votre accès institutionnel est permanent et ne nécessite aucun renouvellement.' : subscription?.date_fin ? `${subscription.type_abonnement === 'ESSAI' ? 'Essai valable' : 'Accès valable'} jusqu’au ${new Date(subscription.date_fin).toLocaleDateString('fr-FR')}` : 'Votre premier compte institutionnel bénéficie de 30 jours gratuits.'}</p></div><div className="subscription-count subscription-count--light"><strong>{subscription?.est_a_vie ? '∞' : subscription?.jours_restants || 0}</strong><span>{subscription?.est_a_vie ? 'accès permanent' : 'jours restants'}</span></div></section>
    <PlanSelector plans={plans} selected={form.typePaiement === 'ABONNEMENT' ? form.codePlan : ''} onSelect={(codePlan) => setForm((value) => ({ ...value, codePlan, typePaiement: 'ABONNEMENT' }))} />
    <form className="app-panel renewal-form pack-payment-form" onSubmit={order}><h2>Commander {selectedPlan?.est_a_vie ? 'l’accès à vie' : 'l’accès annuel'}</h2><p>Montant à envoyer : <strong>{amount} USD</strong> {selectedPlan?.est_a_vie ? 'en paiement unique, sans renouvellement.' : 'pour 365 jours d’accès complet, renouvelables par tranche annuelle.'}</p><div className="form-grid"><label className="editor-field"><span>Moyen de paiement</span><select value={form.moyenPaiement} onChange={(e) => setForm({ ...form, moyenPaiement: e.target.value })}><option value="MOBILE_MONEY">Mobile Money</option><option value="CARTE">Carte</option><option value="VIREMENT">Virement</option><option value="ESPECES">Espèces</option><option value="AUTRE">Autre</option></select></label><label className="editor-field"><span>Référence unique</span><input required minLength="3" value={form.referencePaiement} onChange={(e) => setForm({ ...form, referencePaiement: e.target.value })} /></label></div><FileUploadField label="Preuve de paiement" value={form.urlPreuve} proof onUploaded={(url) => setForm((value) => ({ ...value, urlPreuve: url }))} /><button className="button" disabled={sending || !form.codePlan}>{sending ? <Spinner /> : <><CreditCard />Envoyer la demande de {amount} $</>}</button></form>
  </div>;
}
