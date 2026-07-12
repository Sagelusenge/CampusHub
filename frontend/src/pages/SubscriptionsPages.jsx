import { AlertTriangle, BadgeCheck, CalendarClock, Check, CreditCard, DollarSign, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { FileUploadField } from '../components/FileUploadField.jsx';
import { PlanSelector } from '../components/PlanSelector.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function AdminSubscriptionsPage() {
  const { token } = useAuth();
  const [payments, setPayments] = useState([]); const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true); const [processing, setProcessing] = useState(''); const [error, setError] = useState('');
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
  return <div><DashboardPageHeader title="Abonnements et paiements" description="Validez les packs et les badges commandés séparément." actions={<button className="secondary-action" onClick={load}><RefreshCw />Actualiser</button>} />
    {error && <div className="alert alert--error">{error}</div>}{expiring.length > 0 && <div className="expiry-alert"><AlertTriangle /><div><strong>{expiring.length} abonnement(s) arrivent à expiration</strong><p>Contactez les universités concernées avant la fin de leur accès.</p></div></div>}
    <div className="subscription-metrics"><article><DollarSign /><div><small>Packs mensuels</small><strong>20–50 $</strong></div></article><article><CreditCard /><div><small>Paiements à vérifier</small><strong>{payments.filter((x) => x.statut === 'EN_ATTENTE').length}</strong></div></article><article><CalendarClock /><div><small>Échéances à 7 jours</small><strong>{expiring.length}</strong></div></article></div>
    <section className="app-panel subscription-section"><div className="app-panel__heading"><div><h2>Paiements reçus</h2><p>Un pack active l’accès ; le paiement badge active uniquement la certification.</p></div></div>{loading ? <div className="content-loading"><Spinner />Chargement…</div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Institution</th><th>Commande</th><th>Montant</th><th>Référence</th><th>Preuve</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{payments.map((item) => <tr key={item.code_paiement}><td><strong>{item.nom_affichage}</strong><small className="cell-subtitle">{item.email} • {item.code_utilisateur}</small></td><td><strong>{item.type_paiement === 'CERTIFICATION' ? 'Badge certifié' : `Pack ${item.nom_plan}`}</strong><small className="cell-subtitle">{item.type_paiement}</small></td><td><strong>{item.montant} {item.devise}</strong></td><td>{item.moyen_paiement}<small className="cell-subtitle">{item.reference_paiement}</small></td><td>{item.url_preuve ? <a className="proof-link" href={item.url_preuve} target="_blank" rel="noreferrer">Consulter</a> : '—'}</td><td><StatusBadge status={item.statut} /></td><td>{item.statut === 'EN_ATTENTE' && <div className="table-actions"><button className="table-action table-action--success" disabled={processing === item.code_paiement} onClick={() => processPayment(item, 'VALIDE')}>{processing === item.code_paiement ? <Spinner /> : <Check />}</button><button className="table-action table-action--danger" disabled={processing === item.code_paiement} onClick={() => processPayment(item, 'REJETE')}><X /></button></div>}</td></tr>)}</tbody></table></div>}</section>
    <section className="app-panel subscription-section"><div className="app-panel__heading"><div><h2>Abonnements universitaires</h2><p>Données réelles des packs et certifications actives.</p></div></div><div className="subscription-grid">{subscriptions.map((item) => <article className={item.jours_restants <= 7 ? 'subscription-card subscription-card--warning' : 'subscription-card'} key={item.code_abonnement}><div><span><BadgeCheck /></span><StatusBadge status={item.statut} /></div><h3>{item.nom_universite || item.nom_affichage}</h3><p>Pack {item.nom_plan} • {item.email}</p><div className="countdown"><strong>{item.jours_restants}</strong><span>jour(s) restant(s)</span></div><small>Badge : {item.est_certifiee ? `actif jusqu’au ${new Date(item.certification_fin).toLocaleDateString('fr-FR')}` : 'non commandé'}</small></article>)}</div></section>
  </div>;
}

