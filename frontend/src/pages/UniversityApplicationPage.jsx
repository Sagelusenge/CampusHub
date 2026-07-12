import { ArrowLeft, ArrowRight, Building2, Check, CreditCard, Eye, EyeOff, FileCheck2, LockKeyhole, Mail, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { PageShell } from '../components/PageShell.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { LocationSelector } from '../components/LocationSelector.jsx';
import { FileUploadField } from '../components/FileUploadField.jsx';
import { PlanSelector } from '../components/PlanSelector.jsx';

const initialForm = {
  nomAffichage: '',
  email: '',
  motDePasse: '',
  countryCode: 'CD', pays: 'Democratic Republic of the Congo',
  stateCode: '', ville: '', province: '',
};

export function UniversityApplicationPage() {
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest('/auth/inscription', {
        method: 'POST',
        body: { email:form.email,motDePasse:form.motDePasse,role:'UNIVERSITE',nomAffichage:form.nomAffichage,pays:form.pays,ville:form.ville,province:form.province },
      });
      setResult(response.donnees);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <PageShell>
        <PaymentStep code={result.code_utilisateur || result.codeUtilisateur} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="application-page">
        <div className="container application-layout">
          <aside className="application-intro">
            <Link className="back-link" to="/"><ArrowLeft size={17} /> Retour à l’accueil</Link>
            <span className="pill pill--light"><Building2 size={15} /> Partenariat universitaire</span>
            <h1>Faites connaître votre université aux futurs étudiants.</h1>
            <p>CampusHub protège la confiance de sa communauté grâce à un processus simple de validation.</p>
            <div className="process-card">
              <div><span><Send size={18} /></span><p><strong>1. Envoyez votre demande</strong><small>Créez le compte officiel de l’établissement.</small></p></div>
              <div><span><CreditCard size={18} /></span><p><strong>2. Choisissez votre pack</strong><small>Essentiel 20 $, Professionnel 35 $ ou Excellence 50 $.</small></p></div>
              <div><span><FileCheck2 size={18} /></span><p><strong>3. Nous vérifions</strong><small>Le paiement validé active le compte.</small></p></div>
            </div>
          </aside>

          <form className="form-card application-form" onSubmit={handleSubmit}>
            <div className="form-heading">
              <span className="eyebrow eyebrow--accent">Étape 1 sur 2</span>
              <h2>Identité de l’établissement</h2>
              <p>Utilisez une adresse e-mail officielle que votre équipe peut consulter.</p>
            </div>

            {error && <div className="alert alert--error">{error}</div>}

            <label className="form-field form-field--wide">
              <span>Nom officiel de l’université</span>
              <div className="input-with-icon"><Building2 size={18} /><input required minLength="3" placeholder="Ex. Université de Goma" value={form.nomAffichage} onChange={update('nomAffichage')} /></div>
            </label>
            <label className="form-field form-field--wide">
              <span>Adresse e-mail institutionnelle</span>
              <div className="input-with-icon"><Mail size={18} /><input type="email" required placeholder="contact@universite.cd" value={form.email} onChange={update('email')} /></div>
            </label>
            <label className="form-field form-field--wide">
              <span>Mot de passe du gestionnaire</span>
              <div className="input-with-icon"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} required minLength="8" maxLength="72" placeholder="8 caractères minimum" value={form.motDePasse} onChange={update('motDePasse')} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Afficher le mot de passe">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              <small>Conservez-le : il permettra de se connecter après validation.</small>
            </label>
            <div className="form-field--wide"><LocationSelector value={form} emailContact={form.email} onChange={changes=>setForm(current=>({...current,...changes}))}/></div>

            <label className="consent form-field--wide">
              <input type="checkbox" required />
              <span>Je confirme représenter cet établissement et accepte la vérification des informations transmises.</span>
            </label>

            <button className="button button--large button--full form-field--wide" disabled={loading}>
              {loading ? <Spinner label="Envoi" /> : <>Envoyer la demande <ArrowRight size={18} /></>}
            </button>
            <p className="form-note form-field--wide">Déjà partenaire ? <Link to="/connexion">Connectez-vous ici</Link>.</p>
          </form>
        </div>
      </section>
    </PageShell>
  );
}

function PaymentStep({code}) {
  const [plans,setPlans]=useState([]);
  const [form,setForm]=useState({codePlan:'',typePaiement:'ABONNEMENT',moyenPaiement:'MOBILE_MONEY',referencePaiement:'',urlPreuve:''});
  const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [sent,setSent]=useState(false);
  useEffect(()=>{apiRequest('/abonnements/plans').then(response=>{const items=response.donnees||[];setPlans(items);setForm(current=>({...current,codePlan:items[0]?.code_plan||''}))}).catch(err=>setError(err.message))},[]);
  const selectedPlan=plans.find(plan=>plan.code_plan===form.codePlan);
  async function submit(event){event.preventDefault();if(!form.codePlan){setError('Choisissez un pack.');return;}if(!form.urlPreuve){setError('Ajoutez une preuve de paiement.');return;}setLoading(true);setError('');try{await apiRequest('/abonnements/paiements',{method:'POST',body:{codeUtilisateur:code,...form}});setSent(true)}catch(err){setError(err.message)}finally{setLoading(false)}}
  if(sent)return <section className="success-page"><div className="success-card"><div className="success-icon"><Check/></div><span className="eyebrow eyebrow--accent">Paiement transmis</span><h1>Votre activation est en cours.</h1><p>Un administrateur vérifiera la preuve. Vous recevrez ensuite l’accès pour créer la fiche de l’université.</p><div className="request-reference"><span>Compte institutionnel</span><strong>{code}</strong></div><Link className="button button--full" to="/connexion">Essayer la connexion <ArrowRight/></Link></div></section>;
  return <section className="subscription-checkout"><div className="container checkout-layout checkout-layout--packs"><div><span className="pill pill--teal"><CreditCard/>Packs CampusHub</span><h1>Choisissez le niveau adapté.</h1><p>Le badge certifié à 7 $ est indépendant et pourra être commandé depuis votre espace après activation.</p><PlanSelector plans={plans} selected={form.codePlan} onSelect={codePlan=>setForm(current=>({...current,codePlan}))}/></div><form className="form-card payment-form" onSubmit={submit}><span className="eyebrow eyebrow--accent">Étape 2 sur 2</span><h2>Pack {selectedPlan?.nom||'à choisir'} — {Number(selectedPlan?.prix_total||0)} $</h2><p>Le compte sera activé après contrôle de la preuve par l’administration.</p>{error&&<div className="alert alert--error">{error}</div>}<label className="form-field"><span>Moyen de paiement</span><select value={form.moyenPaiement} onChange={e=>setForm({...form,moyenPaiement:e.target.value})}><option value="MOBILE_MONEY">Mobile Money</option><option value="CARTE">Carte</option><option value="VIREMENT">Virement</option><option value="ESPECES">Espèces</option><option value="AUTRE">Autre</option></select></label><label className="form-field"><span>Référence de la transaction</span><input required value={form.referencePaiement} onChange={e=>setForm({...form,referencePaiement:e.target.value})} placeholder="Ex. MP240712001"/></label><FileUploadField label="Charger la preuve depuis la machine" value={form.urlPreuve} onUploaded={url=>setForm(current=>({...current,urlPreuve:url}))} proof/><button className="button button--large button--full" disabled={loading||!form.codePlan}>{loading?<Spinner/>:<><CreditCard/>Envoyer {Number(selectedPlan?.prix_total||0)} $ pour validation</>}</button><div className="request-reference"><span>Référence du compte</span><strong>{code}</strong></div></form></div></section>;
}
