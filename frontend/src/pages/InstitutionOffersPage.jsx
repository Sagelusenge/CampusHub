import { BriefcaseBusiness, CalendarClock, Eye, ImagePlus, Plus, Send, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, uploadFile } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useInstitution } from '../context/InstitutionContext.jsx';

const emptyForm = {
  titre: '', type: 'INSCRIPTION', publicCible: 'TOUS', description: '', conditions: '',
  modalite: 'PRESENTIEL', ville: '', province: '', urlCandidature: '', emailContact: '',
  dateDebut: '', dateLimite: '', publier: true,
};

const typeLabels = {
  INSCRIPTION: 'Inscription', BOURSE: 'Bourse', FORMATION: 'Formation', STAGE: 'Stage',
  EMPLOI: 'Emploi', EVENEMENT: 'Événement', AUTRE: 'Autre',
};

export function InstitutionOffersPage() {
  const { token } = useAuth();
  const { universite } = useInstitution();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState(null);
  const preview = useMemo(() => image ? URL.createObjectURL(image) : null, [image]);
  const isSchool = universite?.categorie_etablissement === 'ECOLE_SECONDAIRE';

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const load = useCallback(async () => {
    if (!universite) { setLoading(false); return; }
    setLoading(true);
    try {
      const response = await apiRequest('/offres/moi?page=1&limite=50', { token });
      setItems(response.donnees || []);
      setError('');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [token, universite]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function open() {
    setForm({
      ...emptyForm,
      publicCible: isSchool ? 'ELEVES' : 'ETUDIANTS',
      ville: universite?.ville || '', province: universite?.province || '',
      emailContact: universite?.email || '',
    });
    setImage(null); setError(''); setModal(true);
  }

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      let urlImage = null;
      if (image) urlImage = (await uploadFile('/televersements/images', image, token)).donnees.url;
      await apiRequest('/offres', {
        method: 'POST', token,
        body: {
          codeUniversite: universite.code_universite,
          ...form,
          conditions: form.conditions || null,
          urlCandidature: form.urlCandidature || null,
          emailContact: form.emailContact || null,
          dateDebut: form.dateDebut || null,
          dateLimite: form.dateLimite || null,
          urlImage,
        },
      });
      setModal(false); setImage(null); await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function changeStatus(item, statut) {
    try {
      await apiRequest(`/offres/${item.code_offre}`, { method: 'PATCH', token, body: { statut } });
      await load();
    } catch (err) { setError(err.message); }
  }

  async function remove(item) {
    if (!window.confirm('Retirer cette offre du catalogue ?')) return;
    try { await apiRequest(`/offres/${item.code_offre}`, { method: 'DELETE', token }); await load(); }
    catch (err) { setError(err.message); }
  }

  if (!universite) return <div className="no-university"><BriefcaseBusiness /><h2>Créez d’abord votre fiche d’établissement</h2></div>;
  return <div className="institution-offers">
    <DashboardPageHeader
      title="Offres"
      description={isSchool ? 'Publiez les inscriptions, activités, formations courtes et opportunités destinées aux élèves et aux familles.' : 'Publiez vos admissions, bourses, stages, emplois, formations et événements.'}
      actions={<button className="button" onClick={open}><Plus />Nouvelle offre</button>}
    />
    {error && <div className="alert alert--error">{error}</div>}
    <section className="app-panel offer-management-panel">
      <div className="offer-management-summary"><div><strong>{items.length}</strong><span>offre(s) enregistrée(s)</span></div><Link to="/offres" target="_blank"><Eye />Voir le catalogue public</Link></div>
      {loading ? <div className="content-loading"><Spinner />Chargement…</div> : items.length ? <div className="managed-offer-grid">
        {items.map((item) => <article className="managed-offer" key={item.code_offre}>
          <div className="managed-offer__visual">{item.url_image ? <img src={item.url_image} alt="" /> : <BriefcaseBusiness />}<span>{typeLabels[item.type_offre]}</span></div>
          <div className="managed-offer__body"><div><StatusBadge status={item.statut} />{item.est_expiree === 1 && <span className="offer-expired">Expirée</span>}</div><h3>{item.titre}</h3><p>{item.description}</p><small><CalendarClock />{item.date_limite ? `Date limite : ${formatDate(item.date_limite)}` : 'Sans date limite'}</small></div>
          <div className="managed-offer__actions">
            {item.statut === 'BROUILLON' && <button onClick={() => changeStatus(item, 'PUBLIEE')}><Send />Publier</button>}
            {item.statut === 'PUBLIEE' && <button onClick={() => changeStatus(item, 'CLOTUREE')}><X />Clôturer</button>}
            {item.statut === 'CLOTUREE' && <button onClick={() => changeStatus(item, 'PUBLIEE')}><Send />Republier</button>}
            <button className="danger" onClick={() => remove(item)}><Trash2 />Retirer</button>
          </div>
        </article>)}
      </div> : <div className="management-empty"><BriefcaseBusiness /><h3>Aucune offre</h3><p>Créez une offre pour informer les candidats, élèves, étudiants ou familles.</p><button className="button" onClick={open}><Plus />Créer la première offre</button></div>}
    </section>

    {modal && <div className="modal-backdrop" onMouseDown={() => setModal(false)}><form className="resource-modal resource-modal--large offer-editor" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
      <div className="resource-modal__heading"><div><span className="eyebrow">{isSchool ? 'Communication scolaire' : 'Opportunité académique'}</span><h2>Nouvelle offre</h2></div><button type="button" onClick={() => setModal(false)}><X /></button></div>
      <div className="form-grid">
        <Field label="Titre" wide><input required minLength="5" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder={isSchool ? 'Ex. Inscriptions en 7e année ouvertes' : 'Ex. Bourse en sciences informatiques'} /></Field>
        <Field label="Type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        <Field label="Public cible"><select value={form.publicCible} onChange={(e) => setForm({ ...form, publicCible: e.target.value })}><option value="TOUS">Tout le monde</option><option value="ELEVES">Élèves</option><option value="ETUDIANTS">Étudiants</option><option value="DIPLOMES">Diplômés</option><option value="PARENTS">Parents</option></select></Field>
        <Field label="Description" wide><textarea required minLength="20" rows="5" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Conditions" wide><textarea rows="3" value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} placeholder="Documents, niveau ou critères requis…" /></Field>
        <Field label="Modalité"><select value={form.modalite} onChange={(e) => setForm({ ...form, modalite: e.target.value })}><option value="PRESENTIEL">Présentiel</option><option value="EN_LIGNE">En ligne</option><option value="HYBRIDE">Hybride</option></select></Field>
        <Field label="E-mail de contact"><input type="email" value={form.emailContact} onChange={(e) => setForm({ ...form, emailContact: e.target.value })} /></Field>
        <Field label="Ville"><input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} /></Field>
        <Field label="Province"><input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} /></Field>
        <Field label="Date de début"><input type="date" value={form.dateDebut} onChange={(e) => setForm({ ...form, dateDebut: e.target.value })} /></Field>
        <Field label="Date limite"><input type="date" min={form.dateDebut || undefined} value={form.dateLimite} onChange={(e) => setForm({ ...form, dateLimite: e.target.value })} /></Field>
        <Field label="Lien de candidature" wide><input type="url" value={form.urlCandidature} onChange={(e) => setForm({ ...form, urlCandidature: e.target.value })} placeholder="https://… (facultatif)" /></Field>
        <label className="publication-image-picker form-field--wide"><span>Visuel de l’offre</span><div className="publication-image-picker__box">{preview ? <img src={preview} alt="Aperçu" /> : <><ImagePlus /><strong>Choisir une photo</strong><small>JPG, PNG ou WebP — 5 Mo maximum</small></>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImage(e.target.files?.[0] || null)} /></div>{image && <button type="button" onClick={() => setImage(null)}><X />Retirer la photo</button>}</label>
        <label className="switch-field form-field--wide"><input type="checkbox" checked={form.publier} onChange={(e) => setForm({ ...form, publier: e.target.checked })} /><span /><div><strong>Publier immédiatement</strong><small>Sinon, l’offre sera conservée comme brouillon.</small></div></label>
      </div>
      <button className="button button--full" disabled={saving}>{saving ? <Spinner /> : <><Send />Enregistrer l’offre</>}</button>
    </form></div>}
  </div>;
}

function Field({ label, wide, children }) { return <label className={`editor-field ${wide ? 'form-field--wide' : ''}`}><span>{label}</span>{children}</label>; }
function formatDate(value) { return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR'); }
