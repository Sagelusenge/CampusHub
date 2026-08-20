import { ArrowRight, Bot, Building2, Check, CheckCircle2, ClipboardCheck, Copy, FileText, GraduationCap, History, ScanSearch, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useInstitution } from '../context/InstitutionContext.jsx';

const outils = [
  { type: 'PUBLICATION', titre: 'Créer une publication', description: 'Préparer un brouillon pour le réseau CampusHub.', icon: FileText, exemple: 'Présentez notre journée portes ouvertes du mois prochain et invitez les futurs étudiants.' },
  { type: 'PRESENTATION_FILIERE', titre: 'Présenter une filière', description: 'Transformer les données académiques en présentation claire.', icon: GraduationCap, exemple: 'Expliquez les débouchés et les points importants de cette formation sans inventer de statistiques.' },
  { type: 'ADMISSION', titre: 'Clarifier les admissions', description: 'Créer un guide lisible à partir des conditions enregistrées.', icon: ClipboardCheck, exemple: 'Produisez une checklist simple des étapes et documents pour les candidats.' },
  { type: 'DIAGNOSTIC_FICHE', titre: 'Auditer notre fiche', description: 'Identifier les informations manquantes ou peu convaincantes.', icon: ScanSearch, exemple: 'Analysez notre fiche et donnez les cinq améliorations prioritaires.' },
];

