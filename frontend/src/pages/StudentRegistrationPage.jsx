import {
  ArrowRight, BadgeCheck, BookOpen, Building2, Check, GraduationCap, Hash, LockKeyhole, Mail,
  Search, ShieldCheck, Sparkles, UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { LocationSelector } from '../components/LocationSelector.jsx';
import { EmailVerificationStep } from '../components/EmailVerificationStep.jsx';
import { PageShell } from '../components/PageShell.jsx';
import { Spinner } from '../components/Spinner.jsx';

const initialForm = {
  nomAffichage: '', email: '', matriculeEtudiant: '', motDePasse: '',
  codeUniversite: '', codeFiliere: '',
  pays: 'Democratic Republic of the Congo', province: '', ville: '',
  countryCode: 'CD', stateCode: '',
};

export function StudentRegistrationPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [verification, setVerification] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [universitySearch, setUniversitySearch] = useState('');
  const [programSearch, setProgramSearch] = useState('');

  useEffect(() => {
    apiRequest('/universites?statut=VERIFIEE&limite=100')
      .then((response) => setUniversities((response.donnees || []).filter((item) => item.categorie_etablissement !== 'ECOLE_SECONDAIRE')))
      .catch((err) => setError(err.message));
  }, []);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const filteredUniversities = useMemo(() => universities.filter((item) => normalize(
    `${item.nom} ${item.sigle} ${item.ville} ${item.province}`,
  ).includes(normalize(universitySearch))), [universities, universitySearch]);
  const filteredPrograms = useMemo(() => programs.filter((item) => normalize(
    `${item.nom_filiere || item.nom} ${item.nom_faculte} ${item.domaine} ${item.niveau_diplome}`,
  ).includes(normalize(programSearch))), [programs, programSearch]);

  async function chooseUniversity(code) {
    setForm((current) => ({ ...current, codeUniversite: code, codeFiliere: '' }));
    setProgramSearch('');
    setPrograms([]);
    if (!code) return;
    setLoadingPrograms(true);
    try {
      const response = await apiRequest(`/universites/${code}`);
      setPrograms((response.donnees?.filieres || []).filter((item) => item.est_active !== 0));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPrograms(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest('/auth/inscription', {
        method: 'POST',
        body: {
          nomAffichage: form.nomAffichage,
          email: form.email,
          matriculeEtudiant: form.matriculeEtudiant,
          codeUniversite: form.codeUniversite,
          codeFiliere: form.codeFiliere,
          motDePasse: form.motDePasse,
          pays: form.pays,
          province: form.province,
          ville: form.ville,
          role: 'ETUDIANT',
        },
      });
      setVerification(response.donnees);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return <PageShell footer={false}>
    <section className="student-registration student-registration--refined">
      <div className="registration-intro">
        <span><GraduationCap /></span>
        <small>Votre parcours commence ici</small>
        <h1>Un espace étudiant vraiment à vous.</h1>
        <p>Rejoignez votre université, faites confirmer votre identité académique et partagez vos projets avec toute la communauté CampusHub.</p>
        <div className="registration-benefits">
          <article><BadgeCheck /><div><strong>Identité académique</strong><small>Affiliation confirmée par votre université</small></div></article>
          <article><Sparkles /><div><strong>Portfolio & publications</strong><small>Vos projets visibles dans le réseau CampusHub</small></div></article>
          <article><ShieldCheck /><div><strong>Données protégées</strong><small>Votre matricule n’est utilisé que pour la vérification</small></div></article>
        </div>
      </div>

      {done ? <div className="registration-success">
        <Check />
        <small>Inscription réussie</small>
        <h2>Votre compte est prêt</h2>
        <p>Votre demande d’affiliation a été transmise à l’établissement choisi. Connectez-vous pour suivre sa décision depuis votre espace étudiant.</p>
        <Link className="button button--large" to="/connexion">Accéder à mon espace <ArrowRight /></Link>
      </div> : verification ? <EmailVerificationStep
        email={form.email}
        emailMasque={verification.email_masque}
        emailEnvoye={verification.email_envoye}
        onVerified={() => setDone(true)}
      /> : <form className="form-card registration-form registration-form--refined" onSubmit={submit}>
        <div className="registration-form__heading">
          <span>01</span><div><small>Création du compte</small><h2>Vos informations</h2></div>
        </div>
        <p className="registration-form__lead">Tous les champs marqués d’un astérisque sont obligatoires.</p>
        {error && <div className="alert alert--error">{error}</div>}

        <div className="registration-fields">
          <label className="form-field form-field--wide"><span>Nom complet *</span><div className="input-with-icon"><UserRound /><input required minLength="2" autoComplete="name" value={form.nomAffichage} onChange={(e) => update('nomAffichage', e.target.value)} placeholder="Ex. Amina Ilunga" /></div></label>
          <label className="form-field"><span>Adresse e-mail *</span><div className="input-with-icon"><Mail /><input type="email" required autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="vous@exemple.com" /></div></label>
          <label className="form-field"><span>Matricule étudiant *</span><div className="input-with-icon"><Hash /><input required minLength="2" maxLength="80" value={form.matriculeEtudiant} onChange={(e) => update('matriculeEtudiant', e.target.value)} placeholder="Ex. 2026-INFO-014" /></div><small>Le matricule attribué par votre établissement.</small></label>
          <label className="form-field form-field--wide"><span>Mot de passe *</span><div className="input-with-icon"><LockKeyhole /><input type="password" minLength="8" required autoComplete="new-password" value={form.motDePasse} onChange={(e) => update('motDePasse', e.target.value)} placeholder="8 caractères minimum" /></div></label>
        </div>

        <div className="registration-divider"><span>02</span><strong>Votre établissement</strong></div>
        <p className="registration-section-note">Votre choix sera envoyé à l’université uniquement après la confirmation de votre adresse e-mail.</p>
        <div className="registration-fields registration-affiliation-fields">
          <label className="form-field form-field--wide affiliation-search"><span>Rechercher l’établissement</span><div className="input-with-icon"><Search /><input value={universitySearch} onChange={(event) => setUniversitySearch(event.target.value)} placeholder="Ex. Université de Goma, UNIGOM ou Goma" /></div><small>{filteredUniversities.length} établissement(s) vérifié(s) correspondent.</small></label>
          <label className="form-field form-field--wide"><span>Université ou institut supérieur *</span><div className="input-with-icon"><Building2 /><select required value={form.codeUniversite} onChange={(event) => chooseUniversity(event.target.value)}><option value="">Choisir votre établissement…</option>{filteredUniversities.map((item) => <option value={item.code_universite} key={item.code_universite}>{item.nom} — {item.ville}</option>)}</select></div><small>Un établissement doit être vérifié par CampusHub pour apparaître ici.</small></label>
          {form.codeUniversite && <label className="form-field form-field--wide affiliation-search"><span>Rechercher la filière</span><div className="input-with-icon"><Search /><input value={programSearch} onChange={(event) => setProgramSearch(event.target.value)} placeholder="Ex. Informatique, droit, gestion…" /></div></label>}
          <label className="form-field form-field--wide"><span>Filière suivie *</span><div className="input-with-icon"><BookOpen /><select required disabled={!form.codeUniversite || loadingPrograms || programs.length === 0} value={form.codeFiliere} onChange={(event) => update('codeFiliere', event.target.value)}><option value="">{loadingPrograms ? 'Chargement des filières…' : form.codeUniversite ? programs.length ? 'Choisir votre filière…' : 'Aucune filière active disponible' : 'Choisissez d’abord un établissement'}</option>{filteredPrograms.map((item) => <option value={item.code_filiere} key={item.code_filiere}>{item.nom_filiere || item.nom} — {item.niveau_diplome || 'Formation'}</option>)}</select></div>{form.codeUniversite && !loadingPrograms && programs.length === 0 && <small className="field-warning">Le gestionnaire doit publier une filière active dans une faculté ou section. Si elle vient d’être créée, vérifiez son statut dans « Facultés & filières ».</small>}</label>
        </div>

        <div className="registration-divider"><span>03</span><strong>Votre localisation</strong></div>
        <LocationSelector value={form} emailContact={form.email} onChange={(values) => setForm((current) => ({ ...current, ...values }))} />
        <button className="button button--full button--large" disabled={loading || !form.province || !form.ville || !form.matriculeEtudiant.trim() || !form.codeUniversite || !form.codeFiliere}>{loading ? <Spinner /> : <>Créer mon espace <ArrowRight /></>}</button>
        <small className="form-help">Déjà inscrit ? <Link to="/connexion">Se connecter</Link></small>
      </form>}
    </section>
  </PageShell>;
}
