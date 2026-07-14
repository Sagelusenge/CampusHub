import { Check, LockKeyhole, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { apiRequest } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { FileUploadField } from '../components/FileUploadField.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function SettingsPage() {
  const { utilisateur, token, mettreAJourUtilisateur } = useAuth();
  const [form, setForm] = useState({
    nomAffichage: utilisateur?.nom_affichage || '',
    biographie: utilisateur?.biographie || '',
    ville: utilisateur?.ville || '',
    province: utilisateur?.province || '',
    urlPhotoProfil: utilisateur?.url_photo_profil || '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await apiRequest('/utilisateurs/moi', {
        method: 'PATCH',
        token,
        body: {
          ...form,
          urlPhotoProfil: form.urlPhotoProfil || null,
          biographie: form.biographie || null,
          ville: form.ville || null,
          province: form.province || null,
        },
      });
      mettreAJourUtilisateur(response.donnees);
      setMessage('Votre profil et votre photo ont été mis à jour.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const initials = (form.nomAffichage || 'CampusHub').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  return <div>
    <DashboardPageHeader title="Paramètres" description="Personnalisez votre identité visible sur CampusHub." />
    {message && <div className="alert alert--success"><Check />{message}</div>}
    {error && <div className="alert alert--error">{error}</div>}
    <form className="settings-grid" onSubmit={submit}>
      <section className="app-panel settings-card settings-card--form">
        <div className="settings-profile-heading">
          <span className="settings-profile-avatar">{form.urlPhotoProfil ? <img src={form.urlPhotoProfil} alt="Aperçu de ma photo de profil" /> : initials}</span>
          <div><h2>Photo de profil</h2><p>Elle apparaîtra dans le réseau, les commentaires, les stories et la messagerie.</p></div>
        </div>
        <div className="settings-photo-editor">
          <FileUploadField label={form.urlPhotoProfil ? 'Choisir une autre photo' : 'Choisir une photo depuis la machine'} value={form.urlPhotoProfil} token={token} onUploaded={(url) => setForm((current) => ({ ...current, urlPhotoProfil: url }))} />
          {form.urlPhotoProfil && <button className="secondary-action settings-remove-photo" type="button" onClick={() => setForm((current) => ({ ...current, urlPhotoProfil: '' }))}><Trash2 />Retirer la photo</button>}
        </div>
        <div className="form-grid form-field--wide">
          <Field label="Nom affiché"><input required value={form.nomAffichage} onChange={(event) => setForm({ ...form, nomAffichage: event.target.value })} /></Field>
          <Field label="Ville"><input value={form.ville} onChange={(event) => setForm({ ...form, ville: event.target.value })} /></Field>
          <Field label="Province"><input value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })} /></Field>
          <Field label="Biographie" wide><textarea rows="4" value={form.biographie} onChange={(event) => setForm({ ...form, biographie: event.target.value })} /></Field>
        </div>
        <button className="button" disabled={saving}>{saving ? <Spinner /> : <><Save />Enregistrer les modifications</>}</button>
      </section>
      <section className="app-panel settings-card"><span><LockKeyhole /></span><div><h2>Sécurité</h2><p>Le mot de passe est chiffré et n’est jamais affiché.</p><small>La modification du mot de passe sera disponible avec le module de récupération sécurisé.</small></div></section>
      <section className="app-panel settings-card"><span><ShieldCheck /></span><div><h2>Statut du compte</h2><p>{utilisateur?.email} • {utilisateur?.code_utilisateur}</p><small>Rôle : {utilisateur?.role} • Vérification : {utilisateur?.statut_verification}</small></div></section>
    </form>
  </div>;
}

function Field({ label, wide, children }) {
  return <label className={`editor-field ${wide ? 'form-field--wide' : ''}`}><span>{label}</span>{children}</label>;
}
