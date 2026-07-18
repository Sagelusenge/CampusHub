import { ArrowRight, Bot, BrainCircuit, CheckCircle2, FileScan, GraduationCap, History, MapPin, Send, ShieldCheck, Sparkles, WalletCards } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { FileUploadField } from '../components/FileUploadField.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const initialForm = {
  objectif: '', domaines: '', budgetMax: '800', devise: 'USD', pays: 'République démocratique du Congo',
  province: 'Nord-Kivu', ville: 'Goma', niveau: 'LICENCE', mobilite: true, message: '', bulletinUrl: '',
};

function jsonValue(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

export function OrientationAIPage({ embedded = false }) {
  const { token } = useAuth();
  const [configuration, setConfiguration] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [analyse, setAnalyse] = useState(null);
  const [resultat, setResultat] = useState(null);
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState('');

  const charger = useCallback(async () => {
    try {
      const [config, historique] = await Promise.all([
        apiRequest('/orientation/configuration', { token }),
        apiRequest('/orientation/dossiers', { token }),
      ]);
      setConfiguration(config.donnees);
      setDossiers(historique.donnees || []);
    } catch (err) { setError(err.message); }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  const domaines = useMemo(() => form.domaines.split(',').map((item) => item.trim()).filter(Boolean), [form.domaines]);

  async function analyserImage() {
    if (!form.bulletinUrl) return;
    setAnalysing(true); setError('');
    try {
      const response = await apiRequest('/orientation/analyser-bulletin', { method: 'POST', token, body: { urlImage: form.bulletinUrl } });
      if (!response.donnees.disponible) setError(response.donnees.message);
      setAnalyse(response.donnees.analyse);
    } catch (err) { setError(err.message); }
    finally { setAnalysing(false); }
  }

  async function orienter(event) {
    event.preventDefault(); setLoading(true); setError(''); setResultat(null);
    try {
      const response = await apiRequest('/orientation/recommandations', {
        method: 'POST', token,
        body: {
          objectif: form.objectif,
          message: form.message || null,
          bulletinUrl: form.bulletinUrl || null,
          analyseBulletin: analyse,
          criteres: {
            domaines,
            budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
            devise: form.devise,
            pays: form.pays,
            province: form.province || null,
            ville: form.ville || null,
            niveau: form.niveau || null,
            mobilite: form.mobilite,
            langues: ['français'],
          },
        },
      });
      setResultat(response.donnees);
      await charger();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  function ouvrirDossier(dossier) {
    setResultat({
      codeDossier: dossier.code_dossier,
      modeExecution: dossier.mode_execution,
      modele: dossier.modele_ia,
      texte: dossier.reponse_ia,
      recommandations: jsonValue(dossier.recommandations, []),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return <section className={`orientation-ai ${embedded ? 'orientation-ai--embedded' : ''}`}>
    <div className={embedded ? '' : 'container'}>
      <DashboardPageHeader title="CampusHub AI" description="Un conseiller d’orientation fondé sur les établissements et formations vérifiés." />
      <div className="ai-status-strip">
        <span className={configuration?.disponible ? 'ai-status-dot ai-status-dot--live' : 'ai-status-dot'} />
        <div><strong>{configuration?.disponible ? 'GPT‑5.6 connecté' : 'Mode démonstration vérifiable'}</strong><small>{configuration?.message || 'Vérification de la configuration…'}</small></div>
        <span className="ai-model-chip"><Sparkles />{configuration?.modele || 'gpt-5.6'}</span>
      </div>
      {error && <div className="alert alert--error">{error}</div>}

      <div className="orientation-ai__layout">
        <form className="app-panel orientation-form" onSubmit={orienter}>
          <header><span><BrainCircuit /></span><div><small>Votre projet</small><h2>Construisons votre orientation</h2><p>Les recommandations utilisent uniquement les données CampusHub vérifiées.</p></div></header>
          <label className="editor-field"><span>Quel métier ou projet visez-vous ?</span><textarea required minLength="10" rows="3" value={form.objectif} onChange={(event) => setForm({ ...form, objectif: event.target.value })} placeholder="Ex. Je veux travailler dans les énergies renouvelables et créer des solutions pour ma province." /></label>
          <div className="form-grid">
            <label className="editor-field"><span>Domaines, séparés par des virgules</span><input required value={form.domaines} onChange={(event) => setForm({ ...form, domaines: event.target.value })} placeholder="Informatique, énergie, gestion" /></label>
            <label className="editor-field"><span>Niveau recherché</span><select value={form.niveau} onChange={(event) => setForm({ ...form, niveau: event.target.value })}><option>LICENCE</option><option>CERTIFICAT</option><option>MASTER</option><option>DOCTORAT</option><option>AUTRE</option></select></label>
            <label className="editor-field"><span>Budget annuel maximal</span><div className="ai-budget-input"><WalletCards /><input type="number" min="1" value={form.budgetMax} onChange={(event) => setForm({ ...form, budgetMax: event.target.value })} /><select value={form.devise} onChange={(event) => setForm({ ...form, devise: event.target.value })}><option>USD</option><option>CDF</option></select></div></label>
            <label className="editor-field"><span>Ville actuelle</span><input value={form.ville} onChange={(event) => setForm({ ...form, ville: event.target.value })} /></label>
            <label className="editor-field"><span>Province</span><input value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })} /></label>
            <label className="switch-field"><input type="checkbox" checked={form.mobilite} onChange={(event) => setForm({ ...form, mobilite: event.target.checked })} /><span /><div><strong>Je peux étudier dans une autre ville</strong><small>Élargit les possibilités recommandées.</small></div></label>
          </div>

          <section className="ai-report-card">
            <div><FileScan /><span><strong>Bulletin scolaire facultatif</strong><small>GPT‑5.6 peut extraire les matières et notes. Vous devez toujours confirmer le résultat.</small></span></div>
            <FileUploadField label="Choisir une photo du bulletin" value={form.bulletinUrl} token={token} onUploaded={(url) => { setForm((current) => ({ ...current, bulletinUrl: url })); setAnalyse(null); }} />
            {form.bulletinUrl && <button className="secondary-action" type="button" disabled={analysing || !configuration?.disponible} onClick={analyserImage}>{analysing ? <Spinner /> : <><FileScan />Analyser avec GPT‑5.6</>}</button>}
            {analyse && <div className="ai-analysis"><CheckCircle2 /><div><strong>Extraction à confirmer</strong><p>{(analyse.points_forts || []).join(' • ') || 'Bulletin analysé'}</p><small>{(analyse.matieres || []).length} matière(s) reconnue(s) {analyse.moyenne_estimee ? `• moyenne estimée ${analyse.moyenne_estimee}` : ''}</small></div></div>}
          </section>

          <label className="editor-field"><span>Précision ou question pour le conseiller</span><textarea rows="3" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Ex. Je préfère une formation pratique et je dois rester proche de Goma." /></label>
          <button className="button button--full ai-submit" disabled={loading || domaines.length === 0}>{loading ? <><Spinner />CampusHub AI analyse les options…</> : <><Bot />Créer mon plan d’orientation <Send /></>}</button>
          <p className="ai-safety-note"><ShieldCheck />CampusHub AI aide à décider mais ne remplace pas la confirmation officielle de l’établissement.</p>
        </form>

        <aside className="orientation-ai__aside">
          <section className="app-panel ai-explainer"><Bot /><span className="eyebrow eyebrow--accent">Pourquoi c’est fiable</span><h3>L’IA raisonne. CampusHub fournit les faits.</h3><ul><li><CheckCircle2 />Établissements vérifiés</li><li><CheckCircle2 />Frais et campus issus de MySQL</li><li><CheckCircle2 />Aucune formation inventée</li><li><CheckCircle2 />Recommandations explicables</li></ul></section>
          <section className="app-panel ai-history"><header><History /><div><h3>Mes orientations</h3><small>{dossiers.length} dossier(s)</small></div></header>{dossiers.length ? dossiers.slice(0, 6).map((dossier) => <button type="button" key={dossier.code_dossier} onClick={() => ouvrirDossier(dossier)}><span>{dossier.mode_execution === 'GPT_5_6' ? <Sparkles /> : <GraduationCap />}</span><div><strong>{dossier.objectif}</strong><small>{dossier.code_dossier} • {new Date(dossier.date_creation).toLocaleDateString('fr-FR')}</small></div><ArrowRight /></button>) : <p>Aucun dossier enregistré.</p>}</section>
        </aside>
      </div>

      {resultat && <section className="ai-results">
        <header><div><span className="eyebrow eyebrow--accent">Plan personnalisé</span><h2>Vos options vérifiables</h2><p>Dossier {resultat.codeDossier} • {resultat.modeExecution === 'GPT_5_6' ? 'Généré avec GPT‑5.6' : 'Moteur de démonstration MySQL'}</p></div><span className="ai-model-chip"><Sparkles />{resultat.modele}</span></header>
        <div className="ai-recommendation-grid">{(resultat.recommandations || []).map((item, index) => <article key={item.code_filiere}><div className="ai-rank"><span>#{index + 1}</span><strong>{item.score_compatibilite}%</strong></div><div className="ai-score"><span style={{ width: `${item.score_compatibilite}%` }} /></div><small>{item.domaine} • {item.niveau_diplome}</small><h3>{item.nom_filiere}</h3><p className="ai-university"><GraduationCap />{item.nom_universite}</p><p><MapPin />{item.ville}, {item.province}</p><p><WalletCards />{item.frais_minimum !== null ? `À partir de ${item.frais_minimum} ${item.devise}` : 'Frais à confirmer'}</p><div className="ai-reasons">{(item.raisons || []).map((raison) => <span key={raison}><CheckCircle2 />{raison}</span>)}</div><Link to={`/universites/${item.code_universite}`}>Voir la fiche vérifiée <ArrowRight /></Link></article>)}</div>
        <div className="app-panel ai-answer"><span><Bot /></span><div><h3>Conseil CampusHub AI</h3><p>{resultat.texte}</p></div></div>
      </section>}
    </div>
  </section>;
}
