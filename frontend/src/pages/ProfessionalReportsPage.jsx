import {
  BadgeCheck,
  Building2,
  FileBarChart,
  GraduationCap,
  Printer,
  RefreshCw,
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

      <section className="report-certification">
        <BadgeCheck />
        <p>Les informations de ce rapport sont générées à partir des données enregistrées dans CampusHub au moment de l’édition. Toute modification ultérieure nécessite une nouvelle génération du document.</p>
      </section>

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

function EmptyReportRow({ colSpan, children }) {
  return <tr><td className="report-table__empty" colSpan={colSpan}>{children}</td></tr>;
}

function AdminProfessionalReport() {
  const { token, utilisateur } = useAuth();
  const [data, setData] = useState({ indicators: {}, activity: [], institutions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboard, institutions] = await Promise.all([
        apiRequest('/administration/tableau-de-bord', { token }),
        safeRequest('/universites?page=1&limite=10', token, []),
      ]);
      setData({
        indicators: dashboard.donnees?.indicateurs || {},
        activity: dashboard.donnees?.activiteMensuelle || [],
        institutions,
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

  return (
    <ReportWorkspace title="Rapport de pilotage administratif" description="Vue officielle des effectifs, validations, activités et actions prioritaires." loading={loading} error={error} onRefresh={load}>
      <FormalReport
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
      </FormalReport>
    </ReportWorkspace>
  );
}

function InstitutionProfessionalReport() {
  const { token, utilisateur } = useAuth();
  const { universite } = useInstitution();
  const [data, setData] = useState({ affiliations: [], offers: [], subscription: null, enrollments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [affiliations, offers, subscription, enrollments] = await Promise.all([
        safeRequest('/affiliations/universite', token, []),
        safeRequest('/offres/moi?page=1&limite=50', token, []),
        safeRequest('/abonnements/moi', token, null),
        safeRequest('/communaute/inscriptions/moi/demandes', token, []),
      ]);
      setData({ affiliations, offers, subscription, enrollments });
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

  const isSchool = universite?.categorie_etablissement === 'ECOLE_SECONDAIRE';
  const affiliationCounts = useMemo(() => data.affiliations.reduce((counts, item) => {
    counts[item.statut] = (counts[item.statut] || 0) + 1;
    return counts;
  }, {}), [data.affiliations]);
  const publishedOffers = data.offers.filter((item) => item.statut === 'PUBLIEE').length;

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

        <ReportSection number="5" title="Observations de gestion">
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
