import { BookOpen, Building2, ChevronDown, GraduationCap, MapPin, Plus, Trash2, X } from 'lucide-react';
import { cloneElement, useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useInstitution } from '../context/InstitutionContext.jsx';

export function InstitutionProgramsPage() {
  const { token } = useAuth(); const { universite } = useInstitution();
  const isSchool = universite?.categorie_etablissement === 'ECOLE_SECONDAIRE';
  const [facultes, setFacultes] = useState([]); const [campus, setCampus] = useState([]); const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true); const [modal, setModal] = useState(null); const [form, setForm] = useState({}); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!universite) { setLoading(false); return; } setLoading(true);
    try {
      const [facResponse, campusResponse] = await Promise.all([apiRequest(`/catalogue/universites/${universite.code_universite}/facultes`, { token }), apiRequest(`/catalogue/universites/${universite.code_universite}/campus`, { token })]);
      const enriched = await Promise.all((facResponse.donnees || []).map(async (item) => ({ ...item, filieres: (await apiRequest(`/catalogue/facultes/${item.code_faculte}/filieres`, { token })).donnees || [] })));
      setFacultes(enriched); setCampus(campusResponse.donnees || []);
      if (enriched[0] && !enriched.some((item) => item.code_faculte === selected)) setSelected(enriched[0].code_faculte);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, [token, universite, selected]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  function open(type, faculte) { setModal(type); setForm(type === 'faculte' ? { nom: '', slug: '', description: '' } : { faculte: faculte || selected, nom: '', slug: '', domaine: '', niveauDiplome: 'LICENCE', dureeAnnees: 3, description: '', fraisMinimum: '', fraisMaximum: '', devise: 'USD', estActive: true, campuses: [] }); }
  function change(field, value) { setForm((current) => ({ ...current, [field]: value, ...(field === 'nom' && !current.slug ? { slug: value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') } : {}) })); }
  async function submit(event) {
    event.preventDefault(); setSaving(true);
    try {
      if (modal === 'faculte') await apiRequest(`/catalogue/universites/${universite.code_universite}/facultes`, { method: 'POST', token, body: form });
      else {
        const { faculte, campuses, ...body } = form;
        const response = await apiRequest(`/catalogue/facultes/${faculte}/filieres`, { method: 'POST', token, body: { ...body, dureeAnnees: Number(body.dureeAnnees), fraisMinimum: body.fraisMinimum === '' ? null : Number(body.fraisMinimum), fraisMaximum: body.fraisMaximum === '' ? null : Number(body.fraisMaximum) } });
        await Promise.all((campuses || []).map((codeCampus) => apiRequest(`/catalogue/campus/${codeCampus}/filieres/${response.donnees.code_filiere}`, { method: 'POST', token })));
      }
      setModal(null); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  async function remove(type, code) { if (!window.confirm('Confirmer la suppression ?')) return; try { await apiRequest(`/catalogue/${type}/${code}`, { method: 'DELETE', token }); await load(); } catch (err) { setError(err.message); } }
  if (!universite) return <div className="no-university"><Building2 /><h2>Créez d’abord votre fiche d’établissement</h2></div>;
  const current = facultes.find((item) => item.code_faculte === selected);
  return <div><DashboardPageHeader title={isSchool ? 'Sections et options' : 'Facultés et filières'} description={isSchool ? 'Organisez les sections, les options et les niveaux proposés par votre école.' : 'Organisez l’offre académique et associez chaque filière à ses campus.'} actions={<div className="content-heading__actions"><button className="secondary-action" onClick={() => open('faculte')}><Plus />{isSchool ? 'Section' : 'Faculté'}</button><button className="button" onClick={() => open('filiere')} disabled={!facultes.length}><Plus />{isSchool ? 'Option' : 'Filière'}</button></div>} />
    {error && <div className="alert alert--error">{error}</div>}{loading ? <div className="content-loading"><Spinner />Chargement…</div> : facultes.length ? <div className="faculty-layout"><aside className="faculty-list">{facultes.map((item) => <button className={selected === item.code_faculte ? 'active' : ''} onClick={() => setSelected(item.code_faculte)} key={item.code_faculte}><span><BookOpen /></span><div><strong>{item.nom}</strong><small>{item.filieres.length} {isSchool ? 'option(s)' : 'filière(s)'}</small></div><ChevronDown /></button>)}</aside><section className="app-panel programs-panel">{current && <><div className="programs-panel__heading"><div><span className="eyebrow">{current.code_faculte}</span><h2>{current.nom}</h2><p>{current.description || 'Aucune description'}</p></div><div><button className="table-action" onClick={() => open('filiere', current.code_faculte)}><Plus /></button><button className="table-action table-action--danger" onClick={() => remove('facultes', current.code_faculte)}><Trash2 /></button></div></div><div className="program-list">{current.filieres.length ? current.filieres.map((filiere) => <article key={filiere.code_filiere}><span><GraduationCap /></span><div><h3>{filiere.nom}</h3><p>{filiere.domaine} • {filiere.niveau_diplome} • {filiere.duree_annees || '—'} an(s)</p><small>{filiere.frais_minimum || 0}–{filiere.frais_maximum || 0} {filiere.devise}</small>{filiere.codes_campus && <div className="program-campus-chips">{filiere.codes_campus.split(',').map((code) => <span key={code}><MapPin />{campus.find((site) => site.code_campus === code)?.nom || code}</span>)}</div>}</div><button onClick={() => remove('filieres', filiere.code_filiere)}><Trash2 /></button></article>) : <Empty isSchool={isSchool} />}</div></>}</section></div> : <div className="management-empty app-panel"><BookOpen /><h3>{isSchool ? 'Aucune section' : 'Aucune faculté'}</h3><p>{isSchool ? 'Créez une section pour y ajouter ses options.' : 'Créez une faculté pour ajouter ses filières.'}</p><button className="button" onClick={() => open('faculte')}><Plus />Créer {isSchool ? 'une section' : 'une faculté'}</button></div>}
    {modal && <ProgramModal type={modal} form={form} change={change} facultes={facultes} campus={campus} saving={saving} close={() => setModal(null)} submit={submit} isSchool={isSchool} />}
  </div>;
}

function ProgramModal({ type, form, change, facultes, campus, saving, close, submit, isSchool }) { return <div className="modal-backdrop" onMouseDown={close}><form className="resource-modal resource-modal--large" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="resource-modal__heading"><div><span className="eyebrow">Nouvelle ressource</span><h2>{type === 'faculte' ? `Créer une ${isSchool ? 'section' : 'faculté'}` : `Créer une ${isSchool ? 'option' : 'filière'}`}</h2></div><button type="button" onClick={close}><X /></button></div><div className="form-grid">{type === 'filiere' && <Field label={isSchool ? 'Section' : 'Faculté'}><select value={form.faculte} onChange={(event) => change('faculte', event.target.value)}>{facultes.map((item) => <option key={item.code_faculte} value={item.code_faculte}>{item.nom}</option>)}</select></Field>}<Field label="Nom"><input required value={form.nom} onChange={(event) => change('nom', event.target.value)} /></Field><Field label="Identifiant URL" wide={type === 'faculte'}><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(event) => change('slug', event.target.value)} /></Field>{type === 'filiere' && <><Field label={isSchool ? 'Domaine / niveau' : 'Domaine'}><input required value={form.domaine} onChange={(event) => change('domaine', event.target.value)} /></Field><Field label={isSchool ? 'Niveau obtenu' : 'Diplôme'}><select value={form.niveauDiplome} onChange={(event) => change('niveauDiplome', event.target.value)}>{['CERTIFICAT', 'LICENCE', 'MASTER', 'DOCTORAT', 'AUTRE'].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Durée (années)"><input type="number" min="1" max="15" value={form.dureeAnnees} onChange={(event) => change('dureeAnnees', event.target.value)} /></Field><Field label="Devise"><input minLength="3" maxLength="3" value={form.devise} onChange={(event) => change('devise', event.target.value)} /></Field><Field label="Frais minimum"><input type="number" min="0" value={form.fraisMinimum} onChange={(event) => change('fraisMinimum', event.target.value)} /></Field><Field label="Frais maximum"><input type="number" min="0" value={form.fraisMaximum} onChange={(event) => change('fraisMaximum', event.target.value)} /></Field></>}<Field label="Description" wide><textarea rows="4" value={form.description} onChange={(event) => change('description', event.target.value)} /></Field>{type === 'filiere' && campus.length > 0 && <div className="form-field--wide campus-assignment"><span>{isSchool ? 'Sites proposant cette option' : 'Campus proposant cette filière'}</span><div>{campus.map((site) => <label key={site.code_campus}><input type="checkbox" checked={(form.campuses || []).includes(site.code_campus)} onChange={(event) => change('campuses', event.target.checked ? [...(form.campuses || []), site.code_campus] : (form.campuses || []).filter((code) => code !== site.code_campus))} /><span><strong>{site.nom}</strong><small>{site.ville}</small></span></label>)}</div></div>}</div><button className="button button--full" disabled={saving}>{saving ? <Spinner /> : <><Plus />Créer</>}</button></form></div>; }
function Field({ label, wide, children }) {
  const identifiantAutomatique = label === 'Identifiant URL';
  return <label className={`editor-field ${wide ? 'form-field--wide' : ''}`}>
    <span>{identifiantAutomatique ? 'Identifiant technique (automatique)' : label}</span>
    {identifiantAutomatique ? cloneElement(children, { readOnly: true, tabIndex: -1 }) : children}
    {identifiantAutomatique && <small>Créé automatiquement à partir du nom pour construire une adresse web stable.</small>}
  </label>;
}
function Empty({ isSchool }) { return <div className="management-empty"><GraduationCap /><h3>{isSchool ? 'Aucune option' : 'Aucune filière'}</h3><p>{isSchool ? 'Ajoutez la première option de cette section.' : 'Ajoutez la première filière de cette faculté.'}</p></div>; }
