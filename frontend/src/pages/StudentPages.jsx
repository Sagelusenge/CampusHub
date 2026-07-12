import { BadgeCheck, Building2, Check, Clock3, GraduationCap, Send, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function useAffiliations() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try { setItems((await apiRequest('/affiliations/moi', { token })).donnees || []); setError(''); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  return { items, loading, error, load };
}

export function StudentDashboardPage() {
  const { utilisateur } = useAuth();
  const { items, loading } = useAffiliations();
  const current = items[0];
  const accepted = items.find((item) => item.statut === 'ACCEPTEE');
  return <div className="dashboard-view student-dashboard">
    <div className="dashboard-welcome"><div><span>Mon parcours CampusHub</span><h1>Bonjour, {utilisateur?.nom_affichage}</h1><p>Suivez votre confirmation universitaire et construisez votre portfolio.</p></div></div>
    {loading ? <div className="content-loading"><Spinner />Chargement…</div> : <>
      <div className="metric-grid student-metrics">
        <article className="metric-card"><span className="metric-card__icon metric-card__icon--blue"><Building2 /></span><small>Université demandée</small><strong className="metric-card__text">{current?.nom_universite || 'Aucune'}</strong><p>{current?.nom_filiere || 'Commencez votre affiliation'}</p></article>
        <article className="metric-card"><span className="metric-card__icon metric-card__icon--amber"><Clock3 /></span><small>État de la demande</small><strong className="metric-card__text">{current ? <StatusBadge status={current.statut} /> : 'À envoyer'}</strong><p>L’université décide après vérification</p></article>
        <article className="metric-card"><span className="metric-card__icon metric-card__icon--teal"><BadgeCheck /></span><small>Profil étudiant</small><strong className="metric-card__text">{accepted ? 'Débloqué' : 'Verrouillé'}</strong><p>Disponible après confirmation</p></article>
      </div>
      <section className="app-panel student-next-step"><span>{accepted ? <BadgeCheck /> : <GraduationCap />}</span><div><h2>{accepted ? 'Votre université vous a confirmé' : current ? 'Votre demande est en cours' : 'Choisissez votre université'}</h2><p>{accepted ? 'Vous pouvez compléter votre profil et présenter vos compétences.' : current ? 'Vous serez notifié dès que le gestionnaire aura répondu.' : 'Envoyez une demande avec votre filière et votre matricule si vous en avez un.'}</p></div><a className="button" href={accepted ? '/espace-etudiant/profil' : '/espace-etudiant/affiliation'}>{accepted ? 'Compléter mon profil' : 'Gérer ma demande'}</a></section>
    </>}
  </div>;
}

export function StudentAffiliationPage() {
  const { token } = useAuth();
  const { items, loading, error: loadError, load } = useAffiliations();
  const [universities, setUniversities] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState({ codeUniversite: '', codeFiliere: '', matriculeEtudiant: '', message: '' });
  const [sending, setSending] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => { apiRequest('/universites').then((r) => setUniversities((r.donnees || []).filter((u) => u.statut_verification === 'VERIFIEE'))).catch((err) => setError(err.message)); }, []);
  async function chooseUniversity(code) {
    setForm((current) => ({ ...current, codeUniversite: code, codeFiliere: '' })); setPrograms([]);
    if (!code) return;
    try { setPrograms((await apiRequest(`/universites/${code}`)).donnees?.filieres || []); } catch (err) { setError(err.message); }
  }
  async function submit(event) {
    event.preventDefault(); setSending(true); setError(''); setMessage('');
    try { await apiRequest('/affiliations', { method: 'POST', token, body: form }); setMessage('Votre demande a été envoyée à l’université.'); await load(); }
    catch (err) { setError(err.message); } finally { setSending(false); }
  }
  const active = items.some((item) => ['EN_ATTENTE', 'ACCEPTEE'].includes(item.statut));
  return <div><DashboardPageHeader title="Mon affiliation" description="Demandez à votre université de confirmer votre statut étudiant." />
    {(error || loadError) && <div className="alert alert--error">{error || loadError}</div>}{message && <div className="alert alert--success"><Check />{message}</div>}
    <div className="student-affiliation-layout">
      <form className="app-panel affiliation-form" onSubmit={submit}><h2>Nouvelle demande</h2><p>Une seule demande peut être active à la fois.</p>
        <label className="editor-field"><span>Université vérifiée</span><select required disabled={active} value={form.codeUniversite} onChange={(e) => chooseUniversity(e.target.value)}><option value="">Choisir…</option>{universities.map((u) => <option key={u.code_universite} value={u.code_universite}>{u.nom} — {u.ville}</option>)}</select></label>
        <label className="editor-field"><span>Filière</span><select required disabled={active || !form.codeUniversite} value={form.codeFiliere} onChange={(e) => setForm({ ...form, codeFiliere: e.target.value })}><option value="">Choisir…</option>{programs.map((p) => <option key={p.code_filiere} value={p.code_filiere}>{p.nom_filiere || p.nom}</option>)}</select></label>
        <label className="editor-field"><span>Matricule étudiant (facultatif)</span><input disabled={active} value={form.matriculeEtudiant} onChange={(e) => setForm({ ...form, matriculeEtudiant: e.target.value })} /></label>
        <label className="editor-field"><span>Message à l’université</span><textarea rows="4" disabled={active} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>
        <button className="button button--full" disabled={sending || active}>{sending ? <Spinner /> : <><Send />Envoyer la demande</>}</button>
      </form>
      <section className="app-panel affiliation-history"><h2>Historique</h2>{loading ? <div className="content-loading"><Spinner /></div> : items.length ? items.map((item) => <article key={item.code_demande}><div><strong>{item.nom_universite}</strong><StatusBadge status={item.statut} /></div><p>{item.nom_filiere}</p><small>{item.code_demande} • {new Date(item.date_creation).toLocaleDateString('fr-FR')}</small>{item.reponse_universite && <blockquote>{item.reponse_universite}</blockquote>}</article>) : <div className="management-empty"><Building2 /><h3>Aucune demande</h3><p>Votre historique apparaîtra ici.</p></div>}</section>
    </div>
  </div>;
}

