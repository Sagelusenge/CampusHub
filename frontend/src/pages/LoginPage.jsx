import {
  ArrowRight, Building2, Eye, EyeOff, GraduationCap, LockKeyhole,
  Mail, ShieldCheck, Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PageShell } from '../components/PageShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function LoginPage() {
  const [form, setForm] = useState({ email: '', motDePasse: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { connexion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const session = await connexion(form.email, form.motDePasse);
      const destination = location.state?.from?.pathname
        || (session.utilisateur.role === 'ADMINISTRATEUR' ? '/administration'
          : session.utilisateur.role === 'ETUDIANT' ? '/espace-etudiant'
            : session.utilisateur.role === 'UNIVERSITE' ? '/espace-universite' : '/reseau');
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell footer={false}>
      <section className="auth-page">
        <div className="auth-visual">
          <div className="auth-visual__content">
            <span className="pill pill--light"><ShieldCheck size={15} /> Espace sécurisé</span>
            <h1>Retrouvez votre espace CampusHub.</h1>
            <p>Gérez votre établissement, examinez les demandes ou mettez à jour votre profil institutionnel.</p>
            <div className="auth-feature"><Building2 /> <span><strong>Universités</strong> — suivez votre validation et complétez votre fiche.</span></div>
            <div className="auth-feature"><LockKeyhole /> <span><strong>Administration</strong> — contrôlez chaque demande avant publication.</span></div>
          </div>
        </div>

        <div className="auth-form-wrap">
          <form className="form-card" onSubmit={handleSubmit}>
            <span className="eyebrow eyebrow--accent">Heureux de vous revoir</span>
            <h2>Connexion</h2>
            <p>Entrez les identifiants liés à votre compte.</p>

            {error && <div className="alert alert--error">{error}</div>}

            <label className="form-field">
              <span>Adresse e-mail</span>
              <div className="input-with-icon"><Mail size={18} /><input type="email" required autoComplete="email" placeholder="nom@universite.cd" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
            </label>

            <label className="form-field">
              <span>Mot de passe</span>
              <div className="input-with-icon"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" placeholder="Votre mot de passe" value={form.motDePasse} onChange={(event) => setForm({ ...form, motDePasse: event.target.value })} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Afficher le mot de passe">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            </label>

            <button className="button button--full button--large" disabled={loading}>
              {loading ? <Spinner label="Connexion" /> : <>Se connecter <ArrowRight size={18} /></>}
            </button>

            <div className="form-divider"><span>Nouvel établissement ?</span></div>
            <Link className="button button--outline button--full" to="/partenariat">Envoyer une demande</Link>
            <div className="auth-role-options">
              <Link className="auth-role-card" to="/inscription-etudiant"><span><GraduationCap /></span><div><strong>Je suis étudiant</strong><small>Créer mon espace</small></div><ArrowRight /></Link>
              <Link className="auth-role-card" to="/inscription-visiteur"><span><Users /></span><div><strong>Je suis visiteur</strong><small>Rejoindre le réseau</small></div><ArrowRight /></Link>
            </div>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
