import { ExternalLink, Handshake, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { FileUploadField } from '../components/FileUploadField.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const empty = { nom: '', categorie: 'ACADEMIQUE', description: '', siteWeb: '', urlLogo: '', estActif: true };

export function InstitutionPartnersPage() {
  const { token } = useAuth(); const [items, setItems] = useState([]); const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async () => { try { const response = await apiRequest('/communaute/partenaires/moi', { token }); setItems(response.donnees.partenaires || []); setError(''); } catch (err) { setError(err.message); } finally { setLoading(false); } }, [token]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  async function submit(event) { event.preventDefault(); setSaving(true); try { await apiRequest('/communaute/partenaires', { method: 'POST', token, body: { ...form, siteWeb: form.siteWeb || null, urlLogo: form.urlLogo || null } }); setModal(false); setForm(empty); await load(); } catch (err) { setError(err.message); } finally { setSaving(false); } }
  async function remove(code) { try { await apiRequest(`/communaute/partenaires/${code}`, { method: 'DELETE', token }); await load(); } catch (err) { setError(err.message); } }
  return <div><DashboardPageHeader title="Partenaires" description="Affichez les organisations qui collaborent avec votre établissement." actions={<button className="button button--small" onClick={() => setModal(true)}><Plus />Ajouter un partenaire</button>} />{error && <div className="alert alert--error">{error}</div>}
    {loading ? <div className="content-loading app-panel"><Spinner />Chargement…</div> : items.length ? <div className="partners-management-grid">{items.map((item) => <article className="app-panel" key={item.code_partenaire}><div className="partner-logo">{item.url_logo ? <img src={item.url_logo} alt="" /> : <Handshake />}</div><span>{item.categorie}</span><h2>{item.nom}</h2><p>{item.description || 'Partenaire de l’établissement.'}</p><footer>{item.site_web && <a href={item.site_web} target="_blank" rel="noreferrer"><ExternalLink />Site web</a>}<button onClick={() => remove(item.code_partenaire)}><Trash2 />Supprimer</button></footer></article>)}</div> : <div className="management-empty app-panel"><Handshake /><h3>Aucun partenaire</h3><p>Ajoutez vos partenaires académiques, entreprises, ONG ou institutions.</p></div>}
    {modal && <div className="modal-backdrop" onMouseDown={() => setModal(false)}><form className="resource-modal resource-modal--large partner-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
      <div className="resource-modal__heading"><div><span className="eyebrow">Écosystème institutionnel</span><h2>Ajouter un partenaire</h2><p>Présentez cette collaboration sur la fiche publique de votre établissement.</p></div><button type="button" onClick={() => setModal(false)} aria-label="Fermer"><X /></button></div>
      <div className="partner-modal__intro"><span><Handshake /></span><div><strong>Une fiche simple et crédible</strong><small>Le nom et la catégorie sont obligatoires. Le logo peut être chargé directement depuis votre machine.</small></div></div>
      <div className="partner-modal__grid">
        <label className="editor-field"><span>Nom du partenaire</span><input required value={form.nom} onChange={(event) => setForm({ ...form, nom: event.target.value })} placeholder="Ex. Fondation Campus Avenir" /></label>
        <label className="editor-field"><span>Catégorie</span><select value={form.categorie} onChange={(event) => setForm({ ...form, categorie: event.target.value })}><option value="ACADEMIQUE">Partenaire académique</option><option value="ENTREPRISE">Entreprise</option><option value="ONG">ONG</option><option value="INSTITUTION">Institution publique</option><option value="TECHNOLOGIQUE">Partenaire technologique</option><option value="AUTRE">Autre</option></select></label>
        <label className="editor-field partner-modal__wide"><span>Description de la collaboration</span><textarea rows="4" maxLength="1000" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Expliquez en quelques lignes la nature du partenariat et ses bénéfices pour les étudiants." /></label>
        <label className="editor-field partner-modal__wide"><span>Site web <small>Facultatif</small></span><input type="url" value={form.siteWeb} onChange={(event) => setForm({ ...form, siteWeb: event.target.value })} placeholder="https://partenaire.org" /></label>
        <div className="partner-modal__wide partner-modal__upload"><FileUploadField label={form.urlLogo ? 'Changer le logo du partenaire' : 'Charger le logo du partenaire'} value={form.urlLogo} token={token} onUploaded={(url) => setForm((current) => ({ ...current, urlLogo: url }))} /></div>
        <label className="switch-field partner-modal__wide"><input type="checkbox" checked={form.estActif} onChange={(event) => setForm({ ...form, estActif: event.target.checked })} /><span /><div><strong>Afficher ce partenaire</strong><small>Il sera visible immédiatement sur la fiche publique.</small></div></label>
      </div>
      <button className="button button--full" disabled={saving}>{saving ? <Spinner /> : <><Plus />Enregistrer le partenaire</>}</button>
    </form></div>}
  </div>;
}