export function StudentProfilePage() {
  const { token } = useAuth(); const [profile, setProfile] = useState(undefined); const [form, setForm] = useState({ titreProfil: '', competences: '', anneeDiplomation: '', estVisible: true }); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { apiRequest('/profils/moi', { token }).then((r) => { const p = r.donnees; setProfile(p); setForm({ titreProfil: p.titre_profil || '', competences: Array.isArray(p.competences) ? p.competences.join(', ') : '', anneeDiplomation: p.annee_diplomation || '', estVisible: Boolean(p.est_visible) }); }).catch((err) => { if (err.status === 404) setProfile(null); else setError(err.message); }); }, [token]);
  const parsedSkills = useMemo(() => form.competences.split(',').map((x) => x.trim()).filter(Boolean), [form.competences]);
  async function save(event) { event.preventDefault(); setSaving(true); setError(''); try { const response = await apiRequest('/profils/moi', { method: 'PATCH', token, body: { titreProfil: form.titreProfil || null, competences: parsedSkills, anneeDiplomation: form.anneeDiplomation ? Number(form.anneeDiplomation) : null, estVisible: form.estVisible } }); setProfile(response.donnees); setMessage('Profil enregistré.'); } catch (err) { setError(err.message); } finally { setSaving(false); } }
  if (profile === undefined) return <div className="content-loading"><Spinner />Chargement…</div>;
  if (profile === null) return <div className="no-university"><UserRound /><h1>Profil bientôt disponible</h1><p>Votre profil est créé automatiquement lorsque l’université accepte votre demande d’affiliation.</p><a className="button" href="/espace-etudiant/affiliation">Voir mon affiliation</a></div>;
  return <div><DashboardPageHeader title="Mon profil étudiant" description={`${profile.nom_universite} • ${profile.nom_filiere}`} />{error && <div className="alert alert--error">{error}</div>}{message && <div className="alert alert--success"><Check />{message}</div>}<form className="app-panel form-section student-profile-form" onSubmit={save}><div className="form-section__heading"><h2>Présentation publique</h2><p>Ces informations alimentent votre portfolio CampusHub.</p></div><label className="editor-field"><span>Titre du profil</span><input value={form.titreProfil} onChange={(e) => setForm({ ...form, titreProfil: e.target.value })} placeholder="Ex. Étudiant en génie logiciel" /></label><label className="editor-field"><span>Compétences, séparées par des virgules</span><textarea rows="4" value={form.competences} onChange={(e) => setForm({ ...form, competences: e.target.value })} placeholder="JavaScript, Réseaux, Gestion de projet" /></label><div className="skill-list">{parsedSkills.map((skill) => <span key={skill}>{skill}</span>)}</div><label className="editor-field"><span>Année de diplomation prévue</span><input type="number" min="1950" max="2200" value={form.anneeDiplomation} onChange={(e) => setForm({ ...form, anneeDiplomation: e.target.value })} /></label><label className="switch-field"><input type="checkbox" checked={form.estVisible} onChange={(e) => setForm({ ...form, estVisible: e.target.checked })} /><span /><div><strong>Profil visible</strong><small>Autoriser l’affichage dans les portfolios.</small></div></label><button className="button" disabled={saving}>{saving ? <Spinner /> : 'Enregistrer le profil'}</button></form></div>;
}
