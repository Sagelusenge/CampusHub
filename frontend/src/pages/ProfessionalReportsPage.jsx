import {
  BadgeCheck,
  Building2,
  CalendarClock,
  CreditCard,
  FileBarChart,
  FileText,
  GraduationCap,
  Printer,
  Receipt,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useInstitution } from '../context/InstitutionContext.jsx';

const generatedAt = () => new Date().toLocaleString('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
});

const formatDate = (value) => value
  ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  : 'Non renseignée';

const formatNumber = (value) => Number(value || 0).toLocaleString('fr-FR');
const formatCurrency = (value, devise = 'USD') => `${Number(value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${devise}`;

const percentageChange = (current, previous) => {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  if (!previousValue) return currentValue ? 100 : 0;
  return Math.round(((currentValue - previousValue) / previousValue) * 100);
};

const formatTrend = (value) => `${value > 0 ? '+' : ''}${value}%`;

const labelStatus = (value) => String(value || 'NON RENSEIGNÉ')
  .replaceAll('_', ' ')
  .toLocaleLowerCase('fr-FR')
  .replace(/^./, (letter) => letter.toLocaleUpperCase('fr-FR'));

function academicYear() {
  const today = new Date();
  const firstYear = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
  return `${firstYear}–${firstYear + 1}`;
}

