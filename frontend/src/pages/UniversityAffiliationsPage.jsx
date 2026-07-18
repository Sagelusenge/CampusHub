import { Check, GraduationCap, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { DashboardPageHeader } from '../components/DashboardShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useInstitution } from '../context/InstitutionContext.jsx';

export function UniversityAffiliationsPage() {
  const { universite } = useInstitution(); const isSchool = universite?.categorie_etablissement === 'ECOLE_SECONDAIRE';
  const { token } = useAuth(); const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [processing, setProcessing] = useState('');
  const load = useCallback(async () => { setLoading(true); try { setItems((await apiRequest('/affiliations/universite', { token })).donnees || []); setError(''); } catch (err) { setError(err.message); } finally { setLoading(false); } }, [token]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  async function decide(item, statut) { const reponse = statut === 'ACCEPTEE' ? `Votre inscription a été confirmée par notre ${isSchool ? 'école' : 'université'}.` : window.prompt('Motif du refus (facultatif) :') || 'Les informations transmises n’ont pas permis de confirmer l’inscription.'; setProcessing(item.code_demande); try { await apiRequest(`/affiliations/${item.code_demande}`, { method: 'PATCH', token, body: { statut, reponse } }); await load(); } catch (err) { setError(err.message); } finally { setProcessing(''); } }
  return <div><DashboardPageHeader title={isSchool ? 'Demandes des élèves' : 'Demandes étudiantes'} description={isSchool ? 'Confirmez uniquement les élèves réellement inscrits dans votre école.' : 'Confirmez uniquement les étudiants réellement inscrits dans votre établissement.'} actions={<button className="secondary-action" onClick={load}><RefreshCw />Actualiser</button>} />{error && <div className="alert alert--error">{error}</div>}<section className="app-panel management-panel">{loading ? <div className="content-loading"><Spinner />Chargement…</div> : items.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>{isSchool ? 'Élève' : 'Étudiant'}</th><th>{isSchool ? 'Option' : 'Filière'}</th><th>Matricule</th><th>Message</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item.code_demande}><td><strong>{item.nom_affichage}</strong><small className="cell-subtitle">{item.email} • {item.code_utilisateur}</small></td><td>{item.nom_filiere}<small className="cell-subtitle">{item.code_filiere}</small></td><td>{item.matricule_etudiant || '—'}</td><td className="details-cell">{item.message_etudiant || '—'}</td><td><StatusBadge status={item.statut} /></td><td>{item.statut === 'EN_ATTENTE' && <div className="table-actions"><button className="table-action table-action--success" disabled={processing === item.code_demande} title="Confirmer" onClick={() => decide(item, 'ACCEPTEE')}>{processing === item.code_demande ? <Spinner /> : <Check />}</button><button className="table-action table-action--danger" disabled={processing === item.code_demande} title="Refuser" onClick={() => decide(item, 'REJETEE')}><X /></button></div>}</td></tr>)}</tbody></table></div> : <div className="management-empty"><GraduationCap /><h3>{isSchool ? 'Aucune demande d’élève' : 'Aucune demande étudiante'}</h3><p>Les nouvelles demandes apparaîtront ici.</p></div>}</section></div>;
}
