import { Check, Mail, MapPin, MessageSquare, Send } from 'lucide-react';
import { useState } from 'react';
import { apiRequest } from '../api/client.js';
import { PageShell } from '../components/PageShell.jsx';
import { Spinner } from '../components/Spinner.jsx';

export function ContactPage() {
  const [form, setForm] = useState({ nom: '', email: '', sujet: '', message: '' });
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(false);
  async function submit(event) {
    event.preventDefault(); setLoading(true); setError('');
    try { await apiRequest('/contact', { method: 'POST', body: form }); setDone(true); setForm({ nom: '', email: '', sujet: '', message: '' }); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  return <PageShell><section className="contact-hero"><div className="container"><span className="eyebrow">Contact CampusHub</span><h1>Parlons de votre besoin.</h1><p>Une question sur une université, une ville absente ou votre compte ? Le message arrive directement auprès de l’administration.</p></div></section>
    <section className="section"><div className="container contact-layout"><aside><span><MessageSquare /></span><h2>Une équipe à votre écoute.</h2><p>Décrivez précisément votre demande afin que nous puissions vous répondre rapidement.</p><div><Mail /><span><strong>Adresse e-mail</strong><small>contact@campushub.cd</small></span></div><div><MapPin /><span><strong>Localisation</strong><small>Goma, RDC</small></span></div></aside>
      <form className="form-card contact-form" onSubmit={submit}><h2>Envoyer un message</h2><p>Les champs ci-dessous sont obligatoires.</p>{done && <div className="alert alert--success"><Check /> Votre message a bien été transmis.</div>}{error && <div className="alert alert--error">{error}</div>}
        <div className="form-grid"><label className="form-field"><span>Nom complet</span><input required minLength="2" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></label><label className="form-field"><span>Adresse e-mail</span><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label className="form-field form-field--wide"><span>Sujet</span><input required minLength="3" value={form.sujet} onChange={(e) => setForm({ ...form, sujet: e.target.value })} /></label><label className="form-field form-field--wide"><span>Votre message</span><textarea required minLength="10" rows="7" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label></div>
        <button className="button button--large" disabled={loading}>{loading ? <Spinner /> : <><Send />Envoyer à l’administration</>}</button>
      </form></div></section></PageShell>;
}
