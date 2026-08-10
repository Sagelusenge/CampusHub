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
    <section className="section contact-section"><div className="container contact-layout contact-layout--centered">
      <form className="form-card contact-form" onSubmit={submit}><div className="contact-form__heading"><span><MessageSquare /></span><div><h2>Envoyer un message</h2><p>Décrivez votre besoin : notre équipe vous répondra rapidement.</p></div></div>{done && <div className="alert alert--success"><Check /> Votre message a bien été transmis.</div>}{error && <div className="alert alert--error">{error}</div>}
        <div className="form-grid"><label className="form-field"><span>Nom complet</span><input required minLength="2" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></label><label className="form-field"><span>Adresse e-mail</span><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label className="form-field form-field--wide"><span>Sujet</span><input required minLength="3" value={form.sujet} onChange={(e) => setForm({ ...form, sujet: e.target.value })} /></label><label className="form-field form-field--wide"><span>Votre message</span><textarea required minLength="10" rows="7" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label></div>
        <div className="contact-quick-info"><span><Mail /><small>Adresse e-mail</small><strong>contact@campushub.cd</strong></span><span><MapPin /><small>Localisation</small><strong>Goma, RDC</strong></span></div>
        <button className="button button--large button--full" disabled={loading}>{loading ? <Spinner /> : <><Send />Envoyer à l’administration</>}</button>
      </form></div></section></PageShell>;
}
