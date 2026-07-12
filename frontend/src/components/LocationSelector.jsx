import { City, Country, State } from 'country-state-city';
import { MapPin, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { Spinner } from './Spinner.jsx';

const RDC = 'CD';

export function LocationSelector({ value, onChange, emailContact, compact = false }) {
  const [missing, setMissing] = useState(false); const [proposal, setProposal] = useState('');
  const [sending, setSending] = useState(false); const [message, setMessage] = useState('');
  const countries = useMemo(() => Country.getAllCountries().sort((a,b)=>a.name.localeCompare(b.name)), []);
  const countryCode = value.countryCode || countries.find(item=>item.name.toLowerCase()===value.pays?.toLowerCase())?.isoCode || RDC;
  const states = useMemo(() => State.getStatesOfCountry(countryCode), [countryCode]);
  const stateCode = value.stateCode || states.find(item=>item.name.toLowerCase()===value.province?.toLowerCase())?.isoCode || '';
  const cities = useMemo(() => stateCode ? City.getCitiesOfState(countryCode, stateCode) : [], [countryCode, stateCode]);

  function chooseCountry(event) {
    const code=event.target.value; const country=countries.find(item=>item.isoCode===code);
    onChange({ countryCode:code, pays:country?.name||'', stateCode:'', province:'', ville:'' }); setMissing(false);
  }
  function chooseState(event) {
    const code=event.target.value; const state=states.find(item=>item.isoCode===code);
    onChange({ stateCode:code, province:state?.name||'', ville:'' }); setMissing(false);
  }
  function chooseCity(event) { onChange({ ville:event.target.value }); }
  async function suggest() {
    if (!proposal.trim() || !value.province) return;
    setSending(true); setMessage('');
    try {
      await apiRequest('/localisations/suggestions',{method:'POST',body:{pays:value.pays,province:value.province,villeProposee:proposal.trim(),emailContact:emailContact||null}});
      onChange({ville:proposal.trim()}); setMessage('Ville signalée au manager et utilisée pour ce formulaire.'); setMissing(false);
    } catch(err) { setMessage(err.message); } finally { setSending(false); }
  }

  return <div className={`location-selector ${compact?'location-selector--compact':''}`}>
    <label><span>Pays</span><select value={countryCode} onChange={chooseCountry}>{countries.map(item=><option key={item.isoCode} value={item.isoCode}>{item.isoCode===RDC?'République démocratique du Congo':item.name}</option>)}</select></label>
    <label><span>Province / État</span><select value={stateCode} onChange={chooseState} disabled={!states.length}><option value="">Choisir…</option>{states.map(item=><option key={item.isoCode} value={item.isoCode}>{item.name}</option>)}</select></label>
    <label><span>Ville</span><select value={value.ville||''} onChange={chooseCity} disabled={!value.province}><option value="">Choisir…</option>{cities.map((item,index)=><option key={`${item.name}-${index}`} value={item.name}>{item.name}</option>)}</select></label>
    <button className="missing-city" type="button" onClick={()=>setMissing(current=>!current)}><MapPin/>Ma ville n’est pas dans la liste</button>
    {missing&&<div className="city-proposal"><input value={proposal} onChange={event=>setProposal(event.target.value)} placeholder="Nom de la ville"/><button type="button" onClick={suggest} disabled={sending||!proposal.trim()}>{sending?<Spinner/>:<><Send/>Signaler</>}</button></div>}
    {message&&<small className="location-message">{message}</small>}
  </div>;
}
