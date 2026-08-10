import { ArrowRight, Award, BarChart3, BookOpenCheck, CheckCircle2, GraduationCap, MapPin, School, ShieldCheck, Sparkles, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { LocationSelector } from '../components/LocationSelector.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const initialForm = {
  optionSecondaire: 'SCIENTIFIQUE',
  pourcentage: 65,
  interets: ['INFORMATIQUE'],
  budgetMax: '800',
  pays: 'Democratic Republic of the Congo',
  countryCode: 'CD',
  province: '',
  stateCode: '',
  ville: '',
  mobilite: true,
};

export function FinalistOrientationPage({ embedded = false }) {
  const { token } = useAuth();
  const [configuration, setConfiguration] = useState({ options: [], interets: [] });
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/orientation/finalistes/configuration', { token })
      .then((response) => setConfiguration(response.donnees))
      .catch((err) => setError(err.message));
  }, [token]);

  function toggleInterest(code) {
    setForm((current) => {
      const active = current.interets.includes(code);
      if (active && current.interets.length === 1) return current;
      if (!active && current.interets.length >= 4) return current;
      return { ...current, interets: active ? current.interets.filter((item) => item !== code) : [...current.interets, code] };
    });
  }

  function updateLocation(changes) { setForm((current) => ({ ...current, ...changes })); }

  async function submit(event) {
    event.preventDefault(); setLoading(true); setError(''); setResult(null);
    try {
      const response = await apiRequest('/orientation/finalistes/recommandations', {
        method: 'POST', token,
        body: {
          optionSecondaire: form.optionSecondaire,
          pourcentage: Number(form.pourcentage),
          interets: form.interets,
          budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
          province: form.province || null,
          ville: form.ville || null,
          mobilite: form.mobilite,
        },
      });
      setResult(response.donnees);
      window.setTimeout(() => document.getElementById('resultats-finaliste')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return <section className={`finalist-orientation ${embedded ? 'finalist-orientation--embedded' : ''}`}>
    <div className={embedded ? '' : 'container'}>
      <DashboardPageHeader title="Orientation des finalistes" description="Découvrez les formations compatibles avec votre option, votre pourcentage et vos ambitions." actions={<Link className="secondary-action" to="/orientation"><Sparkles />CampusHub AI</Link>} />
      <div className="finalist-intro app-panel"><span><School /></span><div><strong>Un résultat explicable, sans promesse d’admission</strong><p>L’algorithme compare votre parcours aux filières vérifiées de CampusHub. Chaque université garde ses propres critères officiels.</p></div><ShieldCheck /></div>
      {error && <div className="alert alert--error">{error}</div>}
      <div className="finalist-layout">
        <form className="app-panel finalist-form" onSubmit={submit}>
          <header><div><BookOpenCheck /></div><span><small>Profil scolaire</small><h2>Parlez-nous de votre parcours</h2></span></header>
          <label className="editor-field"><span>Option suivie au secondaire</span><select value={form.optionSecondaire} onChange={(event) => setForm({ ...form, optionSecondaire: event.target.value })}>{configuration.options.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label>
          <div className="finalist-percentage">
            <div><span>Pourcentage obtenu</span><strong>{form.pourcentage}%</strong></div>
            <input type="range" min="0" max="100" step="1" value={form.pourcentage} onChange={(event) => setForm({ ...form, pourcentage: event.target.value })} />
            <div className="finalist-percentage__scale"><small>0%</small><small>50%</small><small>100%</small></div>
          </div>
          <fieldset className="finalist-interests"><legend>Vos centres d’intérêt <small>1 à 4 choix</small></legend><div>{configuration.interets.map((interest) => <button type="button" className={form.interets.includes(interest.code) ? 'active' : ''} key={interest.code} onClick={() => toggleInterest(interest.code)}>{form.interets.includes(interest.code) && <CheckCircle2 />}{interest.label}</button>)}</div></fieldset>
          <label className="editor-field"><span>Budget annuel maximal (USD)</span><div className="finalist-budget"><WalletCards /><input type="number" min="1" value={form.budgetMax} onChange={(event) => setForm({ ...form, budgetMax: event.target.value })} placeholder="Facultatif" /></div></label>
          <div className="finalist-location"><h3><MapPin />Localisation préférée</h3><LocationSelector compact value={form} onChange={updateLocation} /></div>
          <label className="switch-field"><input type="checkbox" checked={form.mobilite} onChange={(event) => setForm({ ...form, mobilite: event.target.checked })} /><span /><div><strong>Je peux étudier dans une autre ville</strong><small>Permet de découvrir davantage d’établissements compatibles.</small></div></label>
          <button className="button button--full finalist-submit" disabled={loading || !form.interets.length}>{loading ? <><Spinner />Classement en cours…</> : <><BarChart3 />Voir les universités recommandées</>}</button>
        </form>
        <aside className="finalist-method app-panel"><Award /><span className="eyebrow eyebrow--accent">Calcul transparent</span><h2>Comment le classement fonctionne</h2><ol><li><strong>Option secondaire</strong><small>Correspondance avec le domaine de chaque filière.</small></li><li><strong>Pourcentage</strong><small>Indicateur académique, jamais une garantie d’admission.</small></li><li><strong>Centres d’intérêt</strong><small>Priorité aux formations proches de vos ambitions.</small></li><li><strong>Budget et ville</strong><small>Classement adapté à vos contraintes déclarées.</small></li></ol><p><ShieldCheck />Seules les formations d’établissements vérifiés sont proposées.</p></aside>
      </div>
      {result && <section className="finalist-results" id="resultats-finaliste"><header><div><span className="eyebrow eyebrow--accent">Dossier {result.codeDossier}</span><h2>Les formations les plus compatibles</h2><p>{result.texte}</p></div><span className="finalist-profile-score"><GraduationCap /><strong>{result.profil.pourcentage}%</strong><small>{result.profil.option}</small></span></header>
        {result.recommandations.length ? <div className="finalist-results-grid">{result.recommandations.map((item, index) => <article className="app-panel" key={item.code_filiere}><div className="finalist-result-rank"><span>#{index + 1}</span><div><strong>{item.score_compatibilite}%</strong><small>compatibilité</small></div></div><div className="finalist-score"><span style={{ width: `${item.score_compatibilite}%` }} /></div><span className={`finalist-indicator finalist-indicator--${item.indicateur_dossier.replaceAll(' ', '-').toLowerCase()}`}>{item.indicateur_dossier}</span><h3>{item.nom_filiere}</h3><p className="finalist-university"><GraduationCap />{item.nom_universite}</p><p><MapPin />{item.ville}, {item.province}</p><p><WalletCards />{item.frais_minimum !== null ? `À partir de ${item.frais_minimum} ${item.devise}` : 'Frais à confirmer'}</p><div className="finalist-reasons">{item.raisons.slice(0, 4).map((reason) => <span key={reason}><CheckCircle2 />{reason}</span>)}</div><Link to={`/universites/${item.code_universite}`}>Consulter l’établissement <ArrowRight /></Link></article>)}</div> : <div className="management-empty app-panel"><GraduationCap /><h3>Aucune correspondance suffisante</h3><p>Modifiez les centres d’intérêt ou activez la mobilité pour élargir la recherche.</p></div>}
        <p className="finalist-warning"><ShieldCheck />{result.avertissement}</p>
      </section>}
    </div>
  </section>;
}
