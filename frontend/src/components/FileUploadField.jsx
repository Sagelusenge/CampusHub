import { FileText, ImagePlus, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { uploadFile } from '../api/client.js';
import { Spinner } from './Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function FileUploadField({ label, value, onUploaded, token, proof = false, document = false }) {
  const { token: sessionToken } = useAuth();
  const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  async function change(event) {
    const file=event.target.files?.[0]; if(!file)return; setLoading(true); setError('');
    try { const path=proof?'/televersements/preuves':document?'/televersements/documents':'/televersements/images'; const response=await uploadFile(path,file,proof?undefined:(token||sessionToken)); onUploaded(response.donnees.url); }
    catch(err){setError(err.message)} finally{setLoading(false)}
  }
  const apercuImage = value && !document && !value.toLowerCase().endsWith('.pdf');
  const accept = proof || document ? 'image/jpeg,image/png,image/webp,application/pdf,.doc,.docx' : 'image/jpeg,image/png,image/webp';
  return <label className="file-upload-field"><span>{apercuImage?<img src={value} alt="Aperçu"/>:value||document?<FileText/>:proof?<UploadCloud/>:<ImagePlus/>}</span><div><strong>{label}</strong><small>{loading?'Envoi en cours…':document?'PDF, DOC, DOCX ou image — taille limitée':'JPEG, PNG, WEBP'+(proof?' ou PDF':'')+' — taille limitée'}</small>{value&&<em>Fichier chargé</em>}{error&&<em>{error}</em>}</div>{loading?<Spinner/>:<input type="file" accept={accept} onChange={change}/>}</label>;
}