export function InstitutionCopilotPage() {
  const { token } = useAuth();
  const { universite } = useInstitution();
  const [configuration, setConfiguration] = useState(null);
  const [contexte, setContexte] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [form, setForm] = useState({ type: 'PUBLICATION', demande: outils[0].exemple, ton: 'PROFESSIONNEL', publicCible: 'futurs étudiants', codeFiliere: '' });
  const [resultat, setResultat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const outilActif = useMemo(() => outils.find((item) => item.type === form.type), [form.type]);

  const charger = useCallback(async () => {
    if (!universite) return;
    try {
      const [config, contexteResponse, historiqueResponse] = await Promise.all([
        apiRequest('/copilote-institution/configuration', { token }),
        apiRequest('/copilote-institution/contexte', { token }),
        apiRequest('/copilote-institution/historique', { token }),
      ]);
      setConfiguration(config.donnees);
      setContexte(contexteResponse.donnees);
      setHistorique(historiqueResponse.donnees || []);
      setError('');
    } catch (err) { setError(err.message); }
  }, [token, universite]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  function choisirOutil(outil) {
    setForm((current) => ({ ...current, type: outil.type, demande: outil.exemple, codeFiliere: outil.type === 'PRESENTATION_FILIERE' ? current.codeFiliere : '' }));
    setResultat(null);
  }

  async function generer(event) {
    event.preventDefault(); setLoading(true); setError(''); setCopied(false);
    try {
      const response = await apiRequest('/copilote-institution/generer', {
        method: 'POST', token,
        body: { ...form, codeFiliere: form.codeFiliere || null },
      });
      setResultat(response.donnees);
      await charger();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function copier() {
    await navigator.clipboard.writeText(resultat.resultat);
    setCopied(true);
  }

  if (!universite) return <section className="app-panel copilote-empty"><Building2 /><h2>Votre fiche universitaire est nécessaire</h2><p>Le copilote s’appuie sur vos informations réelles. Créez votre fiche avant de générer du contenu.</p><Link className="button" to="/espace-universite/fiche">Créer ma fiche <ArrowRight /></Link></section>;

  return <section className="institution-copilot">
    <DashboardPageHeader title="Copilote établissement" description="Un assistant de travail pour mieux présenter votre université, sans jamais publier à votre place." />
    <div className="copilot-status">
      <span className={configuration?.disponible ? 'ai-status-dot ai-status-dot--live' : 'ai-status-dot'} />
      <div><strong>{configuration?.disponible ? 'CampusHubIA opérationnel' : 'Moteur local de secours'}</strong><small>{configuration?.message || 'Vérification de la configuration…'}</small></div>
      <span><Sparkles />{configuration?.modele || 'campushubai'}</span>
    </div>
    {error && <div className="alert alert--error">{error}</div>}

    <div className="copilot-tool-grid">
      {outils.map(({ icon: Icon, ...outil }) => <button className={form.type === outil.type ? 'copilot-tool copilot-tool--active' : 'copilot-tool'} type="button" key={outil.type} onClick={() => choisirOutil(outil)}><span><Icon /></span><div><strong>{outil.titre}</strong><small>{outil.description}</small></div>{form.type === outil.type && <Check />}</button>)}
    </div>

    <div className="copilot-layout">
      <form className="app-panel copilot-editor" onSubmit={generer}>
        <header><span><outilActif.icon /></span><div><small>Outil sélectionné</small><h2>{outilActif.titre}</h2><p>{outilActif.description}</p></div></header>
        <label className="editor-field"><span>Vos attentes pour le texte</span><textarea required minLength="10" rows="5" value={form.demande} onChange={(event) => setForm({ ...form, demande: event.target.value })} placeholder="Décrivez le sujet, les informations indispensables et l’action attendue du lecteur." /></label>
        <div className="form-grid">
          <label className="editor-field"><span>Ton du brouillon</span><select value={form.ton} onChange={(event) => setForm({ ...form, ton: event.target.value })}><option value="PROFESSIONNEL">Professionnel</option><option value="ACCUEILLANT">Accueillant</option><option value="DYNAMIQUE">Dynamique</option><option value="INSTITUTIONNEL">Institutionnel</option></select></label>
          <label className="editor-field"><span>Public concerné</span><input value={form.publicCible} onChange={(event) => setForm({ ...form, publicCible: event.target.value })} /></label>
          {form.type === 'PRESENTATION_FILIERE' && <label className="editor-field editor-field--wide"><span>Filière à présenter</span><select required value={form.codeFiliere} onChange={(event) => setForm({ ...form, codeFiliere: event.target.value })}><option value="">Choisir une filière</option>{(contexte?.filieres || []).map((filiere) => <option value={filiere.code_filiere} key={filiere.code_filiere}>{filiere.nom} — {filiere.niveau_diplome}</option>)}</select></label>}
        </div>
        <button className="button button--full copilot-submit" disabled={loading}>{loading ? <><Spinner />Le copilote prépare le texte…</> : <><Bot />Générer le texte <Sparkles /></>}</button>
        <p className="copilot-notice"><CheckCircle2 />Vous relisez et validez toujours le résultat avant toute publication.</p>
      </form>

      <aside className="copilot-side">
        <section className="app-panel copilot-data"><header><Building2 /><div><h3>Données utilisées</h3><small>{contexte?.universite?.nom}</small></div></header><div>{Object.entries(contexte?.compteurs || {}).map(([cle, valeur]) => <span key={cle}><strong>{valeur}</strong><small>{cle}</small></span>)}</div><Link to="/espace-universite/fiche">Améliorer ma fiche <ArrowRight /></Link></section>
        <section className="app-panel copilot-history"><header><History /><div><h3>Brouillons récents</h3><small>{historique.length} génération(s)</small></div></header>{historique.length ? historique.slice(0, 6).map((item) => <button key={item.code_generation} type="button" onClick={() => setResultat({ ...item, type: item.type_generation, modeExecution: item.mode_execution, modele: item.modele_ia })}><span><FileText /></span><div><strong>{item.demande}</strong><small>{item.code_generation} • {new Date(item.date_creation).toLocaleDateString('fr-FR')}</small></div></button>) : <p>Aucun brouillon enregistré.</p>}</section>
      </aside>
    </div>

    {resultat && <section className="app-panel copilot-result"><header><div><span className="eyebrow eyebrow--accent">Brouillon à valider</span><h2>{outils.find((item) => item.type === resultat.type)?.titre || 'Résultat du copilote'}</h2><p>{resultat.code_generation} • {resultat.modeExecution === 'CAMPUSHUB_IA' ? 'CampusHubIA local' : 'Moteur de règles local'}</p></div><button type="button" className="secondary-action" onClick={copier}>{copied ? <><Check />Copié</> : <><Copy />Copier le texte</>}</button></header><div className="copilot-result__text">{resultat.resultat}</div><footer><CheckCircle2 />Ce contenu reste un brouillon. Vérifiez les dates, les frais et les conditions avant de le publier.</footer></section>}
  </section>;
}
