import { Building2, Check, Image, MapPin, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useInstitution } from '../context/InstitutionContext.jsx';

const empty = { nom:'',sigle:'',slug:'',type:'PRIVEE',description:'',ville:'Goma',province:'Nord-Kivu',email:'',telephone:'',siteWeb:'',adresse:'',urlLogo:'',urlCouverture:'',inscriptionsOuvertes:false };

export function InstitutionProfilePage() {
  const { token, utilisateur } = useAuth();
  const { universite, refresh } = useInstitution();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const source = universite || {};
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      ...empty,
      nom:source.nom||'', sigle:source.sigle||'', slug:source.slug||'', type:source.type_universite||'PRIVEE', description:source.description||'',
      ville:source.ville||utilisateur?.ville||'Goma', province:source.province||utilisateur?.province||'Nord-Kivu', email:source.email||utilisateur?.email||'', telephone:source.telephone||'',
      siteWeb:source.site_web||'', adresse:source.adresse||'', urlLogo:source.url_logo||'', urlCouverture:source.url_couverture||'', inscriptionsOuvertes:Boolean(source.inscriptions_ouvertes),
    });
  }, [universite, utilisateur]);

  function update(field) { return (event) => { const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value; setForm((current) => ({...current,[field]:value,...(field==='nom'&&!current.slug?{slug:value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}: {})})); }; }

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      if (!universite) {
        await apiRequest('/universites',{method:'POST',token,body:{nom:form.nom,sigle:form.sigle||undefined,slug:form.slug,type:form.type,description:form.description||undefined,ville:form.ville,province:form.province,email:form.email||undefined,telephone:form.telephone||undefined}});
      } else {
        await apiRequest(`/universites/${universite.code_universite}`,{method:'PATCH',token,body:{nom:form.nom,sigle:form.sigle||null,description:form.description||null,ville:form.ville,province:form.province,email:form.email||null,telephone:form.telephone||null,siteWeb:form.siteWeb||null,adresse:form.adresse||null,urlLogo:form.urlLogo||null,urlCouverture:form.urlCouverture||null,inscriptionsOuvertes:form.inscriptionsOuvertes}});
      }
      await refresh(); setMessage(universite?'Fiche mise à jour avec succès.':'Fiche créée et envoyée pour vérification.');
    } catch(err) { setError(err.message); } finally { setSaving(false); }
  }

  return <div><DashboardPageHeader title={universite?'Fiche publique':'Créer la fiche universitaire'} description="Gérez les informations visibles par les étudiants." actions={universite&&<StatusBadge status={universite.statut_verification} />} />{message&&<div className="alert alert--success"><Check />{message}</div>}{error&&<div className="alert alert--error">{error}</div>}<form className="profile-editor" onSubmit={submit}><section className="app-panel profile-cover"><div className="profile-cover__image" style={form.urlCouverture?{backgroundImage:`url(${form.urlCouverture})`}:undefined}><Image /></div><div className="profile-logo">{form.urlLogo?<img src={form.urlLogo} alt="Logo"/>:<Building2 />}</div><div><h2>{form.nom||'Nom de l’université'}</h2><p><MapPin />{form.ville}, {form.province}</p></div></section><section className="app-panel form-section"><div className="form-section__heading"><h2>Identité</h2><p>Nom officiel, sigle et présentation générale.</p></div><div className="form-grid"><Field label="Nom officiel"><input required minLength="3" value={form.nom} onChange={update('nom')}/></Field><Field label="Sigle"><input maxLength="20" value={form.sigle} onChange={update('sigle')}/></Field>{!universite&&<><Field label="Identifiant URL" wide><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={update('slug')}/></Field><Field label="Type"><select value={form.type} onChange={update('type')}><option value="PUBLIQUE">Publique</option><option value="PRIVEE">Privée</option></select></Field></>}<Field label="Présentation" wide><textarea rows="6" maxLength="5000" value={form.description} onChange={update('description')}/></Field></div></section><section className="app-panel form-section"><div className="form-section__heading"><h2>Coordonnées</h2><p>Informations de contact et localisation.</p></div><div className="form-grid"><Field label="Ville"><input required value={form.ville} onChange={update('ville')}/></Field><Field label="Province"><input required value={form.province} onChange={update('province')}/></Field><Field label="E-mail public"><input type="email" value={form.email} onChange={update('email')}/></Field><Field label="Téléphone"><input value={form.telephone} onChange={update('telephone')}/></Field>{universite&&<><Field label="Site web"><input type="url" value={form.siteWeb} onChange={update('siteWeb')} placeholder="https://…"/></Field><Field label="Adresse"><input value={form.adresse} onChange={update('adresse')}/></Field><Field label="URL du logo" wide><input type="url" value={form.urlLogo} onChange={update('urlLogo')} placeholder="https://…"/></Field><Field label="URL de la couverture" wide><input type="url" value={form.urlCouverture} onChange={update('urlCouverture')} placeholder="https://…"/></Field><label className="switch-field form-field--wide"><input type="checkbox" checked={form.inscriptionsOuvertes} onChange={update('inscriptionsOuvertes')}/><span/><div><strong>Inscriptions ouvertes</strong><small>Afficher que l’établissement accepte les candidatures.</small></div></label></>}</div></section><div className="form-save-bar"><p>Les modifications publiques peuvent être revérifiées.</p><button className="button" disabled={saving}>{saving?<Spinner/>:<><Save/>Enregistrer</>}</button></div></form></div>;
}

function Field({label,wide,children}) { return <label className={`editor-field ${wide?'form-field--wide':''}`}><span>{label}</span>{children}</label>; }