export function InstitutionSubscriptionPage() {
  const { token, utilisateur } = useAuth();
  const [subscription, setSubscription] = useState(undefined); const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ codePlan: '', typePaiement: 'ABONNEMENT', moyenPaiement: 'MOBILE_MONEY', referencePaiement: '', urlPreuve: '' });
  const [sending, setSending] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([apiRequest('/abonnements/moi', { token }), apiRequest('/abonnements/plans')])
      .then(([current, available]) => { const list = available.donnees || []; setSubscription(current.donnees); setPlans(list); setForm((value) => ({ ...value, codePlan: current.donnees?.code_plan || list[0]?.code_plan || '' })); })
      .catch((err) => setError(err.message));
  }, [token]);
  const selectedPlan = plans.find((plan) => plan.code_plan === form.codePlan);
  async function order(event) {
    event.preventDefault(); if (!form.urlPreuve) { setError('Ajoutez la preuve du paiement.'); return; }
    setSending(true); setError(''); setMessage('');
    try { await apiRequest('/abonnements/paiements', { method: 'POST', body: { codeUtilisateur: utilisateur.code_utilisateur, ...form } }); setMessage(form.typePaiement === 'CERTIFICATION' ? 'Commande du badge envoyée pour validation.' : 'Commande du pack envoyée pour validation.'); setForm((value) => ({ ...value, referencePaiement: '', urlPreuve: '' })); }
    catch (err) { setError(err.message); } finally { setSending(false); }
  }
  if (subscription === undefined && !error) return <div className="content-loading"><Spinner />Chargement…</div>;
  const amount = form.typePaiement === 'CERTIFICATION' ? 7 : Number(selectedPlan?.prix_total || 0);
  return <div><DashboardPageHeader title="Packs et certification" description="Choisissez votre pack mensuel ; le badge à 7 $ reste indépendant." />{message && <div className="alert alert--success"><Check />{message}</div>}{error && <div className="alert alert--error">{error}</div>}
    <section className="current-subscription app-panel"><div><small>Pack actuel</small><h2>{subscription?.nom_plan || 'Aucun pack actif'}</h2><p>{subscription?.date_fin ? `Expire le ${new Date(subscription.date_fin).toLocaleDateString('fr-FR')}` : 'Commandez un pack pour activer l’espace.'}</p></div><div className="subscription-count subscription-count--light"><strong>{subscription?.jours_restants || 0}</strong><span>jours restants</span></div><div className={subscription?.est_certifiee ? 'certification-state certification-state--active' : 'certification-state'}><BadgeCheck /><span><strong>Badge certifié</strong><small>{subscription?.est_certifiee ? `Actif jusqu’au ${new Date(subscription.certification_fin).toLocaleDateString('fr-FR')}` : 'Disponible séparément à 7 $'}</small></span></div></section>
    <PlanSelector plans={plans} selected={form.typePaiement === 'ABONNEMENT' ? form.codePlan : ''} onSelect={(codePlan) => setForm((value) => ({ ...value, codePlan, typePaiement: 'ABONNEMENT' }))} />
    <button type="button" className={form.typePaiement === 'CERTIFICATION' ? 'badge-order-card badge-order-card--selected' : 'badge-order-card'} disabled={!subscription || subscription.statut !== 'ACTIF'} onClick={() => setForm((value) => ({ ...value, typePaiement: 'CERTIFICATION' }))}><BadgeCheck /><div><strong>Badge CampusHub certifié</strong><p>Identité vérifiée, distinction dans l’annuaire et meilleure visibilité.</p></div><span>7 $<small>/30 jours</small></span></button>
    <form className="app-panel renewal-form pack-payment-form" onSubmit={order}><h2>{form.typePaiement === 'CERTIFICATION' ? 'Commander le badge certifié' : `Commander le pack ${selectedPlan?.nom || ''}`}</h2><p>Montant à envoyer : <strong>{amount} USD</strong></p><div className="form-grid"><label className="editor-field"><span>Moyen de paiement</span><select value={form.moyenPaiement} onChange={(e) => setForm({ ...form, moyenPaiement: e.target.value })}><option value="MOBILE_MONEY">Mobile Money</option><option value="CARTE">Carte</option><option value="VIREMENT">Virement</option><option value="ESPECES">Espèces</option><option value="AUTRE">Autre</option></select></label><label className="editor-field"><span>Référence unique</span><input required minLength="3" value={form.referencePaiement} onChange={(e) => setForm({ ...form, referencePaiement: e.target.value })} /></label></div><FileUploadField label="Preuve de paiement" value={form.urlPreuve} proof onUploaded={(url) => setForm((value) => ({ ...value, urlPreuve: url }))} /><button className="button" disabled={sending || !form.codePlan}>{sending ? <Spinner /> : <><CreditCard />Envoyer la commande de {amount} $</>}</button></form>
  </div>;
}
