import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  Check,
  Clock3,
  FileText,
  GraduationCap,
  Landmark,
  MapPin,
  Plus,
  School,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { PageShell } from '../components/PageShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const initialForm = {
  nom: '', sigle: '', slug: '', type: 'PRIVEE', description: '',
  ville: 'Goma', province: 'Nord-Kivu', email: '', telephone: '',
};

export function InstitutionDashboardPage() {
  const { token, utilisateur } = useAuth();
  const [universite, setUniversite] = useState(undefined);
  const [form, setForm] = useState(() => ({ ...initialForm, email: utilisateur?.email || '' }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiRequest('/universites/moi', { token });
      setUniversite(response.donnees);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Le chargement synchronise l'écran avec la fiche distante au montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  function update(field) {
    return (event) => {
      const value = event.target.value;
      setForm((current) => ({
        ...current,
        [field]: value,
        ...(field === 'nom' && !current.slug
          ? { slug: value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
          : {}),
      }));
    };
  }

  async function creerFiche(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiRequest('/universites', { method: 'POST', token, body: form });
      await charger();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageShell footer={false}><div className="full-loading"><Spinner /> Préparation de votre espace…</div></PageShell>;
  }

  if (!universite) {
    return (
      <PageShell>
        <section className="onboarding-page">
          <div className="container onboarding-heading">
            <div className="success-icon success-icon--small"><Check size={23} /></div>
            <div><span className="eyebrow eyebrow--accent">Compte institutionnel activé</span><h1>Bienvenue sur CampusHub.</h1><p>Complétez maintenant la fiche qui sera envoyée à l’administration pour publication.</p></div>
          </div>
          <div className="container onboarding-layout">
            <aside className="onboarding-steps">
              <div className="onboarding-step onboarding-step--done"><span><Check /></span><div><strong>Compte validé</strong><small>Votre accès est actif.</small></div></div>
              <div className="onboarding-step onboarding-step--active"><span>2</span><div><strong>Fiche universitaire</strong><small>Identité et coordonnées.</small></div></div>
              <div className="onboarding-step"><span>3</span><div><strong>Catalogue académique</strong><small>Campus, facultés et filières.</small></div></div>
              <div className="onboarding-step"><span>4</span><div><strong>Publication</strong><small>Vérification finale CampusHub.</small></div></div>
            </aside>
            <form className="form-card university-form" onSubmit={creerFiche}>
              <div className="form-heading form-field--wide"><span className="eyebrow">Informations publiques</span><h2>Créer la fiche de l’université</h2><p>Ces informations pourront être enrichies après la création.</p></div>
              {error && <div className="alert alert--error form-field--wide">{error}</div>}
              <label className="form-field"><span>Nom officiel</span><input required minLength="3" value={form.nom} onChange={update('nom')} placeholder="Université de Goma" /></label>
              <label className="form-field"><span>Sigle</span><input maxLength="20" value={form.sigle} onChange={update('sigle')} placeholder="UNIGOM" /></label>
              <label className="form-field form-field--wide"><span>Identifiant URL</span><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={update('slug')} placeholder="universite-de-goma" /><small>Minuscules, chiffres et tirets uniquement.</small></label>
              <label className="form-field"><span>Type</span><select value={form.type} onChange={update('type')}><option value="PUBLIQUE">Publique</option><option value="PRIVEE">Privée</option></select></label>
              <label className="form-field"><span>Ville</span><input required value={form.ville} onChange={update('ville')} /></label>
              <label className="form-field"><span>Province</span><input required value={form.province} onChange={update('province')} /></label>
              <label className="form-field"><span>Téléphone</span><input value={form.telephone} onChange={update('telephone')} placeholder="+243…" /></label>
              <label className="form-field form-field--wide"><span>E-mail public</span><input type="email" value={form.email} onChange={update('email')} placeholder="contact@universite.cd" /></label>
              <label className="form-field form-field--wide"><span>Présentation</span><textarea maxLength="5000" value={form.description} onChange={update('description')} placeholder="Présentez la mission, l’histoire et les points forts de votre université." rows="5" /></label>
              <button className="button button--large button--full form-field--wide" disabled={saving}>{saving ? <Spinner /> : <>Créer et envoyer la fiche <ArrowRight size={18} /></>}</button>
            </form>
          </div>
        </section>
      </PageShell>
    );
  }

  return <InstitutionOverview university={universite} utilisateur={utilisateur} />;
}

function InstitutionOverview({ university, utilisateur }) {
  const counts = [
    { label: 'Filières', value: university.nombre_filieres ?? university.filieres?.length ?? 0, icon: GraduationCap },
    { label: 'Services', value: university.services?.length || 0, icon: Landmark },
    { label: 'Infrastructures', value: university.infrastructures?.length || 0, icon: School },
    { label: 'Étudiants liés', value: university.nombre_etudiants || 0, icon: Users },
  ];
  const verified = university.statut_verification === 'VERIFIEE';

  return (
    <PageShell footer={false}>
      <section className="dashboard-page institution-dashboard">
        <div className="container institution-hero">
          <div className="institution-logo"><Building2 /></div>
          <div><span className="eyebrow eyebrow--accent">Espace institutionnel</span><h1>{university.nom}</h1><p><MapPin size={16} /> {university.ville}, {university.province} • {university.code_universite}</p></div>
          <StatusBadge status={university.statut_verification} />
        </div>
        <div className="container dashboard-layout">
          <aside className="dashboard-nav">
            <strong>Gestion</strong>
            <a className="active" href="#resume"><Building2 /> Vue d’ensemble</a>
            <a href="#catalogue"><BookOpen /> Catalogue</a>
            <a href="#publication"><FileText /> Publication</a>
            <a href="#reglages"><Settings /> Paramètres</a>
          </aside>
          <div className="dashboard-content" id="resume">
            <div className={`verification-banner ${verified ? 'verification-banner--verified' : ''}`}>
              <span>{verified ? <BadgeCheck /> : <Clock3 />}</span>
              <div><strong>{verified ? 'Votre université est publiée' : 'Votre fiche attend la vérification finale'}</strong><p>{verified ? 'Elle apparaît dans la recherche publique CampusHub.' : 'Complétez le catalogue pendant que notre équipe examine vos informations.'}</p></div>
              <StatusBadge status={university.statut_verification} />
            </div>
            <div className="stats-grid">
              {counts.map(({ label, value, icon: Icon }) => <article className="stat-card" key={label}><span className="stat-icon stat-icon--teal"><Icon /></span><small>{label}</small><strong>{value}</strong><span className="stat-caption">Sur votre fiche</span></article>)}
            </div>
            <section className="panel" id="catalogue">
              <div className="panel-heading"><div><span className="eyebrow">Prochaine étape</span><h2>Construisez votre catalogue académique</h2><p>Une fiche complète aide les étudiants à faire un choix éclairé.</p></div><ShieldCheck className="panel-watermark" /></div>
              <div className="catalogue-actions">
                <button><span><School /></span><div><strong>Campus</strong><small>Adresses et sites</small></div><Plus /></button>
                <button><span><Landmark /></span><div><strong>Facultés</strong><small>Organisation académique</small></div><Plus /></button>
                <button><span><GraduationCap /></span><div><strong>Filières</strong><small>Programmes et frais</small></div><Plus /></button>
                <button><span><BookOpen /></span><div><strong>Admissions</strong><small>Conditions requises</small></div><Plus /></button>
              </div>
            </section>
            <section className="panel manager-note"><span className="stat-icon stat-icon--blue"><ShieldCheck /></span><div><strong>Gestionnaire du compte</strong><p>{utilisateur?.nom_affichage} • {utilisateur?.email}</p></div></section>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
