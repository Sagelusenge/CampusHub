import { ArrowLeft, ArrowRight, BriefcaseBusiness, Building2, Handshake, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { PageShell } from '../components/PageShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { EmailVerificationStep } from '../components/EmailVerificationStep.jsx';

const initialForm = { organisation: '', representant: '', email: '', telephone: '', motDePasse: '', confirmationMotDePasse: '', categorie: 'FINANCEMENT', description: '' };
const categories = {
  FINANCEMENT: 'Financement d’étudiants ou de projets',
  EMPLOI_STAGE: 'Emplois, stages et opportunités',
  PARTENARIAT_ACADEMIQUE: 'Partenariat académique',
  TECHNOLOGIE: 'Technologie et services numériques',
  ONG: 'ONG, fondation ou programme social',
  AUTRE: 'Autre proposition',
};

export function OrganizationApplicationPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [verification, setVerification] = useState(null);
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setLoading(true); setError('');
    try {
      if (form.motDePasse !== form.confirmationMotDePasse) throw new Error('Les deux mots de passe ne correspondent pas.');
      const inscription = await apiRequest('/auth/inscription', {
        method: 'POST',
        body: { email: form.email, motDePasse: form.motDePasse, role: 'ENTREPRISE', nomAffichage: form.organisation },
      });
      setVerification(inscription.donnees);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function finishVerification() {
    setLoading(true); setError('');
    try {
      await apiRequest('/contact', {
        method: 'POST',
        body: {
          nom: form.representant,
          email: form.email,
          sujet: `Proposition organisation — ${form.organisation} — ${categories[form.categorie]}`,
          message: `Organisation : ${form.organisation}\nCatégorie : ${categories[form.categorie]}\nTéléphone : ${form.telephone || 'Non renseigné'}\n\n${form.description}`,
        },
      });
      setDone(true);
      setVerification(null);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  return <PageShell>
    <section className="organization-application-page"><div className="container organization-application-layout">
      <aside className="organization-application-intro"><Link to="/connexion"><ArrowLeft />Retour</Link><span><Handshake /></span><small>Entreprises & organisations</small><h1>Construisons des opportunités utiles.</h1><p>Proposez un financement, un stage, une offre d’emploi, une bourse ou un partenariat. L’administration CampusHub étudiera votre proposition avant toute mise en relation avec les établissements et les étudiants.</p><div><article><Building2 /><span><strong>Établissements ciblés</strong><small>Collaborez avec des structures académiques vérifiées.</small></span></article><article><BriefcaseBusiness /><span><strong>Impact mesurable</strong><small>Publiez des opportunités claires et traçables.</small></span></article></div></aside>
      {done ? <section className="organization-success"><Handshake /><small>Compte confirmé</small><h2>Merci pour votre proposition.</h2><p>Votre compte organisation est créé. L’administration CampusHub vous répondra également par e-mail après examen.</p><Link className="button" to="/connexion">Me connecter <ArrowRight /></Link></section>
        : verification ? <section className="form-card organization-application-form"><EmailVerificationStep email={form.email} emailMasque={verification.email_masque} emailEnvoye={verification.email_envoye} onVerified={finishVerification} /></section>
          : <form className="form-card organization-application-form" onSubmit={submit}><span className="eyebrow eyebrow--accent">Demande de collaboration</span><h2>Présentez votre organisation</h2><p>Créez également le mot de passe qui protégera votre futur espace.</p>{error && <div className="alert alert--error">{error}</div>}
          <label className="form-field"><span>Nom de l’organisation *</span><div className="input-with-icon"><Building2 /><input required minLength="2" value={form.organisation} onChange={update('organisation')} placeholder="Ex. Fondation Avenir RDC" /></div></label>
          <label className="form-field"><span>Nom du représentant *</span><div className="input-with-icon"><UserRound /><input required minLength="2" value={form.representant} onChange={update('representant')} placeholder="Nom et prénom" /></div></label>
          <div className="form-grid"><label className="form-field"><span>Adresse e-mail *</span><div className="input-with-icon"><Mail /><input required type="email" value={form.email} onChange={update('email')} placeholder="contact@organisation.org" /></div></label><label className="form-field"><span>Téléphone</span><div className="input-with-icon"><Phone /><input value={form.telephone} onChange={update('telephone')} placeholder="+243…" /></div></label></div>
          <div className="form-grid"><label className="form-field"><span>Mot de passe *</span><div className="input-with-icon"><LockKeyhole /><input required minLength="8" type="password" autoComplete="new-password" value={form.motDePasse} onChange={update('motDePasse')} placeholder="8 caractères minimum" /></div></label><label className="form-field"><span>Confirmer le mot de passe *</span><div className="input-with-icon"><LockKeyhole /><input required minLength="8" type="password" autoComplete="new-password" value={form.confirmationMotDePasse} onChange={update('confirmationMotDePasse')} /></div></label></div>
          <label className="form-field"><span>Type de collaboration *</span><select required value={form.categorie} onChange={update('categorie')}>{Object.entries(categories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="form-field"><span>Votre proposition *</span><textarea required minLength="20" rows="7" value={form.description} onChange={update('description')} placeholder="Expliquez l’objectif, les bénéficiaires, les conditions et les coordonnées utiles…" /></label>
          <button className="button button--full button--large" disabled={loading}>{loading ? <Spinner /> : <>Envoyer à CampusHub <ArrowRight /></>}</button>
        </form>}
    </div></section>
  </PageShell>;
}
