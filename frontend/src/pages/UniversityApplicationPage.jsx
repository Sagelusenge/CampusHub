import { ArrowLeft, ArrowRight, BadgeCheck, Building2, Check, Eye, EyeOff, FileCheck2, LockKeyhole, Mail, MapPin, Send } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { PageShell } from '../components/PageShell.jsx';
import { Spinner } from '../components/Spinner.jsx';

const initialForm = {
  nomAffichage: '',
  email: '',
  motDePasse: '',
  ville: 'Goma',
  province: 'Nord-Kivu',
};

export function UniversityApplicationPage() {
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest('/auth/inscription', {
        method: 'POST',
        body: { ...form, role: 'UNIVERSITE' },
      });
      setResult(response.donnees);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <PageShell>
        <section className="success-page">
          <div className="success-card">
            <div className="success-icon"><Check size={34} /></div>
            <span className="eyebrow eyebrow--accent">Demande transmise</span>
            <h1>Votre établissement est en cours d’examen.</h1>
            <p>L’administration CampusHub vérifiera votre demande avant d’activer votre accès institutionnel.</p>
            <div className="request-reference">
              <span>Référence de la demande</span>
              <strong>{result.code_utilisateur || result.codeUtilisateur}</strong>
            </div>
            <div className="steps-list">
              <div className="steps-list__item steps-list__item--done"><span><Check size={16} /></span><div><strong>Demande reçue</strong><small>Vos informations sont enregistrées.</small></div></div>
              <div className="steps-list__item"><span>2</span><div><strong>Vérification administrative</strong><small>L’équipe examine l’identité de votre établissement.</small></div></div>
              <div className="steps-list__item"><span>3</span><div><strong>Création de la fiche publique</strong><small>Après activation, connectez-vous pour compléter votre université.</small></div></div>
            </div>
            <Link className="button button--full" to="/connexion">Aller à la connexion <ArrowRight size={18} /></Link>
            <Link className="text-link centered" to="/">Retour à l’accueil</Link>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="application-page">
        <div className="container application-layout">
          <aside className="application-intro">
            <Link className="back-link" to="/"><ArrowLeft size={17} /> Retour à l’accueil</Link>
            <span className="pill pill--light"><Building2 size={15} /> Partenariat universitaire</span>
            <h1>Faites connaître votre université aux futurs étudiants.</h1>
            <p>CampusHub protège la confiance de sa communauté grâce à un processus simple de validation.</p>
            <div className="process-card">
              <div><span><Send size={18} /></span><p><strong>1. Envoyez votre demande</strong><small>Créez le compte officiel de l’établissement.</small></p></div>
              <div><span><FileCheck2 size={18} /></span><p><strong>2. Nous vérifions</strong><small>Un administrateur accepte ou rejette la demande.</small></p></div>
              <div><span><BadgeCheck size={18} /></span><p><strong>3. Publiez votre fiche</strong><small>Ajoutez campus, facultés, filières et services.</small></p></div>
            </div>
          </aside>

          <form className="form-card application-form" onSubmit={handleSubmit}>
            <div className="form-heading">
              <span className="eyebrow eyebrow--accent">Étape 1 sur 2</span>
              <h2>Identité de l’établissement</h2>
              <p>Utilisez une adresse e-mail officielle que votre équipe peut consulter.</p>
            </div>

            {error && <div className="alert alert--error">{error}</div>}

            <label className="form-field form-field--wide">
              <span>Nom officiel de l’université</span>
              <div className="input-with-icon"><Building2 size={18} /><input required minLength="3" placeholder="Ex. Université de Goma" value={form.nomAffichage} onChange={update('nomAffichage')} /></div>
            </label>
            <label className="form-field form-field--wide">
              <span>Adresse e-mail institutionnelle</span>
              <div className="input-with-icon"><Mail size={18} /><input type="email" required placeholder="contact@universite.cd" value={form.email} onChange={update('email')} /></div>
            </label>
            <label className="form-field form-field--wide">
              <span>Mot de passe du gestionnaire</span>
              <div className="input-with-icon"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} required minLength="8" maxLength="72" placeholder="8 caractères minimum" value={form.motDePasse} onChange={update('motDePasse')} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Afficher le mot de passe">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              <small>Conservez-le : il permettra de se connecter après validation.</small>
            </label>
            <label className="form-field">
              <span>Ville</span>
              <div className="input-with-icon"><MapPin size={18} /><input required value={form.ville} onChange={update('ville')} /></div>
            </label>
            <label className="form-field">
              <span>Province</span>
              <div className="input-with-icon"><MapPin size={18} /><input required value={form.province} onChange={update('province')} /></div>
            </label>

            <label className="consent form-field--wide">
              <input type="checkbox" required />
              <span>Je confirme représenter cet établissement et accepte la vérification des informations transmises.</span>
            </label>

            <button className="button button--large button--full form-field--wide" disabled={loading}>
              {loading ? <Spinner label="Envoi" /> : <>Envoyer la demande <ArrowRight size={18} /></>}
            </button>
            <p className="form-note form-field--wide">Déjà partenaire ? <Link to="/connexion">Connectez-vous ici</Link>.</p>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
