import {
  ArrowRight, BadgeCheck, Check, GraduationCap, Hash, LockKeyhole, Mail,
  ShieldCheck, Sparkles, UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { LocationSelector } from '../components/LocationSelector.jsx';
import { PageShell } from '../components/PageShell.jsx';
import { Spinner } from '../components/Spinner.jsx';

const initialForm = {
  nomAffichage: '', email: '', matriculeEtudiant: '', motDePasse: '',
  pays: 'Democratic Republic of the Congo', province: '', ville: '',
  countryCode: 'CD', stateCode: '',
};

export function StudentRegistrationPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiRequest('/auth/inscription', {
        method: 'POST',
        body: {
          nomAffichage: form.nomAffichage,
          email: form.email,
          matriculeEtudiant: form.matriculeEtudiant,
          motDePasse: form.motDePasse,
          pays: form.pays,
          province: form.province,
          ville: form.ville,
          role: 'ETUDIANT',
        },
      });
      setDone(true);
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
        <p>Connectez-vous maintenant. Vous arriverez directement dans votre espace étudiant pour demander la confirmation de votre université.</p>
        <Link className="button button--large" to="/connexion">Accéder à mon espace <ArrowRight /></Link>
      </div> : <form className="form-card registration-form registration-form--refined" onSubmit={submit}>
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

        <div className="registration-divider"><span>02</span><strong>Votre localisation</strong></div>
        <LocationSelector value={form} emailContact={form.email} onChange={(values) => setForm((current) => ({ ...current, ...values }))} />
        <button className="button button--full button--large" disabled={loading || !form.province || !form.ville || !form.matriculeEtudiant.trim()}>{loading ? <Spinner /> : <>Créer mon espace <ArrowRight /></>}</button>
        <small className="form-help">Déjà inscrit ? <Link to="/connexion">Se connecter</Link></small>
      </form>}
    </section>
  </PageShell>;
}
