import { Building2, Check, MapPin, Plus, Search, Trash2, Wrench, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useInstitution } from '../context/InstitutionContext.jsx';
import { LocationSelector } from '../components/LocationSelector.jsx';
import { LocationPicker } from '../components/LocationPicker.jsx';
import { FileUploadField } from '../components/FileUploadField.jsx';

const configs = {
  campus:{title:'Campus',description:'Gérez les différents sites de votre université.',path:'campus',code:'code_campus',icon:MapPin,fields:[['nom','Nom du campus','text'],['adresse','Adresse','text'],['estPrincipal','Campus principal','checkbox']]},
  services:{title:'Services universitaires',description:'Présentez les services proposés aux étudiants.',path:'services',code:'code_service',icon:Wrench,fields:[['nom','Nom du service','text'],['description','Description','textarea'],['estDisponible','Service disponible','checkbox']]},
  infrastructures:{title:'Infrastructures',description:'Inventoriez les équipements et espaces de votre établissement.',path:'infrastructures',code:'code_infrastructure',icon:Building2,fields:[['nom','Nom','text'],['categorie','Catégorie','text'],['quantite','Quantité','number'],['description','Description','textarea']]},
  admissions:{title:'Conditions d’admission',description:'Expliquez clairement les exigences d’inscription.',path:'conditions-admission',code:'code_condition',icon:Check,fields:[['titre','Titre','text'],['niveauDiplome','Niveau','select'],['description','Description complète','textarea']]},
};

const schoolConfigs = {
  campus:{...configs.campus,title:'Sites scolaires',description:'Gérez le site principal et les éventuelles annexes de votre école.'},
  services:{...configs.services,title:'Services scolaires',description:'Présentez les services proposés aux élèves et aux familles.'},
  infrastructures:{...configs.infrastructures,description:'Inventoriez les salles, laboratoires, terrains et équipements de votre école.'},
  admissions:{...configs.admissions,title:'Conditions d’inscription',description:'Expliquez les documents, niveaux et conditions nécessaires pour inscrire un élève.'},
};

