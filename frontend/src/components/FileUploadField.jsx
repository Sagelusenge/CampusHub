import { ImagePlus, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { uploadFile } from '../api/client.js';
import { Spinner } from './Spinner.jsx';

export function FileUploadField({ label, value, onUploaded, token, proof = false }) {
  const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  async function change(event) {
    const file=event.target.files?.[0]; if(!file)return; setLoading(true); setError('');
    try { const response=await uploadFile(proof?'/televersements/preuves':'/televersements/images',file,proof?undefined:token); onUploaded(response.donnees.url); }
    catch(err){setError(err.message)} finally{setLoading(false)}
  }
  return <label className="file-upload-field"><span>{value?<img src={value} alt="Aperçu"/>:(proof?<UploadCloud/>:<ImagePlus/>)}</span><div><strong>{label}</strong><small>{loading?'Envoi en cours…':'JPEG, PNG, WEBP'+(proof?' ou PDF':'')+' — taille limitée'}</small>{error&&<em>{error}</em>}</div>{loading?<Spinner/>:<input type="file" accept={proof?'image/jpeg,image/png,image/webp,application/pdf':'image/jpeg,image/png,image/webp'} onChange={change}/>}</label>;
}
