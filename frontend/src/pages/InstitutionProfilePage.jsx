import { Building2, Camera, Check, Image, MapPin, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest, uploadFile } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { LocationSelector } from '../components/LocationSelector.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useInstitution } from '../context/InstitutionContext.jsx';

const empty = {
  nom: '', sigle: '', type: 'PRIVEE', categorie: 'UNIVERSITE', description: '',
  countryCode: 'CD', pays: 'Democratic Republic of the Congo', stateCode: '', ville: '', province: '',
  email: '', telephone: '', siteWeb: '', adresse: '', urlLogo: '', urlCouverture: '', inscriptionsOuvertes: false,
};

export function InstitutionProfilePage() {
  const { token, utilisateur } = useAuth();
  const { universite, refresh } = useInstitution();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [mediaLoading, setMediaLoading] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const source = universite || {};
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      ...empty,
      nom: source.nom || '', sigle: source.sigle || '', type: source.type_universite || 'PRIVEE',
      categorie: source.categorie_etablissement || 'UNIVERSITE', description: source.description || '',
      pays: source.pays || utilisateur?.pays || empty.pays, ville: source.ville || utilisateur?.ville || '',
      province: source.province || utilisateur?.province || '', email: source.email || utilisateur?.email || '',
      telephone: source.telephone || '', siteWeb: source.site_web || '', adresse: source.adresse || '',
      urlLogo: source.url_logo || '', urlCouverture: source.url_couverture || '',
      inscriptionsOuvertes: Boolean(source.inscriptions_ouvertes),
    });
  }, [universite, utilisateur]);

  function update(field) {
    return (event) => setForm((current) => ({
      ...current,
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }));
  }

  async function enregistrerMedia(field, url) {
    setForm((current) => ({ ...current, [field]: url || '' }));
    if (!universite) {
      setMessage('Photo chargée. Enregistrez la fiche pour terminer.');
      return;
    }
    await apiRequest(`/universites/${universite.code_universite}`, {
      method: 'PATCH', token, body: { [field]: url || null },
    });
    await refresh();
    setMessage(field === 'urlLogo' ? 'La photo de profil de l’établissement a été mise à jour.' : 'La photo de couverture a été mise à jour.');
  }

  async function changerMedia(field, file) {
    if (!file) return;
    setMediaLoading(field); setError(''); setMessage('');
    try {
      const response = await uploadFile('/televersements/images', file, token);
      await enregistrerMedia(field, response.donnees.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setMediaLoading('');
    }
  }

  async function retirerMedia(field) {
    setMediaLoading(field); setError(''); setMessage('');
    try {
      await enregistrerMedia(field, null);
    } catch (err) {
      setError(err.message);
    } finally {
      setMediaLoading('');
    }
  }

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      if (!universite) {
        await apiRequest('/universites', {
          method: 'POST', token,
          body: {
            nom: form.nom, sigle: form.sigle || undefined, type: form.type, categorie: form.categorie,
            description: form.description || undefined, pays: form.pays, ville: form.ville, province: form.province,
            email: form.email || undefined, telephone: form.telephone || undefined,
            urlLogo: form.urlLogo || undefined, urlCouverture: form.urlCouverture || undefined,
          },
        });
      } else {
        await apiRequest(`/universites/${universite.code_universite}`, {
          method: 'PATCH', token,
          body: {
            nom: form.nom, sigle: form.sigle || null, categorie: form.categorie,
            description: form.description || null, pays: form.pays, ville: form.ville, province: form.province,
            email: form.email || null, telephone: form.telephone || null, siteWeb: form.siteWeb || null,
            adresse: form.adresse || null, urlLogo: form.urlLogo || null, urlCouverture: form.urlCouverture || null,
            inscriptionsOuvertes: form.inscriptionsOuvertes,
          },
        });
      }
      await refresh();
      setMessage(universite ? 'Fiche mise à jour avec succès.' : 'Fiche créée et envoyée pour vérification.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return <div>
    <DashboardPageHeader
      title={universite ? 'Fiche publique' : 'Créer la fiche universitaire'}
      description="Modifiez directement la photo de profil et la couverture depuis l’aperçu."
      actions={universite && <StatusBadge status={universite.statut_verification} />}
    />
    {message && <div className="alert alert--success"><Check />{message}</div>}
    {error && <div className="alert alert--error">{error}</div>}
    <form className="profile-editor" onSubmit={submit}>
      <section className="app-panel profile-cover profile-cover--editable">
        <div className="profile-cover__image" style={form.urlCouverture ? { backgroundImage: `url(${form.urlCouverture})` } : undefined}>
          {!form.urlCouverture && <Image />}
          <div className="profile-cover__actions">
            <MediaPicker label={form.urlCouverture ? 'Changer la couverture' : 'Ajouter une couverture'} loading={mediaLoading === 'urlCouverture'} onChange={(file) => changerMedia('urlCouverture', file)} />
            {form.urlCouverture && <button type="button" className="profile-media-remove" disabled={Boolean(mediaLoading)} onClick={() => retirerMedia('urlCouverture')} aria-label="Retirer la couverture"><Trash2 /></button>}
          </div>
        </div>
        <div className="profile-logo">{form.urlLogo ? <img src={form.urlLogo} alt="Photo de profil de l’établissement" /> : <Building2 />}</div>
        <div className="profile-logo-actions">
          <MediaPicker label={form.urlLogo ? 'Changer le profil' : 'Ajouter un profil'} loading={mediaLoading === 'urlLogo'} onChange={(file) => changerMedia('urlLogo', file)} compact />
          {form.urlLogo && <button type="button" className="profile-media-remove" disabled={Boolean(mediaLoading)} onClick={() => retirerMedia('urlLogo')} aria-label="Retirer la photo de profil"><Trash2 /></button>}
        </div>
        <div><h2>{form.nom || 'Nom de l’université'}</h2><p><MapPin />{form.ville || 'Ville à choisir'}, {form.province || 'Province'}</p></div>
      </section>

      <section className="app-panel institution-media-help">
        <Camera /><div><h2>Images publiques de l’établissement</h2><p>Le profil apparaît sur la fiche publique et la couverture dans l’annuaire. Cliquez sur les boutons de l’aperçu pour les remplacer ; les modifications d’une fiche existante sont enregistrées immédiatement.</p></div>
      </section>

      <section className="app-panel form-section">
        <div className="form-section__heading"><h2>Identité</h2><p>Nom officiel, catégorie, sigle et présentation générale.</p></div>
        <div className="form-grid">
          <Field label="Nom officiel"><input required minLength="3" value={form.nom} onChange={update('nom')} /></Field>
          <Field label="Sigle"><input maxLength="20" value={form.sigle} onChange={update('sigle')} /></Field>
          <Field label="Catégorie d’établissement"><select value={form.categorie} onChange={update('categorie')}><option value="UNIVERSITE">Université</option><option value="INSTITUT_SUPERIEUR">Institut supérieur</option><option value="ECOLE_SECONDAIRE">École secondaire</option></select></Field>
          {!universite && <Field label="Statut"><select value={form.type} onChange={update('type')}><option value="PUBLIQUE">Public</option><option value="PRIVEE">Privé</option></select></Field>}
          <Field label="Présentation" wide><textarea rows="6" maxLength="5000" value={form.description} onChange={update('description')} /></Field>
        </div>
      </section>

      <section className="app-panel form-section">
        <div className="form-section__heading"><h2>Localisation</h2><p>Choisissez le pays, la province puis la ville.</p></div>
        <LocationSelector value={form} emailContact={form.email} onChange={(changes) => setForm((current) => ({ ...current, ...changes }))} />
      </section>

      <section className="app-panel form-section">
        <div className="form-section__heading"><h2>Coordonnées</h2><p>Informations publiques permettant de contacter l’établissement.</p></div>
        <div className="form-grid">
          <Field label="E-mail public"><input type="email" value={form.email} onChange={update('email')} /></Field>
          <Field label="Téléphone"><input value={form.telephone} onChange={update('telephone')} /></Field>
          {universite && <><Field label="Site web"><input type="url" value={form.siteWeb} onChange={update('siteWeb')} placeholder="https://…" /></Field><Field label="Adresse"><input value={form.adresse} onChange={update('adresse')} /></Field></>}
          {universite && <label className="switch-field form-field--wide"><input type="checkbox" checked={form.inscriptionsOuvertes} onChange={update('inscriptionsOuvertes')} /><span /><div><strong>Inscriptions ouvertes</strong><small>Afficher que l’établissement accepte les candidatures.</small></div></label>}
        </div>
      </section>

      <div className="form-save-bar"><p>Les modifications publiques peuvent être revérifiées.</p><button className="button" disabled={saving || Boolean(mediaLoading) || !form.ville || !form.province}>{saving ? <Spinner /> : <><Save />Enregistrer</>}</button></div>
    </form>
  </div>;
}

function MediaPicker({ label, loading, onChange, compact = false }) {
  return <label className={`profile-media-button ${compact ? 'profile-media-button--compact' : ''}`}>
    {loading ? <Spinner /> : <Camera />}
    <span>{loading ? 'Chargement…' : label}</span>
    <input type="file" accept="image/jpeg,image/png,image/webp" disabled={loading} onChange={(event) => { onChange(event.target.files?.[0]); event.target.value = ''; }} />
  </label>;
}

function Field({ label, wide, children }) {
  return <label className={`editor-field ${wide ? 'form-field--wide' : ''}`}><span>{label}</span>{children}</label>;
}
