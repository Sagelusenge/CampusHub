import { Check, ClipboardList, Plus, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const initialFields = [
  { id: 'nom_complet', label: 'Nom complet', type: 'TEXTE', obligatoire: true, options: [] },
  { id: 'date_naissance', label: 'Date de naissance', type: 'DATE', obligatoire: true, options: [] },
  { id: 'telephone', label: 'Téléphone', type: 'TELEPHONE', obligatoire: true, options: [] },
  { id: 'formation_souhaitee', label: 'Formation souhaitée', type: 'TEXTE', obligatoire: true, options: [] },
];
const emptyForm = { titre: 'Formulaire de préinscription', description: '', instructions: '', champs: initialFields, dateFermeture: '', estActif: false };

export function InstitutionEnrollmentPage() {
  const { token } = useAuth(); const [form, setForm] = useState(emptyForm); const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const load = useCallback(async () => { setLoading(true); try { const [f, d] = await Promise.all([apiRequest('/communaute/inscriptions/moi/formulaire', { token }), apiRequest('/communaute/inscriptions/moi/demandes', { token })]); if (f.donnees.formulaire) { const value = f.donnees.formulaire; setForm({ titre: value.titre, description: value.description || '', instructions: value.instructions || '', champs: value.champs || initialFields, dateFermeture: value.date_fermeture?.slice(0, 10) || '', estActif: Boolean(value.est_actif) }); } setRequests(d.donnees || []); setError(''); } catch (err) { setError(err.message); } finally { setLoading(false); } }, [token]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  function updateField(index, key, value) { setForm((current) => ({ ...current, champs: current.champs.map((field, position) => position === index ? { ...field, [key]: value } : field) })); }
  function addField() { setForm((current) => ({ ...current, champs: [...current.champs, { id: `champ_${Date.now()}`, label: 'Nouveau champ', type: 'TEXTE', obligatoire: false, options: [] }] })); }
  function removeField(index) { setForm((current) => ({ ...current, champs: current.champs.filter((_, position) => position !== index) })); }
  async function save(event) { event.preventDefault(); setSaving(true); try { await apiRequest('/communaute/inscriptions/moi/formulaire', { method: 'PUT', token, body: { ...form, dateFermeture: form.dateFermeture || null } }); setMessage('Le formulaire d’inscription est à jour.'); setError(''); await load(); } catch (err) { setError(err.message); } finally { setSaving(false); } }
  async function process(request, statut) { try { await apiRequest(`/communaute/inscriptions/demandes/${request.code_demande}`, { method: 'PATCH', token, body: { statut, noteEtablissement: statut === 'ACCEPTEE' ? 'Votre dossier a été accepté. Nous vous contacterons pour la suite.' : null } }); await load(); } catch (err) { setError(err.message); } }
  return <div><DashboardPageHeader title="Inscriptions en ligne" description="Créez le formulaire public de votre établissement et traitez les dossiers reçus." />
    {message && <div className="alert alert--success">{message}</div>}{error && <div className="alert alert--error">{error}</div>}
    {loading ? <div className="content-loading app-panel"><Spinner />Chargement…</div> : <div className="institution-enrollment-grid">
      <form className="app-panel enrollment-builder" onSubmit={save}>
        <header className="enrollment-builder__header">
          <div className="enrollment-builder__identity"><span><ClipboardList /></span><div><strong>Formulaire public</strong><small>Configurez une candidature claire pour vos futurs étudiants.</small></div></div>
          <label className="enrollment-toggle"><input type="checkbox" checked={form.estActif} onChange={(event) => setForm({ ...form, estActif: event.target.checked })} /><span aria-hidden="true" /><div><strong>{form.estActif ? 'Inscriptions ouvertes' : 'Inscriptions fermées'}</strong><small>Visible sur la fiche publique</small></div></label>
        </header>
        <div className="enrollment-builder__basics">
          <label className="editor-field enrollment-builder__wide"><span>Titre du formulaire</span><input required value={form.titre} onChange={(event) => setForm({ ...form, titre: event.target.value })} placeholder="Ex. Préinscription — année académique 2026-2027" /></label>
          <label className="editor-field"><span>Présentation</span><textarea rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Présentez brièvement la procédure d’admission." /></label>
          <label className="editor-field"><span>Instructions aux candidats</span><textarea rows="4" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="Documents requis, étapes et délai de réponse." /></label>
          <label className="editor-field enrollment-builder__date"><span>Date de clôture <small>Facultative</small></span><input type="date" value={form.dateFermeture} onChange={(event) => setForm({ ...form, dateFermeture: event.target.value })} /></label>
        </div>
        <div className="builder-fields">
          <div className="builder-fields__heading"><div><h3>Champs du formulaire</h3><p>Choisissez les informations que chaque candidat devra fournir.</p></div><button type="button" className="secondary-action" onClick={addField}><Plus />Ajouter un champ</button></div>
          <div className="builder-fields__list">{form.champs.map((field, index) => <div className="builder-field" key={field.id}>
            <label className="builder-field__control"><span>Libellé</span><input aria-label="Libellé" value={field.label} onChange={(event) => updateField(index, 'label', event.target.value)} /></label>
            <label className="builder-field__control"><span>Type de réponse</span><select value={field.type} onChange={(event) => updateField(index, 'type', event.target.value)}>{['TEXTE','EMAIL','TELEPHONE','DATE','NOMBRE','ZONE_TEXTE','SELECT'].map((type) => <option key={type}>{type}</option>)}</select></label>
            <label className="builder-field__required"><input type="checkbox" checked={field.obligatoire} onChange={(event) => updateField(index, 'obligatoire', event.target.checked)} /><span>Obligatoire</span></label>
            <button className="builder-field__delete" type="button" onClick={() => removeField(index)} aria-label={`Supprimer le champ ${field.label}`}><Trash2 /></button>
            {field.type === 'SELECT' && <label className="builder-field__options"><span>Choix proposés</span><input placeholder="Ex. Informatique, Gestion, Droit" value={field.options.join(', ')} onChange={(event) => updateField(index, 'options', event.target.value.split(',').map((option) => option.trim()).filter(Boolean))} /></label>}
          </div>)}</div>
        </div>
        <button className="button button--full" disabled={saving || !form.champs.length}>{saving ? <Spinner /> : <><Save />Enregistrer le formulaire</>}</button>
      </form>
      <section className="app-panel enrollment-requests"><header><div><strong>Dossiers reçus</strong><small>{requests.length} candidature(s)</small></div></header>{requests.length ? requests.map((request) => <article key={request.code_demande}><div><span className={`status-badge status-badge--${request.statut.toLowerCase()}`}>{request.statut.replaceAll('_', ' ')}</span><h3>{request.nom_candidat}</h3><p>{request.email} {request.telephone && `• ${request.telephone}`}</p><small>{request.code_demande} • {new Date(request.date_creation).toLocaleDateString('fr-FR')}</small></div><dl>{Object.entries(request.reponses || {}).map(([key, value]) => <div key={key}><dt>{form.champs.find((field) => field.id === key)?.label || key}</dt><dd>{String(value)}</dd></div>)}</dl>{['SOUMISE','EN_ETUDE','DOCUMENTS_REQUIS'].includes(request.statut) && <footer><button className="secondary-action" onClick={() => process(request, 'EN_ETUDE')}>Examiner</button><button className="button button--small" onClick={() => process(request, 'ACCEPTEE')}><Check />Accepter</button><button className="secondary-action" onClick={() => process(request, 'REFUSEE')}>Refuser</button></footer>}</article>) : <div className="management-empty"><ClipboardList /><h3>Aucun dossier</h3><p>Les demandes envoyées depuis la fiche publique apparaîtront ici.</p></div>}</section>
    </div>}
  </div>;
}
