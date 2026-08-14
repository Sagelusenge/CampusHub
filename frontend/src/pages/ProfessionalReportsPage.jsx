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

const SIGNATURE_CAMPUSHUB = Object.freeze({
  label: 'L’administration CampusHub',
  image: '/images/signature-sagel-lusenge.png',
});

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
  { value: 'CONTRAT', label: 'Contrat', description: 'Contrat institutionnel CampusHub', icon: ScrollText },
  { value: 'FACTURE', label: 'Facture', description: 'Facture d’un établissement', icon: FileText },
  { value: 'RECU', label: 'Reçu', description: 'Preuve d’un paiement validé', icon: Receipt },
  { value: 'RELEVE_CLIENT', label: 'Relevé client', description: 'Historique par établissement', icon: CreditCard },
  { value: 'RELEVE_GLOBAL', label: 'Relevé global', description: 'Paiements de tous les clients', icon: Users },
  { value: 'ECHEANCIER', label: 'Échéancier', description: 'Abonnements et dates de fin', icon: CalendarClock },
];

const INSTITUTION_REPORT_TYPES = [
  { value: 'SYNTHESE', label: 'Synthèse', description: 'Situation générale', icon: FileBarChart },
  { value: 'ETUDIANTS', label: 'Étudiants', description: 'Liste et états des étudiants', icon: Users },
  { value: 'INSCRIPTIONS', label: 'Inscriptions', description: 'Demandes et candidatures', icon: GraduationCap },
  { value: 'ACTIVITE', label: 'Performance', description: 'Activité et engagement social', icon: ShieldCheck },
  { value: 'CONTRAT', label: 'Contrat', description: 'Contrat CampusHub actif', icon: ScrollText },
  { value: 'FACTURE', label: 'Facture', description: 'Factures d’abonnement', icon: FileText },
  { value: 'RECU', label: 'Reçu', description: 'Paiements validés', icon: Receipt },
  { value: 'RELEVE', label: 'Relevé', description: 'Historique des paiements', icon: CreditCard },
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
  className = '',
  signatures = [SIGNATURE_CAMPUSHUB],
}) {
  return (
    <article className={`professional-report ${className}`.trim()}>
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
        {signatures.map((signature) => {
          const bloc = typeof signature === 'string' ? { label: signature } : signature;
          return <div key={bloc.label}><span>{bloc.label}</span>{bloc.image
            ? <div className="report-signature-image"><img src={bloc.image} alt="Signature" /></div>
            : <><i /><small>{bloc.note || 'Nom, signature et date'}</small></>}</div>;
        })}
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
        signatures={[SIGNATURE_CAMPUSHUB]}
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

function ContractArticle({ number, title, children }) {
  return <article className="contract-article"><h3><span>Article {number}</span>{title}</h3><div>{children}</div></article>;
}

function SubscriptionContractDocument({ payment }) {
  if (!payment) return <EmptyFinancialDocument title="Contrat d’abonnement" message="Un paiement validé est nécessaire pour établir le contrat institutionnel CampusHub." />;
  const reference = payment.code_abonnement || `CTR-${payment.code_paiement}`;
  const accesVie = Boolean(payment.est_a_vie);
  return <FormalReport className="professional-report--contract" organization="CampusHub" organizationType="Administration centrale de la plateforme" title="Contrat d’abonnement institutionnel" subtitle={accesVie ? 'Accès à vie aux services numériques CampusHub' : 'Accès annuel renouvelable aux services numériques CampusHub'} reference={reference} status="Contrat actif" signatures={['Le représentant de l’établissement', SIGNATURE_CAMPUSHUB]}>
    <ReportSection number="1" title="Parties au contrat"><ReportFields items={[
      { label: 'Prestataire', value: 'CampusHub — Écosystème académique numérique' },
      { label: 'Établissement client', value: payment.nom_etablissement, wide: true },
      { label: 'Code client', value: payment.code_utilisateur },
      { label: 'Code établissement', value: payment.code_universite || 'En cours d’attribution' },
      { label: 'Adresse électronique', value: payment.email },
      { label: 'Localisation', value: [payment.ville, payment.province].filter(Boolean).join(', ') },
    ]} /></ReportSection>
    <ReportSection number="2" title="Objet et durée"><ReportFields items={[
      { label: 'Formule', value: payment.nom_plan || 'Accès CampusHub' },
      { label: 'Durée contractuelle', value: accesVie ? 'À vie — sans renouvellement' : `${formatNumber(payment.duree_jours || 365)} jours` },
      { label: 'Date de prise d’effet', value: formatDate(payment.date_abonnement_debut) },
      { label: 'Date d’échéance', value: accesVie ? 'Aucune échéance annuelle' : formatDate(payment.date_abonnement_fin) },
      { label: 'Montant contractuel', value: formatCurrency(payment.montant, payment.devise) },
      { label: 'Paiement associé', value: payment.code_paiement },
    ]} /></ReportSection>
    <div className="contract-preamble"><strong>Il a été convenu ce qui suit :</strong><p>Le présent contrat définit les conditions dans lesquelles CampusHub met sa plateforme numérique à la disposition de l’établissement identifié ci-dessus. Les parties déclarent disposer de la capacité nécessaire pour prendre les engagements ci-après.</p></div>
    <ReportSection number="3" title="Services et conditions financières">
      <div className="contract-articles">
        <ContractArticle number="1" title="Objet du contrat"><p>CampusHub accorde à l’établissement un droit personnel, limité, non exclusif et non cessible d’utiliser son espace institutionnel pendant la période contractuelle. Cet accès comprend la gestion de la fiche publique, des campus, formations, services, offres, publications, inscriptions, étudiants affiliés et rapports disponibles dans la formule active.</p></ContractArticle>
        <ContractArticle number="2" title="Prise d’effet et durée"><p>{accesVie ? 'Le contrat prend effet à la date de validation du paiement et accorde un accès permanent, sans échéance de renouvellement, sous réserve du respect continu des présentes clauses.' : `Le contrat prend effet à la date de validation du paiement et reste valable pendant ${formatNumber(payment.duree_jours || 365)} jours, jusqu’à la date d’échéance indiquée. Il n’est pas renouvelé automatiquement : chaque nouvelle tranche annuelle requiert un nouveau paiement et une validation de CampusHub.`}</p></ContractArticle>
        <ContractArticle number="3" title="Prix et paiement"><p>Le prix de la formule choisie est fixé à {formatCurrency(payment.montant, payment.devise)}. Le paiement associé porte la référence <strong>{payment.code_paiement}</strong>. {accesVie ? 'Ce montant constitue un paiement unique pour l’accès à vie.' : 'Ce montant correspond à une tranche annuelle renouvelable de douze mois.'} Sauf correction d’une erreur imputable à CampusHub, tout accès activé reste dû.</p></ContractArticle>
      </div>
    </ReportSection>
    <ReportSection number="4" title="Engagements réciproques">
      <div className="contract-articles">
        <ContractArticle number="4" title="Engagements de CampusHub"><ul><li>maintenir un accès raisonnable et sécurisé aux fonctions souscrites, hors maintenance ou force majeure ;</li><li>protéger les données conformément aux mesures de sécurité applicables ;</li><li>informer l’établissement des changements importants affectant son service ;</li><li>fournir une assistance pour les incidents liés à la plateforme.</li></ul></ContractArticle>
        <ContractArticle number="5" title="Engagements de l’établissement"><ul><li>fournir des informations exactes, licites, vérifiables et régulièrement actualisées ;</li><li>obtenir les autorisations nécessaires avant de publier des photos, vidéos, documents ou données personnelles ;</li><li>ne pas usurper l’identité d’un établissement ni publier de fausses accréditations ;</li><li>traiter loyalement les demandes d’étudiants et respecter les règles de la communauté.</li></ul></ContractArticle>
        <ContractArticle number="6" title="Comptes et sécurité"><p>L’établissement demeure responsable de ses gestionnaires, de la confidentialité des identifiants et des actions réalisées depuis ses comptes. Toute perte, compromission ou utilisation suspecte doit être signalée immédiatement à CampusHub.</p></ContractArticle>
      </div>
    </ReportSection>
    <ReportSection number="5" title="Données, contenus et responsabilité">
      <div className="contract-articles">
        <ContractArticle number="7" title="Données personnelles et confidentialité"><p>Chaque partie limite le traitement des données aux finalités de la plateforme et applique des mesures raisonnables de confidentialité. L’établissement ne doit importer que les données nécessaires et autorisées. Les mots de passe, preuves privées et conversations ne peuvent être rendus publics.</p></ContractArticle>
        <ContractArticle number="8" title="Propriété des contenus"><p>L’établissement conserve ses droits sur les textes et médias qu’il publie et autorise CampusHub à les afficher pour fournir le service. Les logiciels, marques, interfaces et éléments propres à CampusHub restent la propriété de CampusHub.</p></ContractArticle>
        <ContractArticle number="9" title="Exactitude et portée du service"><p>CampusHub facilite l’information, l’orientation et les échanges, mais ne délivre aucune accréditation et ne garantit ni admission, ni diplôme, ni résultat académique. L’établissement assume l’exactitude de ses frais, programmes, dates, conditions et décisions.</p></ContractArticle>
      </div>
    </ReportSection>
    <ReportSection number="6" title="Suspension, fin du contrat et différends">
      <div className="contract-articles">
        <ContractArticle number="10" title="Suspension ou résiliation"><p>CampusHub peut suspendre l’accès en cas d’impayé, fraude, atteinte à la sécurité, contenu illicite ou violation grave du présent contrat. Sauf urgence, l’établissement est informé du motif et dispose d’un délai raisonnable pour corriger le manquement.</p></ContractArticle>
        <ContractArticle number="11" title="Fin de la période"><p>{accesVie ? 'L’accès à vie ne comporte pas d’échéance annuelle. Il peut néanmoins être suspendu ou résilié dans les cas prévus au présent contrat, notamment en cas de fraude, de contenu illicite ou de violation grave.' : 'À l’échéance de la tranche annuelle, les fonctions réservées aux établissements abonnés peuvent être désactivées. Les obligations de confidentialité, de propriété intellectuelle et de responsabilité survivent à la fin du contrat selon leur nature.'}</p></ContractArticle>
        <ContractArticle number="12" title="Force majeure et règlement des différends"><p>Aucune partie n’est responsable d’un retard causé par un événement raisonnablement hors de son contrôle. Les parties privilégient un règlement amiable. À défaut, le différend est soumis aux règles et juridictions compétentes de la République démocratique du Congo.</p></ContractArticle>
        <ContractArticle number="13" title="Assistance et gestion des incidents"><p>L’établissement signale tout incident par les canaux officiels en joignant les éléments utiles au diagnostic. CampusHub accuse réception, classe la priorité selon l’impact observé et met en œuvre des moyens raisonnables de correction. Une maintenance planifiée peut entraîner une indisponibilité temporaire après information préalable lorsque cela est possible.</p></ContractArticle>
        <ContractArticle number="14" title="Restitution, export et conservation des données"><p>Pendant la période active, l’établissement peut exporter les rapports et données rendus disponibles dans son espace. À la fin du contrat, CampusHub peut conserver les informations pendant la durée légalement ou techniquement nécessaire, puis les anonymiser ou les supprimer conformément à sa politique de conservation et aux obligations applicables.</p></ContractArticle>
        <ContractArticle number="15" title="Modification et notifications contractuelles"><p>Toute modification substantielle du prix, de la durée ou du périmètre prend effet après information de l’établissement et, lorsqu’elle concerne une nouvelle période payante, après son acceptation. Les notifications envoyées à l’adresse officielle du compte ou affichées dans l’espace sécurisé sont réputées valablement portées à la connaissance du gestionnaire.</p></ContractArticle>
      </div>
    </ReportSection>
    <div className="contract-acceptance"><strong>Acceptation</strong><p>La signature du présent document confirme que les parties ont lu, compris et accepté l’ensemble de ses clauses. Toute modification doit être constatée par écrit ou validée dans l’espace sécurisé CampusHub.</p></div>
  </FormalReport>;
}

function InvoiceDocument({ payment }) {
  if (!payment) return <EmptyFinancialDocument title="Facture d’abonnement" message="Sélectionnez un client possédant au moins une demande de paiement." />;
  const paid = payment.statut === 'VALIDE';
  return <FormalReport organization="CampusHub" organizationType="Administration centrale de la plateforme" title="Facture d’abonnement" subtitle="Services numériques institutionnels" reference={`FAC-${payment.code_paiement}`} status={paid ? 'Payée' : payment.statut === 'REJETE' ? 'Annulée' : 'À payer'} signatures={[SIGNATURE_CAMPUSHUB]}>
    <ReportSection number="1" title="Facturation"><ReportFields items={[
      { label: 'Facturé à', value: payment.nom_etablissement, wide: true },
      { label: 'Code client', value: payment.code_utilisateur },
      { label: 'Adresse électronique', value: payment.email },
      { label: 'Date d’émission', value: formatDate(payment.date_creation) },
      { label: 'Référence transaction', value: payment.reference_paiement },
    ]} /></ReportSection>
    <ReportSection number="2" title="Détail de la facture"><table className="report-table"><thead><tr><th>Désignation</th><th>Période</th><th>Quantité</th><th>Prix unitaire</th><th>Total</th></tr></thead><tbody><tr><td>{payment.nom_plan || 'Accès CampusHub'}</td><td>{payment.est_a_vie ? 'À vie' : `${payment.duree_jours || 365} jours`}</td><td>1</td><td>{formatCurrency(payment.montant, payment.devise)}</td><td>{formatCurrency(payment.montant, payment.devise)}</td></tr></tbody></table></ReportSection>
    <ReportSection number="3" title="Récapitulatif"><div className="invoice-totals"><div><span>Sous-total</span><strong>{formatCurrency(payment.montant, payment.devise)}</strong></div><div><span>Taxes</span><strong>0,00 {payment.devise || 'USD'}</strong></div><div><span>Total</span><strong>{formatCurrency(payment.montant, payment.devise)}</strong></div><div><span>Solde restant</span><strong>{formatCurrency(paid ? 0 : payment.montant, payment.devise)}</strong></div></div></ReportSection>
  </FormalReport>;
}

function ReceiptDocument({ payment }) {
  if (!payment) return <EmptyFinancialDocument title="Reçu de paiement" message="Seuls les paiements validés peuvent produire un reçu officiel." />;
  return <FormalReport organization="CampusHub" organizationType="Administration centrale de la plateforme" title="Reçu de paiement" subtitle={`Attestation de règlement — ${payment.est_a_vie ? 'accès à vie' : 'accès annuel'}`} reference={`REC-${payment.code_paiement}`} status="Paiement encaissé" signatures={[SIGNATURE_CAMPUSHUB]}>
    <ReportSection number="1" title="Paiement reçu"><div className="receipt-amount"><small>Montant reçu</small><strong>{formatCurrency(payment.montant, payment.devise)}</strong><span>Reçu de {payment.nom_etablissement}</span></div></ReportSection>
    <ReportSection number="2" title="Informations de la transaction"><ReportFields items={[
      { label: 'Code du paiement', value: payment.code_paiement },
      { label: 'Référence externe', value: payment.reference_paiement },
      { label: 'Moyen de paiement', value: labelStatus(payment.moyen_paiement) },
      { label: 'Date de validation', value: formatDate(payment.date_traitement || payment.date_creation) },
      { label: 'Client', value: payment.nom_etablissement, wide: true },
      { label: 'Code client', value: payment.code_utilisateur },
      { label: 'Validé par', value: payment.traite_par || 'Administration CampusHub' },
      { label: 'Objet', value: payment.nom_plan || 'Accès CampusHub', wide: true },
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
  return <FormalReport organization="CampusHub" organizationType="Administration centrale de la plateforme" title={title} subtitle={client ? `Historique financier de ${first?.nom_etablissement || 'l’établissement sélectionné'}` : 'Journal consolidé de tous les établissements'} reference={reportReference(client ? 'REL-CLI' : 'REL-GLB', client ? first?.code_utilisateur : 'TOUS')} status="Relevé consolidé" signatures={[SIGNATURE_CAMPUSHUB]}>
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
  return <FormalReport organization="CampusHub" organizationType="Administration centrale de la plateforme" title="Échéancier des abonnements" subtitle="Suivi des contrats actifs, expirés et proches du renouvellement" reference={reportReference('ECH-ABO')} status="Échéancier à jour" signatures={[SIGNATURE_CAMPUSHUB]}>
    <ReportSection number="1" title="Synthèse des échéances"><div className="report-status-grid"><div><small>Abonnements recensés</small><strong>{formatNumber(subscriptions.length)}</strong></div><div><small>Actifs</small><strong>{formatNumber(subscriptions.filter((item) => item.statut_abonnement === 'ACTIF').length)}</strong></div><div><small>Échéance à 30 jours</small><strong>{formatNumber(subscriptions.filter((item) => Number(item.jours_restants) <= 30).length)}</strong></div><div><small>Expirés</small><strong>{formatNumber(subscriptions.filter((item) => item.statut_abonnement === 'EXPIRE').length)}</strong></div></div></ReportSection>
    <ReportSection number="2" title="Planning de renouvellement"><table className="report-table"><thead><tr><th>Établissement</th><th>Contrat</th><th>Début</th><th>Échéance</th><th>Jours restants</th><th>État</th></tr></thead><tbody>{subscriptions.map((item) => <tr key={item.code_abonnement}><td>{item.nom_etablissement}<small>{item.code_utilisateur}</small></td><td>{item.code_abonnement}</td><td>{formatDate(item.date_abonnement_debut)}</td><td>{formatDate(item.date_abonnement_fin)}</td><td>{formatNumber(item.jours_restants)}</td><td>{labelStatus(item.statut_abonnement)}</td></tr>)}{!subscriptions.length && <EmptyReportRow colSpan={6}>Aucun abonnement validé n’est encore disponible.</EmptyReportRow>}</tbody></table></ReportSection>
  </FormalReport>;
}

function InstitutionProfessionalReport() {
  const { token, utilisateur } = useAuth();
  const { universite } = useInstitution();
  const institutionCode = universite?.code_universite;
  const [data, setData] = useState({ affiliations: [], students: [], offers: [], subscription: null, enrollments: [], financial: { paiements: [], resume: {} }, statistics: { indicateurs: {}, activiteMensuelle: [], repartitionDemandes: {}, engagement: {} } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportType, setReportType] = useState('SYNTHESE');
  const [selectedPayment, setSelectedPayment] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [affiliations, students, offers, subscription, enrollments, financial, statistics] = await Promise.all([
        safeRequest('/affiliations/universite', token, []),
        safeRequest('/affiliations/universite/etudiants?page=1&limite=100', token, []),
        safeRequest('/offres/moi?page=1&limite=50', token, []),
        safeRequest('/abonnements/moi', token, null),
        safeRequest('/communaute/inscriptions/moi/demandes', token, []),
        safeRequest('/abonnements/mes-documents-financiers', token, { paiements: [], resume: {} }),
        institutionCode ? safeRequest(`/universites/${institutionCode}/statistiques`, token, { indicateurs: {}, activiteMensuelle: [], repartitionDemandes: {}, engagement: {} }) : Promise.resolve({ indicateurs: {}, activiteMensuelle: [], repartitionDemandes: {}, engagement: {} }),
      ]);
      setData({ affiliations, students, offers, subscription, enrollments, financial, statistics });
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
  const payments = data.financial.paiements;
  const selectablePayments = reportType === 'RECU' || reportType === 'CONTRAT' ? payments.filter((payment) => payment.statut === 'VALIDE') : payments;
  const currentPayment = selectablePayments.find((payment) => payment.code_paiement === selectedPayment) || selectablePayments[0] || null;

  return (
    <ReportWorkspace title="Centre de documents institutionnels" description={`Listes, analyses et documents financiers de ${universite?.nom || 'votre établissement'}.`} loading={loading} error={error} onRefresh={load}>
      <InstitutionReportSelector reportType={reportType} onReportType={setReportType} payments={selectablePayments} selectedPayment={currentPayment?.code_paiement || ''} onPayment={setSelectedPayment} />
      {reportType === 'SYNTHESE' ? <FormalReport
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
            { label: 'Échéance', value: data.subscription?.est_a_vie ? 'Accès à vie' : formatDate(data.subscription?.date_fin) },
            { label: 'Durée restante', value: data.subscription?.est_a_vie ? 'Illimitée' : (data.subscription ? `${formatNumber(data.subscription.jours_restants)} jour(s)` : '0 jour') },
            { label: 'Formules proposées', value: '20 USD/an ou 200 USD à vie' },
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
      </FormalReport> : <InstitutionDocument type={reportType} universite={universite} students={data.students} affiliations={data.affiliations} enrollments={data.enrollments} offers={data.offers} statistics={data.statistics} payments={payments} payment={currentPayment} />}
    </ReportWorkspace>
  );
}

function InstitutionReportSelector({ reportType, onReportType, payments, selectedPayment, onPayment }) {
  const needsPayment = ['CONTRAT', 'FACTURE', 'RECU'].includes(reportType);
  return <section className="admin-report-selector institution-report-selector app-panel">
    <header><div><small>Documents de l’établissement</small><h2>Choisissez le document à consulter</h2></div><span>{INSTITUTION_REPORT_TYPES.length} modèles disponibles</span></header>
    <div className="admin-report-types institution-report-types">{INSTITUTION_REPORT_TYPES.map(({ value, label, description, icon: Icon }) => <button type="button" className={reportType === value ? 'active' : ''} onClick={() => onReportType(value)} key={value}><Icon /><span><strong>{label}</strong><small>{description}</small></span></button>)}</div>
    {needsPayment && <div className="admin-report-filters"><label><span>Transaction d’abonnement</span><select value={selectedPayment} onChange={(event) => onPayment(event.target.value)} disabled={!payments.length}>{payments.length ? payments.map((payment) => <option value={payment.code_paiement} key={payment.code_paiement}>{payment.code_paiement} · {formatCurrency(payment.montant, payment.devise)} · {labelStatus(payment.statut)}</option>) : <option>Aucune transaction compatible</option>}</select></label></div>}
  </section>;
}

function InstitutionDocument({ type, universite, students, affiliations, enrollments, offers, statistics, payments, payment }) {
  if (type === 'ETUDIANTS') return <InstitutionStudentsDocument universite={universite} students={students} />;
  if (type === 'INSCRIPTIONS') return <InstitutionEnrollmentsDocument universite={universite} affiliations={affiliations} enrollments={enrollments} />;
  if (type === 'ACTIVITE') return <InstitutionActivityDocument universite={universite} offers={offers} statistics={statistics} />;
  if (type === 'CONTRAT') return <SubscriptionContractDocument payment={payment} />;
  if (type === 'FACTURE') return <InvoiceDocument payment={payment} />;
  if (type === 'RECU') return <ReceiptDocument payment={payment} />;
  return <PaymentStatementDocument payments={payments} client />;
}

function InstitutionStudentsDocument({ universite, students }) {
  const isSchool = universite?.categorie_etablissement === 'ECOLE_SECONDAIRE';
  const labels = isSchool ? { singular: 'élève', plural: 'élèves' } : { singular: 'étudiant', plural: 'étudiants' };
  const count = (status) => students.filter((student) => student.statut_institution === status).length;
  return <FormalReport organization={universite?.nom || 'Établissement CampusHub'} organizationType={isSchool ? 'Établissement d’enseignement secondaire' : 'Établissement d’enseignement supérieur et universitaire'} title={`Liste officielle des ${labels.plural}`} subtitle={`Effectifs affiliés et état institutionnel des ${labels.plural}`} reference={reportReference(isSchool ? 'LST-ELEVES' : 'LST-ETUD', universite?.code_universite)} logo={universite?.url_logo} status="Liste mise à jour" signatures={[isSchool ? 'Gestionnaire scolaire' : 'Service académique', 'Autorité de l’établissement']}>
    <ReportSection number="1" title="Synthèse des effectifs"><div className="report-status-grid"><div><small>Total chargé</small><strong>{formatNumber(students.length)}</strong></div><div><small>Actifs</small><strong>{formatNumber(count('ACTIF'))}</strong></div><div><small>Suspendus</small><strong>{formatNumber(count('SUSPENDU'))}</strong></div><div><small>Bloqués / retirés</small><strong>{formatNumber(count('BLOQUE') + count('RETIRE'))}</strong></div></div></ReportSection>
    <ReportSection number="2" title={`Liste des ${labels.plural}`} description={`Identité, matricule, formation et statut de chaque ${labels.singular}.`}><table className="report-table report-table--student-list"><thead><tr><th>N°</th><th>Matricule</th><th>Nom complet</th><th>{isSchool ? 'Option' : 'Filière'}</th><th>Adresse électronique</th><th>Statut</th></tr></thead><tbody>{students.map((student, index) => <tr key={student.code_utilisateur}><td>{index + 1}</td><td>{student.matricule_etudiant || '—'}</td><td>{student.nom_affichage}<small>{student.code_utilisateur}</small></td><td>{student.nom_filiere || 'Non affecté'}</td><td>{student.email}</td><td>{labelStatus(student.statut_institution)}</td></tr>)}{!students.length && <EmptyReportRow colSpan={6}>Aucun {labels.singular} affilié n’est encore enregistré.</EmptyReportRow>}</tbody></table></ReportSection>
  </FormalReport>;
}

function InstitutionEnrollmentsDocument({ universite, affiliations, enrollments }) {
  const isSchool = universite?.categorie_etablissement === 'ECOLE_SECONDAIRE';
  const pendingAffiliations = affiliations.filter((item) => item.statut === 'EN_ATTENTE').length;
  const acceptedAffiliations = affiliations.filter((item) => item.statut === 'ACCEPTEE').length;
  const pendingOnline = enrollments.filter((item) => ['SOUMISE', 'EN_ETUDE', 'DOCUMENTS_REQUIS'].includes(item.statut)).length;
  return <FormalReport organization={universite?.nom || 'Établissement CampusHub'} organizationType={isSchool ? 'Établissement d’enseignement secondaire' : 'Établissement d’enseignement supérieur et universitaire'} title="Rapport des inscriptions et affiliations" subtitle="Dossiers reçus, décisions et suivi des candidats" reference={reportReference('RPT-INS', universite?.code_universite)} logo={universite?.url_logo} status="Suivi des admissions" signatures={['Service des inscriptions', 'Autorité de l’établissement']}>
    <ReportSection number="1" title="Indicateurs"><ReportMetrics items={[{ label: 'Affiliations reçues', value: formatNumber(affiliations.length), icon: Users }, { label: 'Affiliations acceptées', value: formatNumber(acceptedAffiliations), icon: GraduationCap }, { label: 'Candidatures en ligne', value: formatNumber(enrollments.length), icon: FileText }, { label: 'Dossiers à traiter', value: formatNumber(pendingAffiliations + pendingOnline), icon: CalendarClock }]} /></ReportSection>
    <ReportSection number="2" title="Demandes d’affiliation"><table className="report-table"><thead><tr><th>Code</th><th>Candidat</th><th>Matricule</th><th>Formation</th><th>Date</th><th>Décision</th></tr></thead><tbody>{affiliations.map((item) => <tr key={item.code_demande}><td>{item.code_demande}</td><td>{item.nom_affichage}<small>{item.email}</small></td><td>{item.matricule_etudiant || '—'}</td><td>{item.nom_filiere || '—'}</td><td>{formatDate(item.date_creation)}</td><td>{labelStatus(item.statut)}</td></tr>)}{!affiliations.length && <EmptyReportRow colSpan={6}>Aucune demande d’affiliation.</EmptyReportRow>}</tbody></table></ReportSection>
    <ReportSection number="3" title="Candidatures en ligne"><table className="report-table"><thead><tr><th>Code</th><th>Candidat</th><th>Contact</th><th>Date</th><th>Statut</th></tr></thead><tbody>{enrollments.map((item) => <tr key={item.code_demande}><td>{item.code_demande}</td><td>{item.nom_candidat}</td><td>{item.email}<small>{item.telephone || 'Aucun téléphone'}</small></td><td>{formatDate(item.date_creation)}</td><td>{labelStatus(item.statut)}</td></tr>)}{!enrollments.length && <EmptyReportRow colSpan={5}>Aucune candidature en ligne.</EmptyReportRow>}</tbody></table></ReportSection>
  </FormalReport>;
}

function InstitutionActivityDocument({ universite, offers, statistics }) {
  const isSchool = universite?.categorie_etablissement === 'ECOLE_SECONDAIRE';
  const activity = statistics?.activiteMensuelle || [];
  const engagement = statistics?.engagement || {};
  const currentMonth = activity.at(-1) || {};
  const totalInteractions = Number(engagement.mentionsJaime || 0) + Number(engagement.commentaires || 0) + Number(engagement.favoris || 0) + Number(engagement.partages || 0);
  return <FormalReport organization={universite?.nom || 'Établissement CampusHub'} organizationType={isSchool ? 'Établissement d’enseignement secondaire' : 'Établissement d’enseignement supérieur et universitaire'} title="Rapport de performance et d’activité" subtitle="Admissions, offres, publications et engagement de la communauté" reference={reportReference('RPT-PERF', universite?.code_universite)} logo={universite?.url_logo} status="Analyse sur six mois" signatures={['Responsable de la communication', 'Direction de l’établissement']}>
    <ReportSection number="1" title="Activité institutionnelle"><ReportTrendChart data={activity} series={[{ key: 'publications', label: 'Publications', color: '#078d82' }, { key: 'offres', label: 'Offres', color: '#d79b22' }, { key: 'candidatures', label: 'Candidatures', color: '#174b80' }]} /><div className="report-status-grid"><div><small>Publications ce mois</small><strong>{formatNumber(currentMonth.publications)}</strong></div><div><small>Offres ce mois</small><strong>{formatNumber(currentMonth.offres)}</strong></div><div><small>Candidatures ce mois</small><strong>{formatNumber(currentMonth.candidatures)}</strong></div><div><small>Offres actuellement publiées</small><strong>{formatNumber(offers.filter((item) => item.statut === 'PUBLIEE').length)}</strong></div></div></ReportSection>
    <ReportSection number="2" title="Engagement des publications" description="Mentions J’aime, commentaires, enregistrements et republications réellement enregistrés."><ReportTrendChart data={activity} series={[{ key: 'mentionsJaime', label: 'Mentions J’aime', color: '#174b80' }, { key: 'commentaires', label: 'Commentaires', color: '#078d82' }, { key: 'favoris', label: 'Enregistrements', color: '#d79b22' }, { key: 'partages', label: 'Republications', color: '#7c4aa0' }]} /><div className="report-status-grid"><div><small>Mentions J’aime</small><strong>{formatNumber(engagement.mentionsJaime)}</strong></div><div><small>Commentaires</small><strong>{formatNumber(engagement.commentaires)}</strong></div><div><small>Enregistrements</small><strong>{formatNumber(engagement.favoris)}</strong></div><div><small>Interactions totales</small><strong>{formatNumber(totalInteractions)}</strong></div></div></ReportSection>
    <ReportSection number="3" title="Détail mensuel"><table className="report-table report-table--center"><thead><tr><th>Mois</th><th>Publications</th><th>J’aime</th><th>Commentaires</th><th>Enregistrements</th><th>Republications</th></tr></thead><tbody>{activity.map((item) => <tr key={item.mois}><td>{new Date(`${item.mois}-02`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</td><td>{formatNumber(item.publications)}</td><td>{formatNumber(item.mentionsJaime)}</td><td>{formatNumber(item.commentaires)}</td><td>{formatNumber(item.favoris)}</td><td>{formatNumber(item.partages)}</td></tr>)}{!activity.length && <EmptyReportRow colSpan={6}>Aucune activité enregistrée.</EmptyReportRow>}</tbody></table></ReportSection>
  </FormalReport>;
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