export function InstitutionResourcePage({type}) {
  const {token}=useAuth(); const {universite}=useInstitution(); const isSchool=universite?.categorie_etablissement==='ECOLE_SECONDAIRE'; const config=(isSchool?schoolConfigs:configs)[type];
  const [items,setItems]=useState([]); const [loading,setLoading]=useState(true); const [modal,setModal]=useState(false); const [form,setForm]=useState({}); const [saving,setSaving]=useState(false); const [error,setError]=useState(''); const [search,setSearch]=useState('');
  const load=useCallback(async()=>{if(!universite){setLoading(false);return;}setLoading(true);try{setItems((await apiRequest(`/catalogue/universites/${universite.code_universite}/${config.path}`,{token})).donnees||[]);}catch(err){setError(err.message);}finally{setLoading(false);}},[config.path,token,universite]);
  useEffect(()=>{
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  },[load]);
  const visible=useMemo(()=>items.filter(item=>JSON.stringify(item).toLowerCase().includes(search.toLowerCase())),[items,search]);
  function open(){const values={};config.fields.forEach(([key,,kind])=>values[key]=kind==='checkbox'?(key==='estPrincipal'?false:true):key==='niveauDiplome'?'LICENCE':'');if(type==='campus')Object.assign(values,{countryCode:'CD',pays:universite?.pays||'Democratic Republic of the Congo',stateCode:'',province:universite?.province||'',ville:universite?.ville||'',latitude:'',longitude:''});if(type==='infrastructures')values.urlImage='';setForm(values);setModal(true);}
  async function submit(event){event.preventDefault();setSaving(true);setError('');try{const body={...form};if(body.quantite!=='')body.quantite=Number(body.quantite);await apiRequest(`/catalogue/universites/${universite.code_universite}/${config.path}`,{method:'POST',token,body});setModal(false);await load();}catch(err){setError(err.message);}finally{setSaving(false);}}
  async function remove(item){if(!window.confirm(`Supprimer « ${item.nom||item.titre} » ?`))return;try{await apiRequest(`/catalogue/${config.path==='conditions-admission'?'conditions-admission':config.path}/${item[config.code]}`,{method:'DELETE',token});setItems(current=>current.filter(row=>row[config.code]!==item[config.code]));}catch(err){setError(err.message);}}
  if(!universite)return <MissingUniversity/>;
  return <div><DashboardPageHeader title={config.title} description={config.description} actions={<button className="button" onClick={open}><Plus/>Ajouter</button>}/>{error&&<div className="alert alert--error">{error}</div>}<section className="app-panel management-panel"><div className="management-toolbar"><label><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher…"/></label><span className="resource-count">{visible.length} élément(s)</span></div>{loading?<div className="content-loading"><Spinner/>Chargement…</div>:visible.length?<div className="resource-grid">{visible.map(item=><article className="resource-card" key={item[config.code]}>{item.url_image?<img className="resource-card__image" src={item.url_image} alt=""/>:<span className="resource-card__icon"><config.icon/></span>}<div><small>{item[config.code]}</small><h3>{item.nom||item.titre}</h3><p>{item.description||item.adresse||`${item.ville||''} ${item.province||''}`||'Aucune description'}</p>{item.categorie&&<span className="role-chip">{item.categorie}</span>}{item.niveau_diplome&&<span className="role-chip">{item.niveau_diplome}</span>}</div><button onClick={()=>remove(item)} aria-label="Supprimer"><Trash2/></button></article>)}</div>:<EmptyResource icon={config.icon}/>}</section>{modal&&<div className="modal-backdrop" onMouseDown={()=>setModal(false)}><form className="resource-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><div className="resource-modal__heading"><div><span className="eyebrow">Nouvel élément</span><h2>Ajouter — {config.title}</h2></div><button type="button" onClick={()=>setModal(false)}><X/></button></div>{config.fields.map(([key,label,kind])=><ResourceField key={key} field={key} label={label} kind={kind} value={form[key]} onChange={value=>setForm(current=>({...current,[key]:value}))}/>)}{type==='campus'&&<><LocationSelector compact value={form} emailContact={universite?.email} onChange={changes=>setForm(current=>({...current,...changes}))}/><LocationPicker compact latitude={form.latitude} longitude={form.longitude} adresse={form.adresse} onChange={coordinates=>setForm(current=>({...current,...coordinates}))}/></>}{type==='infrastructures'&&<FileUploadField label="Photo de l’infrastructure" value={form.urlImage} accept="image/*" onUploaded={(url)=>setForm(current=>({...current,urlImage:url}))}/>}<button className="button button--full" disabled={saving||(type==='campus'&&(!form.ville||!form.province||form.latitude===''||form.longitude===''))}>{saving?<Spinner/>:<><Plus/>Créer</>}</button></form></div>}</div>;
}

function ResourceField({field,label,kind,value,onChange}){if(kind==='checkbox')return <label className="switch-field"><input type="checkbox" checked={Boolean(value)} onChange={e=>onChange(e.target.checked)}/><span/><div><strong>{label}</strong></div></label>;if(kind==='textarea')return <label className="editor-field"><span>{label}</span><textarea required={field==='description'} rows="4" value={value} onChange={e=>onChange(e.target.value)}/></label>;if(kind==='select')return <label className="editor-field"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{['CERTIFICAT','LICENCE','MASTER','DOCTORAT','AUTRE'].map(item=><option key={item}>{item}</option>)}</select></label>;return <label className="editor-field"><span>{label}</span><input required={['nom','titre','ville','province','categorie'].includes(field)} type={kind} min={kind==='number'?0:undefined} value={value} onChange={e=>onChange(e.target.value)}/></label>}
function EmptyResource({icon:Icon}){return <div className="management-empty"><span><Icon/></span><h3>Aucun élément ajouté</h3><p>Utilisez le bouton « Ajouter » pour commencer.</p></div>}
function MissingUniversity(){return <div className="no-university"><Building2/><h2>Créez d’abord votre fiche d’établissement</h2><p>Cette rubrique sera disponible après la création de la fiche.</p></div>}
