import { ArrowLeft, CheckCircle2, ClipboardList } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { PageShell } from '../components/PageShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function OnlineEnrollmentPage() {
  const { code } = useParams(); const { token } = useAuth();
  const [form, setForm] = useState(null); const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(''); const [done, setDone] = useState(null);
  useEffect(() => { apiRequest(`/communaute/inscriptions/universites/${code}/formulaire`).then((r) => setForm(r.donnees)).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [code]);
  async function submit(event) { event.preventDefault(); setSaving(true); try { const response = await apiRequest(`/communaute/inscriptions/universites/${code}/demandes`, { method: 'POST', token, body: { reponses: answers } }); setDone(response.donnees); setError(''); } catch (err) { setError(err.message); } finally { setSaving(false); } }
  if (loading) return <PageShell><div className="full-loading"><Spinner />Chargement du formulaire…</div></PageShell>;
  return <PageShell><section className="online-enrollment-page"><div className="container enrollment-shell"><Link to={`/universites/${code}`}><ArrowLeft />Retour à la fiche</Link>
    {done ? <div className="enrollment-success app-panel"><CheckCircle2 /><h1>Dossier envoyé</h1><p>Votre demande a bien été transmise. L’établissement vous notifiera après examen.</p><strong>Référence : {done.code_demande}</strong></div>
      : form ? <><header><span className="eyebrow"><ClipboardList />Inscription en ligne</span><h1>{form.titre}</h1><p>{form.nom_etablissement}</p></header><div className="enrollment-layout"><aside className="app-panel">{form.url_logo && <img src={form.url_logo} alt="" />}<h2>Avant de commencer</h2><p>{form.description}</p>{form.instructions && <div>{form.instructions}</div>}{form.date_fermeture && <small>Clôture : {new Date(form.date_fermeture).toLocaleDateString('fr-FR')}</small>}</aside><form className="app-panel dynamic-enrollment-form" onSubmit={submit}>{error && <div className="alert alert--error">{error}</div>}{form.champs.map((field) => <DynamicField key={field.id} field={field} value={answers[field.id] ?? ''} setValue={(value) => setAnswers((current) => ({ ...current, [field.id]: value }))} />)}<button className="button button--full" disabled={saving}>{saving ? <Spinner /> : 'Envoyer ma demande'}</button></form></div></>
        : <div className="enrollment-success app-panel"><ClipboardList /><h1>Inscriptions fermées</h1><p>{error || 'Aucun formulaire actif pour cet établissement.'}</p></div>}
  </div></section></PageShell>;
}

function DynamicField({ field, value, setValue }) {
  const common = { id: field.id, required: field.obligatoire, value, onChange: (event) => setValue(event.target.value) };
  return <label className="field"><span>{field.label}{field.obligatoire && ' *'}</span>
    {field.type === 'ZONE_TEXTE' ? <textarea {...common} rows="4" /> : field.type === 'SELECT' ? <select {...common}><option value="">Choisir…</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : <input {...common} type={{ EMAIL: 'email', TELEPHONE: 'tel', DATE: 'date', NOMBRE: 'number' }[field.type] || 'text'} />}
  </label>;
}