function reportReference(prefix, code = 'GENERAL') {
  const date = new Date();
  return `${prefix}-${String(code).replaceAll(' ', '-').toUpperCase()}-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function safeRequest(path, token, fallback) {
  return apiRequest(path, { token }).then((response) => response.donnees ?? fallback).catch(() => fallback);
}

const ADMIN_REPORT_TYPES = [
  { value: 'PILOTAGE', label: 'Pilotage', description: 'Indicateurs et progression', icon: FileBarChart },
  { value: 'CONTRAT', label: 'Contrat', description: 'Contrat d’abonnement annuel', icon: ScrollText },
  { value: 'FACTURE', label: 'Facture', description: 'Facture d’un établissement', icon: FileText },
  { value: 'RECU', label: 'Reçu', description: 'Preuve d’un paiement validé', icon: Receipt },
  { value: 'RELEVE_CLIENT', label: 'Relevé client', description: 'Historique par établissement', icon: CreditCard },
  { value: 'RELEVE_GLOBAL', label: 'Relevé global', description: 'Paiements de tous les clients', icon: Users },
  { value: 'ECHEANCIER', label: 'Échéancier', description: 'Abonnements et dates de fin', icon: CalendarClock },
];

export function ProfessionalReportsPage({ role }) {
  if (role === 'admin') return <AdminProfessionalReport />;
  if (role === 'institution') return <InstitutionProfessionalReport />;
  return <StudentProfessionalReport />;
}

function ReportWorkspace({ title, description, loading, error, onRefresh, children }) {
  return (
    <div className="report-workspace">
      <div className="report-toolbar">
        <div className="report-toolbar__title">
          <span><FileBarChart /></span>
          <div><small>Document généré depuis les données CampusHub</small><h1>{title}</h1><p>{description}</p></div>
        </div>
        <div className="report-toolbar__actions">
          <button type="button" className="secondary-action" onClick={onRefresh} disabled={loading}><RefreshCw />Actualiser</button>
          <button type="button" className="button" onClick={() => window.print()} disabled={loading}><Printer />Imprimer / PDF</button>
        </div>
      </div>
      {error && <div className="alert alert--error">{error}</div>}
      {loading ? <div className="content-loading app-panel"><Spinner />Préparation du rapport…</div> : children}
    </div>
  );
}

function FormalReport({
  organization,
  organizationType,
  title,
  subtitle,
  reference,
  logo,
  status,
  children,
  signatures = ['Responsable du rapport', 'Visa / cachet'],
}) {
  return (
    <article className="professional-report">
      <header className="report-letterhead">
        <div className="report-letterhead__logo">
          {logo ? <img src={logo} alt={`Logo ${organization}`} /> : <Building2 />}
        </div>
        <div className="report-letterhead__identity">
          <small>République démocratique du Congo</small>
          <span>{organizationType}</span>
          <h2>{organization}</h2>
          <p>CampusHub — Écosystème académique numérique</p>
        </div>
        <div className="report-letterhead__seal"><ShieldCheck /><span>Document<br />CampusHub</span></div>
      </header>

      <div className="report-title-band">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <dl className="report-document-meta">
        <div><dt>Référence</dt><dd>{reference}</dd></div>
        <div><dt>Année académique</dt><dd>{academicYear()}</dd></div>
        <div><dt>Édité le</dt><dd>{generatedAt()}</dd></div>
        <div><dt>État du document</dt><dd><span className="report-state"><BadgeCheck />{status}</span></dd></div>
      </dl>

      {children}

      <section className="report-signatures">
        {signatures.map((signature) => <div key={signature}><span>{signature}</span><i /><small>Nom, signature et date</small></div>)}
      </section>

      <footer className="report-footer">
        <span>CampusHub • Orientation, transparence et vie académique</span>
        <strong>{reference}</strong>
      </footer>
    </article>
  );
}

function ReportSection({ number, title, description, children }) {
  return (
    <section className="report-section">
      <header><span>{String(number).padStart(2, '0')}</span><div><h2>{title}</h2>{description && <p>{description}</p>}</div></header>
      {children}
    </section>
  );
}

function ReportMetrics({ items }) {
  return <div className="report-metrics">{items.map(({ label, value, icon: Icon }) => <div key={label}><span><Icon /></span><small>{label}</small><strong>{value}</strong></div>)}</div>;
}

function ReportFields({ items }) {
  return <dl className="report-fields">{items.map(({ label, value, wide }) => <div className={wide ? 'report-field--wide' : ''} key={label}><dt>{label}</dt><dd>{value || 'Non renseigné'}</dd></div>)}</dl>;
}

function ReportTrendChart({ data, series }) {
  if (!data.length) return <div className="report-chart-empty">Aucune donnée disponible pour tracer la progression.</div>;
  const maxima = Object.fromEntries(series.map((serie) => [serie.key, Math.max(1, ...data.map((item) => Number(item[serie.key] || 0)))]));
  return <div className="report-trend-chart"><div className="report-chart-legend">{series.map((serie) => <span key={serie.key}><i style={{ background: serie.color }} />{serie.label}</span>)}</div><div className="report-chart-bars">{data.map((item) => <div className="report-chart-month" key={item.mois}><div>{series.map((serie) => <span key={serie.key} title={`${serie.label} : ${formatNumber(item[serie.key])}`} style={{ '--bar-height': `${Math.max(5, Number(item[serie.key] || 0) / maxima[serie.key] * 100)}%`, '--bar-color': serie.color }}><b>{formatNumber(item[serie.key])}</b></span>)}</div><small>{new Date(`${item.mois}-02`).toLocaleDateString('fr-FR', { month: 'short' })}</small></div>)}</div></div>;
}

function EmptyReportRow({ colSpan, children }) {
  return <tr><td className="report-table__empty" colSpan={colSpan}>{children}</td></tr>;
}

function AdminProfessionalReport() {
  const { token, utilisateur } = useAuth();
  const [data, setData] = useState({ indicators: {}, activity: [], institutions: [], financial: { paiements: [], resume: {} } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportType, setReportType] = useState('PILOTAGE');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboard, institutions, financial] = await Promise.all([
        apiRequest('/administration/tableau-de-bord', { token }),
        safeRequest('/universites?page=1&limite=10', token, []),
        safeRequest('/abonnements/rapports-financiers', token, { paiements: [], resume: {} }),
      ]);
      setData({
        indicators: dashboard.donnees?.indicateurs || {},
        activity: dashboard.donnees?.activiteMensuelle || [],
        institutions,
        financial,
      });
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const stats = data.indicators;
  const pendingActions = Number(stats.comptes_en_attente || 0)
    + Number(stats.universites_a_verifier || 0)
    + Number(stats.signalements_a_traiter || 0)
    + Number(stats.paiements_a_verifier || 0)
    + Number(stats.villes_a_examiner || 0);
  const latestActivity = data.activity.at(-1) || {};
  const previousActivity = data.activity.at(-2) || {};
  const userGrowth = percentageChange(latestActivity.nouveauxUtilisateurs, previousActivity.nouveauxUtilisateurs);
  const revenueGrowth = percentageChange(latestActivity.revenus, previousActivity.revenus);
  const payments = data.financial.paiements;
  const clients = useMemo(() => [...new Map(payments.map((payment) => [payment.code_utilisateur, {
    code: payment.code_utilisateur,
    name: payment.nom_etablissement || payment.nom_affichage,
    email: payment.email,
  }])).values()].sort((first, second) => first.name.localeCompare(second.name, 'fr')), [payments]);
  const currentClient = clients.some((client) => client.code === selectedClient) ? selectedClient : clients[0]?.code || '';
  const clientPayments = payments.filter((payment) => !currentClient || payment.code_utilisateur === currentClient);
  const selectablePayments = reportType === 'RECU' || reportType === 'CONTRAT'
    ? clientPayments.filter((payment) => payment.statut === 'VALIDE') : clientPayments;
  const currentPayment = selectablePayments.find((payment) => payment.code_paiement === selectedPayment) || selectablePayments[0] || null;

  return (
    <ReportWorkspace title="Centre de rapports administratifs" description="Contrats, factures, reçus, relevés financiers et rapports de pilotage prêts à imprimer." loading={loading} error={error} onRefresh={load}>
      <AdminReportSelector reportType={reportType} onReportType={setReportType} clients={clients} selectedClient={currentClient} onClient={(code) => { setSelectedClient(code); setSelectedPayment(''); }} payments={selectablePayments} selectedPayment={currentPayment?.code_paiement || ''} onPayment={setSelectedPayment} />
      {reportType === 'PILOTAGE' ? <FormalReport
        organization="CampusHub"
        organizationType="Administration centrale de la plateforme"
        title="Rapport de pilotage administratif"
        subtitle="Situation consolidée de la plateforme et suivi des opérations"
        reference={reportReference('RPT-ADM')}
        status="Consolidé"
        signatures={['Administrateur responsable', 'Direction CampusHub']}
      >
        <ReportSection number="1" title="Identification du rapport">
          <ReportFields items={[
            { label: 'Responsable de l’édition', value: utilisateur?.nom_affichage },
            { label: 'Adresse électronique', value: utilisateur?.email },
            { label: 'Code administrateur', value: utilisateur?.code_utilisateur },
            { label: 'Périmètre', value: 'Ensemble de la plateforme CampusHub' },
          ]} />
        </ReportSection>

        <ReportSection number="2" title="Indicateurs consolidés" description="Données calculées directement à partir de la base CampusHub.">
          <ReportMetrics items={[
            { label: 'Utilisateurs', value: formatNumber(stats.utilisateurs), icon: Users },
            { label: 'Établissements', value: formatNumber(stats.universites), icon: Building2 },
            { label: 'Profils étudiants', value: formatNumber(stats.profils_etudiants), icon: GraduationCap },
            { label: 'Actions requises', value: formatNumber(pendingActions), icon: ShieldCheck },
          ]} />
          <table className="report-table">
            <thead><tr><th>Élément à traiter</th><th>Volume</th><th>Niveau de suivi</th></tr></thead>
            <tbody>
              <tr><td>Comptes en attente</td><td>{formatNumber(stats.comptes_en_attente)}</td><td>Validation administrative</td></tr>
              <tr><td>Établissements à vérifier</td><td>{formatNumber(stats.universites_a_verifier)}</td><td>Contrôle de la fiche</td></tr>
              <tr><td>Paiements à vérifier</td><td>{formatNumber(stats.paiements_a_verifier)}</td><td>Contrôle financier</td></tr>
              <tr><td>Signalements ouverts</td><td>{formatNumber(stats.signalements_a_traiter)}</td><td>Modération prioritaire</td></tr>
              <tr><td>Abonnements proches de l’échéance</td><td>{formatNumber(stats.abonnements_expirant_bientot)}</td><td>Alerte à 7 jours</td></tr>
            </tbody>
          </table>
        </ReportSection>

        <ReportSection number="3" title="Activité des six derniers mois">
          <ReportTrendChart data={data.activity} series={[
            { key: 'nouveauxUtilisateurs', label: 'Nouveaux utilisateurs', color: '#174b80' },
            { key: 'revenus', label: 'Revenus validés', color: '#078d82' },
          ]} />
          <div className="report-status-grid report-progress-grid">
            <div><small>Progression des inscriptions</small><strong className={userGrowth < 0 ? 'trend-negative' : 'trend-positive'}>{formatTrend(userGrowth)}</strong></div>
            <div><small>Progression des revenus</small><strong className={revenueGrowth < 0 ? 'trend-negative' : 'trend-positive'}>{formatTrend(revenueGrowth)}</strong></div>
            <div><small>Utilisateurs sur la période</small><strong>{formatNumber(data.activity.reduce((sum, item) => sum + Number(item.nouveauxUtilisateurs || 0), 0))}</strong></div>
            <div><small>Revenus sur la période</small><strong>{formatNumber(data.activity.reduce((sum, item) => sum + Number(item.revenus || 0), 0))} USD</strong></div>
          </div>
          <table className="report-table report-table--center">
            <thead><tr><th>Mois</th><th>Nouveaux utilisateurs</th><th>Revenus validés</th></tr></thead>
            <tbody>
              {data.activity.map((item) => <tr key={item.mois}><td>{new Date(`${item.mois}-02`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</td><td>{formatNumber(item.nouveauxUtilisateurs)}</td><td>{formatNumber(item.revenus)} USD</td></tr>)}
              {!data.activity.length && <EmptyReportRow colSpan={3}>Aucune activité disponible pour cette période.</EmptyReportRow>}
            </tbody>
          </table>
        </ReportSection>

        <ReportSection number="4" title="Échantillon des établissements référencés">
          <table className="report-table">
            <thead><tr><th>Code</th><th>Établissement</th><th>Localisation</th><th>Vérification</th></tr></thead>
            <tbody>
              {data.institutions.map((item) => <tr key={item.code_universite}><td>{item.code_universite}</td><td>{item.nom}</td><td>{[item.ville, item.province].filter(Boolean).join(', ')}</td><td>{labelStatus(item.statut_verification)}</td></tr>)}
              {!data.institutions.length && <EmptyReportRow colSpan={4}>Aucun établissement disponible.</EmptyReportRow>}
            </tbody>
          </table>
        </ReportSection>
      </FormalReport> : <AdminFinancialDocument type={reportType} payments={payments} clientCode={currentClient} payment={currentPayment} summary={data.financial?.resume || {}} />}
    </ReportWorkspace>
  );
}

function AdminReportSelector({ reportType, onReportType, clients, selectedClient, onClient, payments, selectedPayment, onPayment }) {
  const needsClient = ['CONTRAT', 'FACTURE', 'RECU', 'RELEVE_CLIENT'].includes(reportType);
  const needsPayment = ['CONTRAT', 'FACTURE', 'RECU'].includes(reportType);
  return <section className="admin-report-selector app-panel">
    <header><div><small>Documents disponibles</small><h2>Choisissez le rapport à produire</h2></div><span>{ADMIN_REPORT_TYPES.length} modèles professionnels</span></header>
    <div className="admin-report-types">{ADMIN_REPORT_TYPES.map(({ value, label, description, icon: Icon }) => <button type="button" className={reportType === value ? 'active' : ''} onClick={() => onReportType(value)} key={value}><Icon /><span><strong>{label}</strong><small>{description}</small></span></button>)}</div>
    {(needsClient || needsPayment) && <div className="admin-report-filters">
      {needsClient && <label><span>Établissement / client</span><select value={selectedClient} onChange={(event) => onClient(event.target.value)} disabled={!clients.length}>{clients.length ? clients.map((client) => <option value={client.code} key={client.code}>{client.name} — {client.code}</option>) : <option>Aucun client disponible</option>}</select></label>}
      {needsPayment && <label><span>Transaction</span><select value={selectedPayment} onChange={(event) => onPayment(event.target.value)} disabled={!payments.length}>{payments.length ? payments.map((payment) => <option value={payment.code_paiement} key={payment.code_paiement}>{payment.code_paiement} · {formatCurrency(payment.montant, payment.devise)} · {labelStatus(payment.statut)}</option>) : <option>Aucune transaction compatible</option>}</select></label>}
    </div>}
  </section>;
}

function AdminFinancialDocument({ type, payments, clientCode, payment, summary }) {
  if (type === 'CONTRAT') return <SubscriptionContractDocument payment={payment} />;
  if (type === 'FACTURE') return <InvoiceDocument payment={payment} />;
  if (type === 'RECU') return <ReceiptDocument payment={payment} />;
  if (type === 'RELEVE_CLIENT') return <PaymentStatementDocument payments={payments.filter((item) => item.code_utilisateur === clientCode)} client />;
  if (type === 'ECHEANCIER') return <SubscriptionScheduleDocument payments={payments} />;
  return <PaymentStatementDocument payments={payments} summary={summary} />;
}

function EmptyFinancialDocument({ title, message }) {
  return <FormalReport organization="CampusHub" organizationType="Administration centrale de la plateforme" title={title} subtitle="Document administratif et financier" reference={reportReference('DOC-ADM')} status="Aucune donnée"><ReportSection number="1" title="Document indisponible"><div className="report-observation"><strong>Aucune donnée compatible</strong><p>{message}</p></div></ReportSection></FormalReport>;
}

function SubscriptionContractDocument({ payment }) {
  if (!payment) return <EmptyFinancialDocument title="Contrat d’abonnement" message="Un paiement validé est nécessaire pour établir le contrat d’abonnement annuel." />;
  const reference = payment.code_abonnement || `CTR-${payment.code_paiement}`;
  return <FormalReport organization="CampusHub" organizationType="Administration centrale de la plateforme" title="Contrat d’abonnement institutionnel" subtitle="Accès annuel aux services numériques CampusHub" reference={reference} status="Contrat actif" signatures={['Le représentant de l’établissement', 'L’administration CampusHub']}>
    <ReportSection number="1" title="Parties au contrat"><ReportFields items={[
      { label: 'Prestataire', value: 'CampusHub — Écosystème académique numérique' },
      { label: 'Établissement client', value: payment.nom_etablissement, wide: true },
      { label: 'Code client', value: payment.code_utilisateur },
      { label: 'Code établissement', value: payment.code_universite || 'En cours d’attribution' },
      { label: 'Adresse électronique', value: payment.email },
      { label: 'Localisation', value: [payment.ville, payment.province].filter(Boolean).join(', ') },
    ]} /></ReportSection>
    <ReportSection number="2" title="Objet et durée"><ReportFields items={[
      { label: 'Formule', value: payment.nom_plan || 'Abonnement annuel CampusHub' },
      { label: 'Durée contractuelle', value: `${formatNumber(payment.duree_jours || 365)} jours` },
      { label: 'Date de prise d’effet', value: formatDate(payment.date_abonnement_debut) },
      { label: 'Date d’échéance', value: formatDate(payment.date_abonnement_fin) },
      { label: 'Montant contractuel', value: formatCurrency(payment.montant, payment.devise) },
      { label: 'Paiement associé', value: payment.code_paiement },
    ]} /></ReportSection>
    <ReportSection number="3" title="Engagements contractuels"><div className="report-observation contract-clauses"><ol><li>CampusHub accorde au client l’accès aux fonctions institutionnelles pendant la durée indiquée.</li><li>L’établissement s’engage à publier des informations exactes, licites et régulièrement mises à jour.</li><li>Les comptes gestionnaires restent sous la responsabilité de l’établissement client.</li><li>Le renouvellement nécessite un nouveau paiement annuel de 10 USD et une validation administrative.</li><li>CampusHub peut suspendre l’accès en cas de fraude, d’abus ou de violation des règles de la communauté.</li></ol></div></ReportSection>
  </FormalReport>;
}

function InvoiceDocument({ payment }) {
  if (!payment) return <EmptyFinancialDocument title="Facture d’abonnement" message="Sélectionnez un client possédant au moins une demande de paiement." />;
  const paid = payment.statut === 'VALIDE';
  return <FormalReport organization="CampusHub" organizationType="Administration centrale de la plateforme" title="Facture d’abonnement" subtitle="Services numériques institutionnels" reference={`FAC-${payment.code_paiement}`} status={paid ? 'Payée' : payment.statut === 'REJETE' ? 'Annulée' : 'À payer'} signatures={['Service administratif CampusHub', 'Client / réception']}>
    <ReportSection number="1" title="Facturation"><ReportFields items={[
      { label: 'Facturé à', value: payment.nom_etablissement, wide: true },
      { label: 'Code client', value: payment.code_utilisateur },
      { label: 'Adresse électronique', value: payment.email },
      { label: 'Date d’émission', value: formatDate(payment.date_creation) },
      { label: 'Référence transaction', value: payment.reference_paiement },
    ]} /></ReportSection>
    <ReportSection number="2" title="Détail de la facture"><table className="report-table"><thead><tr><th>Désignation</th><th>Période</th><th>Quantité</th><th>Prix unitaire</th><th>Total</th></tr></thead><tbody><tr><td>{payment.nom_plan || 'Abonnement annuel CampusHub'}</td><td>{payment.duree_jours || 365} jours</td><td>1</td><td>{formatCurrency(payment.montant, payment.devise)}</td><td>{formatCurrency(payment.montant, payment.devise)}</td></tr></tbody></table></ReportSection>
    <ReportSection number="3" title="Récapitulatif"><div className="invoice-totals"><div><span>Sous-total</span><strong>{formatCurrency(payment.montant, payment.devise)}</strong></div><div><span>Taxes</span><strong>0,00 {payment.devise || 'USD'}</strong></div><div><span>Total</span><strong>{formatCurrency(payment.montant, payment.devise)}</strong></div><div><span>Solde restant</span><strong>{formatCurrency(paid ? 0 : payment.montant, payment.devise)}</strong></div></div></ReportSection>
  </FormalReport>;
}

function ReceiptDocument({ payment }) {
  if (!payment) return <EmptyFinancialDocument title="Reçu de paiement" message="Seuls les paiements validés peuvent produire un reçu officiel." />;
  return <FormalReport organization="CampusHub" organizationType="Administration centrale de la plateforme" title="Reçu de paiement" subtitle="Attestation de règlement de l’abonnement annuel" reference={`REC-${payment.code_paiement}`} status="Paiement encaissé" signatures={['Agent ayant validé le paiement', 'Cachet CampusHub']}>
    <ReportSection number="1" title="Paiement reçu"><div className="receipt-amount"><small>Montant reçu</small><strong>{formatCurrency(payment.montant, payment.devise)}</strong><span>Reçu de {payment.nom_etablissement}</span></div></ReportSection>
    <ReportSection number="2" title="Informations de la transaction"><ReportFields items={[
      { label: 'Code du paiement', value: payment.code_paiement },
      { label: 'Référence externe', value: payment.reference_paiement },
      { label: 'Moyen de paiement', value: labelStatus(payment.moyen_paiement) },
      { label: 'Date de validation', value: formatDate(payment.date_traitement || payment.date_creation) },
      { label: 'Client', value: payment.nom_etablissement, wide: true },
      { label: 'Code client', value: payment.code_utilisateur },
      { label: 'Validé par', value: payment.traite_par || 'Administration CampusHub' },
      { label: 'Objet', value: payment.nom_plan || 'Abonnement annuel CampusHub', wide: true },
    ]} /></ReportSection>
  </FormalReport>;
}

function PaymentStatementDocument({ payments, client = false, summary = {} }) {
  const first = payments[0];
  const totals = payments.reduce((result, item) => {
    result.total += Number(item.montant || 0);
    if (item.statut === 'VALIDE') result.validated += Number(item.montant || 0);
    if (item.statut === 'EN_ATTENTE') result.pending += Number(item.montant || 0);
    return result;
  }, { total: 0, validated: 0, pending: 0 });
  const title = client ? 'Relevé de paiement client' : 'Relevé global des paiements';
  return <FormalReport organization="CampusHub" organizationType="Administration centrale de la plateforme" title={title} subtitle={client ? `Historique financier de ${first?.nom_etablissement || 'l’établissement sélectionné'}` : 'Journal consolidé de tous les établissements'} reference={reportReference(client ? 'REL-CLI' : 'REL-GLB', client ? first?.code_utilisateur : 'TOUS')} status="Relevé consolidé" signatures={['Service financier CampusHub', 'Visa administratif']}>
    <ReportSection number="1" title="Périmètre du relevé"><ReportFields items={client ? [
      { label: 'Établissement', value: first?.nom_etablissement, wide: true },
      { label: 'Code client', value: first?.code_utilisateur },
      { label: 'Adresse électronique', value: first?.email },
      { label: 'Nombre de transactions', value: formatNumber(payments.length) },
      { label: 'Période couverte', value: payments.length ? `${formatDate(payments.at(-1)?.date_creation)} au ${formatDate(payments[0]?.date_creation)}` : 'Aucune transaction' },
    ] : [
      { label: 'Nombre de clients', value: formatNumber(summary.nombreClients || new Set(payments.map((item) => item.code_utilisateur)).size) },
      { label: 'Nombre de transactions', value: formatNumber(payments.length) },
      { label: 'Période couverte', value: payments.length ? `${formatDate(payments.at(-1)?.date_creation)} au ${formatDate(payments[0]?.date_creation)}` : 'Aucune transaction', wide: true },
    ]} /></ReportSection>
    <ReportSection number="2" title="Synthèse financière"><div className="report-status-grid"><div><small>Montant enregistré</small><strong>{formatCurrency(totals.total)}</strong></div><div><small>Montant encaissé</small><strong>{formatCurrency(totals.validated)}</strong></div><div><small>Montant en attente</small><strong>{formatCurrency(totals.pending)}</strong></div><div><small>Transactions</small><strong>{formatNumber(payments.length)}</strong></div></div></ReportSection>
    <ReportSection number="3" title="Détail des opérations"><table className="report-table report-table--payments"><thead><tr>{!client && <th>Client</th>}<th>Date</th><th>Code</th><th>Mode / référence</th><th>Montant</th><th>Statut</th></tr></thead><tbody>{payments.map((item) => <tr key={item.code_paiement}>{!client && <td>{item.nom_etablissement}<small>{item.code_utilisateur}</small></td>}<td>{formatDate(item.date_creation)}</td><td>{item.code_paiement}</td><td>{labelStatus(item.moyen_paiement)}<small>{item.reference_paiement}</small></td><td>{formatCurrency(item.montant, item.devise)}</td><td>{labelStatus(item.statut)}</td></tr>)}{!payments.length && <EmptyReportRow colSpan={client ? 5 : 6}>Aucun paiement enregistré pour ce périmètre.</EmptyReportRow>}</tbody></table></ReportSection>
  </FormalReport>;
}

function SubscriptionScheduleDocument({ payments }) {
  const subscriptions = payments.filter((item) => item.code_abonnement);
  return <FormalReport organization="CampusHub" organizationType="Administration centrale de la plateforme" title="Échéancier des abonnements" subtitle="Suivi des contrats actifs, expirés et proches du renouvellement" reference={reportReference('ECH-ABO')} status="Échéancier à jour" signatures={['Responsable des abonnements', 'Direction CampusHub']}>
    <ReportSection number="1" title="Synthèse des échéances"><div className="report-status-grid"><div><small>Abonnements recensés</small><strong>{formatNumber(subscriptions.length)}</strong></div><div><small>Actifs</small><strong>{formatNumber(subscriptions.filter((item) => item.statut_abonnement === 'ACTIF').length)}</strong></div><div><small>Échéance à 30 jours</small><strong>{formatNumber(subscriptions.filter((item) => Number(item.jours_restants) <= 30).length)}</strong></div><div><small>Expirés</small><strong>{formatNumber(subscriptions.filter((item) => item.statut_abonnement === 'EXPIRE').length)}</strong></div></div></ReportSection>
    <ReportSection number="2" title="Planning de renouvellement"><table className="report-table"><thead><tr><th>Établissement</th><th>Contrat</th><th>Début</th><th>Échéance</th><th>Jours restants</th><th>État</th></tr></thead><tbody>{subscriptions.map((item) => <tr key={item.code_abonnement}><td>{item.nom_etablissement}<small>{item.code_utilisateur}</small></td><td>{item.code_abonnement}</td><td>{formatDate(item.date_abonnement_debut)}</td><td>{formatDate(item.date_abonnement_fin)}</td><td>{formatNumber(item.jours_restants)}</td><td>{labelStatus(item.statut_abonnement)}</td></tr>)}{!subscriptions.length && <EmptyReportRow colSpan={6}>Aucun abonnement validé n’est encore disponible.</EmptyReportRow>}</tbody></table></ReportSection>
  </FormalReport>;
}

function InstitutionProfessionalReport() {
  const { token, utilisateur } = useAuth();
  const { universite } = useInstitution();
  const institutionCode = universite?.code_universite;
  const [data, setData] = useState({ affiliations: [], offers: [], subscription: null, enrollments: [], statistics: { indicateurs: {}, activiteMensuelle: [], repartitionDemandes: {} } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [affiliations, offers, subscription, enrollments, statistics] = await Promise.all([
        safeRequest('/affiliations/universite', token, []),
        safeRequest('/offres/moi?page=1&limite=50', token, []),
        safeRequest('/abonnements/moi', token, null),
        safeRequest('/communaute/inscriptions/moi/demandes', token, []),
        institutionCode ? safeRequest(`/universites/${institutionCode}/statistiques`, token, { indicateurs: {}, activiteMensuelle: [], repartitionDemandes: {} }) : Promise.resolve({ indicateurs: {}, activiteMensuelle: [], repartitionDemandes: {} }),
      ]);
      setData({ affiliations, offers, subscription, enrollments, statistics });
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token, institutionCode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const isSchool = universite?.categorie_etablissement === 'ECOLE_SECONDAIRE';
  const affiliationCounts = useMemo(() => data.affiliations.reduce((counts, item) => {
    counts[item.statut] = (counts[item.statut] || 0) + 1;
    return counts;
  }, {}), [data.affiliations]);
  const publishedOffers = data.offers.filter((item) => item.statut === 'PUBLIEE').length;
  const monthlyActivity = data.statistics?.activiteMensuelle || [];
  const requestDistribution = data.statistics?.repartitionDemandes || {};
  const requestTotal = Number(requestDistribution.enAttente || 0) + Number(requestDistribution.acceptees || 0) + Number(requestDistribution.rejetees || 0);
  const acceptanceRate = requestTotal ? Math.round(Number(requestDistribution.acceptees || 0) / requestTotal * 100) : 0;

  return (
    <ReportWorkspace title="Rapport institutionnel" description={`Situation académique et opérationnelle de ${universite?.nom || 'votre établissement'}.`} loading={loading} error={error} onRefresh={load}>
      <FormalReport
        organization={universite?.nom || 'Établissement CampusHub'}
        organizationType={isSchool ? 'Établissement d’enseignement secondaire' : 'Établissement d’enseignement supérieur et universitaire'}
        title={isSchool ? 'Rapport de situation scolaire' : 'Rapport de situation académique'}
        subtitle="Fiche institutionnelle, effectifs liés, formations et services numériques"
        reference={reportReference(isSchool ? 'RPT-ECOLE' : 'RPT-UNIV', universite?.code_universite)}
        logo={universite?.url_logo}
        status={universite?.statut_verification === 'VERIFIEE' ? 'Établissement vérifié' : labelStatus(universite?.statut_verification)}
        signatures={[isSchool ? 'Gestionnaire scolaire' : 'Gestionnaire universitaire', 'Autorité de l’établissement']}
      >
        <ReportSection number="1" title="Identité de l’établissement">
          <ReportFields items={[
            { label: 'Dénomination officielle', value: universite?.nom, wide: true },
            { label: 'Sigle', value: universite?.sigle },
            { label: 'Code CampusHub', value: universite?.code_universite },
            { label: 'Catégorie', value: labelStatus(universite?.categorie_etablissement) },
            { label: 'Gestionnaire', value: utilisateur?.nom_affichage },
            { label: 'Adresse électronique', value: universite?.email || utilisateur?.email },
            { label: 'Téléphone', value: universite?.telephone },
            { label: 'Localisation', value: [universite?.ville, universite?.province, universite?.pays].filter(Boolean).join(', '), wide: true },
          ]} />
        </ReportSection>

        <ReportSection number="2" title="Situation institutionnelle">
          <ReportMetrics items={[
            { label: isSchool ? 'Options actives' : 'Filières actives', value: formatNumber(universite?.filieres?.length), icon: GraduationCap },
            { label: isSchool ? 'Élèves liés' : 'Étudiants liés', value: formatNumber(universite?.nombre_etudiants), icon: Users },
            { label: 'Campus / sites', value: formatNumber(universite?.campus?.length), icon: Building2 },
            { label: 'Offres publiées', value: formatNumber(publishedOffers), icon: FileBarChart },
          ]} />
          <ReportFields items={[
            { label: 'État de vérification', value: labelStatus(universite?.statut_verification) },
            { label: 'Abonnement', value: data.subscription?.nom_plan || 'Aucun abonnement actif' },
            { label: 'Échéance annuelle', value: formatDate(data.subscription?.date_fin) },
            { label: 'Jours restants', value: data.subscription ? `${formatNumber(data.subscription.jours_restants)} jour(s)` : '0 jour' },
            { label: 'Tarif annuel', value: '10 USD' },
            { label: 'Inscriptions en ligne reçues', value: formatNumber(data.enrollments.length) },
          ]} />
        </ReportSection>

        <ReportSection number="3" title={isSchool ? 'Sections et options' : 'Facultés et filières'} description="Liste des formations actives visibles dans la fiche publique.">
          <table className="report-table">
            <thead><tr><th>Code</th><th>{isSchool ? 'Option' : 'Filière'}</th><th>{isSchool ? 'Section' : 'Faculté'}</th><th>Niveau</th></tr></thead>
            <tbody>
              {(universite?.filieres || []).slice(0, 12).map((item) => <tr key={item.code_filiere}><td>{item.code_filiere}</td><td>{item.nom_filiere || item.nom}</td><td>{item.nom_faculte || '—'}</td><td>{item.niveau || item.niveau_diplome || '—'}</td></tr>)}
              {!universite?.filieres?.length && <EmptyReportRow colSpan={4}>Aucune formation active renseignée.</EmptyReportRow>}
            </tbody>
          </table>
        </ReportSection>

        <ReportSection number="4" title={isSchool ? 'Suivi des élèves' : 'Suivi des étudiants'}>
          <div className="report-status-grid">
            <div><small>Demandes reçues</small><strong>{formatNumber(data.affiliations.length)}</strong></div>
            <div><small>Confirmées</small><strong>{formatNumber(affiliationCounts.ACCEPTEE)}</strong></div>
            <div><small>En attente</small><strong>{formatNumber(affiliationCounts.EN_ATTENTE)}</strong></div>
            <div><small>Refusées</small><strong>{formatNumber((affiliationCounts.REJETEE || 0) + (affiliationCounts.REFUSEE || 0))}</strong></div>
          </div>
          <table className="report-table">
            <thead><tr><th>Identité</th><th>{isSchool ? 'Option' : 'Filière'}</th><th>Matricule</th><th>Statut</th></tr></thead>
            <tbody>
              {data.affiliations.slice(0, 10).map((item) => <tr key={item.code_demande}><td>{item.nom_affichage}</td><td>{item.nom_filiere}</td><td>{item.matricule_etudiant || '—'}</td><td>{labelStatus(item.statut)}</td></tr>)}
              {!data.affiliations.length && <EmptyReportRow colSpan={4}>Aucune demande d’affiliation enregistrée.</EmptyReportRow>}
            </tbody>
          </table>
        </ReportSection>

        <ReportSection number="5" title="Progression de l’activité" description="Évolution mensuelle calculée à partir des publications, offres et candidatures enregistrées.">
          <ReportTrendChart data={monthlyActivity} series={[
            { key: 'publications', label: 'Publications', color: '#078d82' },
            { key: 'offres', label: 'Offres', color: '#d79b22' },
            { key: 'candidatures', label: 'Candidatures', color: '#174b80' },
          ]} />
          <div className="report-status-grid report-progress-grid">
            <div><small>Publications sur 6 mois</small><strong>{formatNumber(monthlyActivity.reduce((sum, item) => sum + Number(item.publications || 0), 0))}</strong></div>
            <div><small>Offres sur 6 mois</small><strong>{formatNumber(monthlyActivity.reduce((sum, item) => sum + Number(item.offres || 0), 0))}</strong></div>
            <div><small>Candidatures sur 6 mois</small><strong>{formatNumber(monthlyActivity.reduce((sum, item) => sum + Number(item.candidatures || 0), 0))}</strong></div>
            <div><small>Taux d’acceptation</small><strong>{acceptanceRate}%</strong></div>
          </div>
        </ReportSection>

        <ReportSection number="6" title="Observations de gestion">
          <div className="report-observation">
            <p>{universite?.description || 'La présentation institutionnelle n’a pas encore été renseignée.'}</p>
            <ul>
              <li>{universite?.services?.length || 0} service(s) actif(s) et {universite?.infrastructures?.length || 0} infrastructure(s) renseignée(s).</li>
              <li>{universite?.conditionsAdmission?.length || 0} condition(s) d’admission publiée(s).</li>
              <li>{data.offers.length} offre(s) enregistrée(s), dont {publishedOffers} actuellement publiée(s).</li>
            </ul>
          </div>
        </ReportSection>
      </FormalReport>
    </ReportWorkspace>
  );
}

function StudentProfessionalReport() {
  const { token, utilisateur } = useAuth();
  const [data, setData] = useState({ affiliations: [], profile: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [affiliations, profile] = await Promise.all([
        safeRequest('/affiliations/moi', token, []),
        safeRequest('/profils/moi', token, null),
      ]);
      setData({ affiliations, profile });
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const current = data.affiliations.find((item) => item.statut === 'ACCEPTEE') || data.affiliations[0];
  const profile = data.profile || {};
  const skills = Array.isArray(profile.competences) ? profile.competences : [];

  return (
    <ReportWorkspace title="Fiche de parcours étudiant" description="Document récapitulatif de votre identité académique, affiliation et profil CampusHub." loading={loading} error={error} onRefresh={load}>
      <FormalReport
        organization={current?.nom_universite || 'CampusHub'}
        organizationType={current?.nom_universite ? 'Établissement d’affiliation déclaré' : 'Écosystème académique numérique'}
        title="Fiche de parcours étudiant"
        subtitle="Identification, affiliation académique et compétences déclarées"
        reference={reportReference('RPT-ETU', utilisateur?.code_utilisateur)}
        status={current?.statut === 'ACCEPTEE' ? 'Affiliation confirmée' : current ? `Affiliation ${labelStatus(current.statut).toLowerCase()}` : 'Sans affiliation'}
        signatures={['Étudiant(e)', 'Service académique / établissement']}
      >
        <ReportSection number="1" title="Identité de l’étudiant">
          <ReportFields items={[
            { label: 'Nom complet', value: utilisateur?.nom_affichage, wide: true },
            { label: 'Code CampusHub', value: utilisateur?.code_utilisateur },
            { label: 'Matricule étudiant', value: profile.matricule_etudiant || current?.matricule_etudiant },
            { label: 'Adresse électronique', value: utilisateur?.email },
            { label: 'Localisation', value: [utilisateur?.ville, utilisateur?.province, utilisateur?.pays].filter(Boolean).join(', ') },
            { label: 'Compte vérifié', value: utilisateur?.statut_verification === 'VERIFIE' ? 'Oui' : labelStatus(utilisateur?.statut_verification) },
            { label: 'Membre depuis', value: formatDate(utilisateur?.date_creation) },
          ]} />
        </ReportSection>

        <ReportSection number="2" title="Situation académique">
          <ReportFields items={[
            { label: 'Établissement', value: current?.nom_universite, wide: true },
            { label: 'Filière / option', value: current?.nom_filiere, wide: true },
            { label: 'Code de la demande', value: current?.code_demande },
            { label: 'État de l’affiliation', value: labelStatus(current?.statut) },
            { label: 'Date de la demande', value: formatDate(current?.date_creation) },
            { label: 'Année de diplomation prévue', value: profile.annee_diplomation },
          ]} />
          {current?.reponse_universite && <div className="report-observation"><strong>Réponse de l’établissement</strong><p>{current.reponse_universite}</p></div>}
        </ReportSection>

        <ReportSection number="3" title="Profil et compétences">
          <ReportFields items={[
            { label: 'Titre du profil', value: profile.titre_profil, wide: true },
            { label: 'Visibilité du portfolio', value: profile.est_visible ? 'Visible dans CampusHub' : 'Profil privé' },
            { label: 'Nombre de compétences', value: formatNumber(skills.length) },
          ]} />
          <div className="report-skills">
            {skills.length ? skills.map((skill) => <span key={skill}>{skill}</span>) : <p>Aucune compétence n’a encore été renseignée.</p>}
          </div>
        </ReportSection>

        <ReportSection number="4" title="Historique des affiliations">
          <table className="report-table">
            <thead><tr><th>Référence</th><th>Établissement</th><th>Filière / option</th><th>Date</th><th>Statut</th></tr></thead>
            <tbody>
              {data.affiliations.map((item) => <tr key={item.code_demande}><td>{item.code_demande}</td><td>{item.nom_universite}</td><td>{item.nom_filiere}</td><td>{formatDate(item.date_creation)}</td><td>{labelStatus(item.statut)}</td></tr>)}
              {!data.affiliations.length && <EmptyReportRow colSpan={5}>Aucune affiliation enregistrée.</EmptyReportRow>}
            </tbody>
          </table>
        </ReportSection>

        <ReportSection number="5" title="Déclaration">
          <div className="report-declaration">
            Je certifie que les renseignements figurant sur cette fiche correspondent aux informations enregistrées dans mon compte CampusHub. Ce document ne remplace pas une attestation officielle délivrée par l’établissement.
          </div>
        </ReportSection>
      </FormalReport>
    </ReportWorkspace>
  );
}
