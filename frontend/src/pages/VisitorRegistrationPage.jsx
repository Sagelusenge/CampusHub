import { ArrowRight, Check, LockKeyhole, Mail, ShieldCheck, UserRound, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { PageShell } from '../components/PageShell.jsx';
import { EmailVerificationStep } from '../components/EmailVerificationStep.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function VisitorRegistrationPage() {
  const { connexion } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nomAffichage: '', email: '', motDePasse: '' });
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(false);
  const [verification, setVerification] = useState(null);
  async function submit(event) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response = await apiRequest('/auth/inscription', { method: 'POST', body: { ...form, role: 'VISITEUR', pays: 'Democratic Republic of the Congo' } });
      setVerification(response.donnees);
    }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  async function terminerInscription() {
    await connexion(form.email, form.motDePasse);
    setDone(true);
    navigate('/reseau', { replace: true });
  }
  return <PageShell footer={false}><section className="visitor-registration">
    <div className="visitor-registration__intro"><span><Users /></span><small>Communauté CampusHub</small><h1>Votre réseau universitaire commence ici.</h1><p>Créez un compte visiteur gratuit pour commenter les publications, suivre les universités et personnaliser vos découvertes.</p><div><ShieldCheck /><span><strong>Un espace simple et complet</strong><small>Après confirmation, vous arrivez directement dans votre espace visiteur.</small></span></div></div>
    {done ? <div className="registration-success"><Check /><small>Compte créé</small><h2>Bienvenue sur CampusHub</h2><p>Votre compte visiteur est prêt. Connectez-vous pour ouvrir votre réseau.</p><Link className="button button--large" to="/connexion">Accéder au réseau <ArrowRight /></Link></div>
      : verification ? <EmailVerificationStep email={form.email} emailMasque={verification.email_masque} emailEnvoye={verification.email_envoye} onVerified={terminerInscription} />
        : <form className="form-card registration-form--refined" onSubmit={submit}><span className="eyebrow eyebrow--accent">Compte visiteur</span><h2>Créer mon compte</h2><p>Aucun matricule n’est demandé pour ce type de compte.</p>{error && <div className="alert alert--error">{error}</div>}
        <label className="form-field"><span>Nom complet *</span><div className="input-with-icon"><UserRound /><input required minLength="2" value={form.nomAffichage} onChange={(e) => setForm({ ...form, nomAffichage: e.target.value })} /></div></label>
        <label className="form-field"><span>Adresse e-mail *</span><div className="input-with-icon"><Mail /><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div></label>
        <label className="form-field"><span>Mot de passe *</span><div className="input-with-icon"><LockKeyhole /><input type="password" minLength="8" required value={form.motDePasse} onChange={(e) => setForm({ ...form, motDePasse: e.target.value })} /></div></label>
        <button className="button button--full button--large" disabled={loading}>{loading ? <Spinner /> : <>Rejoindre le réseau <ArrowRight /></>}</button><small className="form-help">Déjà inscrit ? <Link to="/connexion">Se connecter</Link></small>
      </form>}
  </section></PageShell>;
}
