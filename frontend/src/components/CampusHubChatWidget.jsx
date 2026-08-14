import { Bot, ExternalLink, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';

const messageAccueil = {
  id: 'accueil',
  role: 'ASSISTANT',
  contenu: 'Bonjour ! Je suis CampusHubIA. Posez-moi une question sur CampusHub, les établissements, les formations, les admissions ou l’orientation.',
  sources: [],
};

const questionsRapides = [
  'Salut, ça va ?',
  'Je cherche une université qui propose l’informatique',
  'Combien d’universités et d’instituts supérieurs avez-vous ?',
];

export function CampusHubChatWidget() {
  const [ouvert, setOuvert] = useState(false);
  const [messages, setMessages] = useState([messageAccueil]);
  const [question, setQuestion] = useState('');
  const [derniereQuestion, setDerniereQuestion] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const finRef = useRef(null);
  const champRef = useRef(null);
  const prefixeId = useId();
  const sequenceId = useRef(0);
  const sessionId = useRef(0);

  const fermerEtReinitialiser = useCallback(() => {
    sessionId.current += 1;
    sequenceId.current = 0;
    setOuvert(false);
    setMessages([messageAccueil]);
    setQuestion('');
    setDerniereQuestion('');
    setChargement(false);
    setErreur('');
  }, []);

  function nouvelId(type) {
    sequenceId.current += 1;
    return `${prefixeId}-${type}-${sequenceId.current}`;
  }

  useEffect(() => {
    if (!ouvert) return undefined;
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    const minuterie = window.setTimeout(() => champRef.current?.focus(), 180);
    return () => window.clearTimeout(minuterie);
  }, [ouvert, messages, chargement]);

  useEffect(() => {
    function fermerAvecEchap(event) {
      if (event.key === 'Escape') fermerEtReinitialiser();
    }
    function ouvrirDepuisNavigation() {
      setOuvert(true);
    }
    window.addEventListener('keydown', fermerAvecEchap);
    window.addEventListener('campushub:ouvrir-assistant', ouvrirDepuisNavigation);
    return () => {
      window.removeEventListener('keydown', fermerAvecEchap);
      window.removeEventListener('campushub:ouvrir-assistant', ouvrirDepuisNavigation);
    };
  }, [fermerEtReinitialiser]);

  async function envoyer(event, questionProposee, nouvelleQuestion = true) {
    event?.preventDefault();
    const texte = String(questionProposee ?? question).trim();
    if (!texte || chargement) return;
    let historiqueAvantQuestion = messages.filter((message) => message.id !== 'accueil');
    if (!nouvelleQuestion && historiqueAvantQuestion.at(-1)?.role === 'UTILISATEUR') historiqueAvantQuestion = historiqueAvantQuestion.slice(0, -1);
    historiqueAvantQuestion = historiqueAvantQuestion.slice(-8);
    const messageUtilisateur = { id: nouvelId('u'), role: 'UTILISATEUR', contenu: texte, sources: [] };
    if (nouvelleQuestion) setMessages((courants) => [...courants, messageUtilisateur]);
    setQuestion('');
    setDerniereQuestion(texte);
    setErreur('');
    setChargement(true);
    const sessionEnCours = sessionId.current;
    try {
      const resultat = await apiRequest('/assistant/question', {
        method: 'POST',
        body: {
          question: texte,
          historique: historiqueAvantQuestion.map(({ role, contenu }) => ({ role, contenu })),
        },
      });
      if (sessionEnCours !== sessionId.current) return;
      setMessages((courants) => [...courants, {
        id: nouvelId('a'),
        role: 'ASSISTANT',
        contenu: resultat.donnees.reponse,
        sources: resultat.donnees.sources || [],
      }]);
    } catch (error) {
      if (sessionEnCours === sessionId.current) setErreur(error.message);
    } finally {
      if (sessionEnCours === sessionId.current) setChargement(false);
    }
  }

  return <div className={`campushub-chat ${ouvert ? 'campushub-chat--open' : ''}`}>
    {ouvert && <section className="campushub-chat__panel" role="dialog" aria-modal="false" aria-label="Discussion avec CampusHubIA">
      <header className="campushub-chat__header">
        <span className="campushub-chat__avatar"><Bot /></span>
        <div><strong>CampusHubIA</strong><small><i />Assistant en ligne</small></div>
        <button type="button" onClick={fermerEtReinitialiser} aria-label="Fermer la discussion"><X /></button>
      </header>

      <div className="campushub-chat__messages" aria-live="polite">
        <div className="campushub-chat__notice"><Sparkles />Corpus CampusHub, données vérifiées et sources web affichées lorsque nécessaire.</div>
        {messages.map((message) => <article className={`campushub-chat__message campushub-chat__message--${message.role.toLowerCase()}`} key={message.id}>
          {message.role === 'ASSISTANT' && <span><Bot /></span>}
          <div>
            <p>{message.contenu}</p>
            {!!message.sources?.length && <nav>{message.sources.map((source) => source.externe
              ? <a href={source.url} target="_blank" rel="noreferrer" key={source.code}>{source.label}<ExternalLink /></a>
              : <Link to={source.url} key={source.code}>{source.label}<ExternalLink /></Link>)}</nav>}
          </div>
        </article>)}
        {messages.length === 1 && <div className="campushub-chat__suggestions">{questionsRapides.map((item) => <button type="button" key={item} onClick={(event) => envoyer(event, item)}>{item}</button>)}</div>}
        {chargement && <div className="campushub-chat__typing"><Bot /><span><i /><i /><i /></span><small>CampusHubIA prépare sa réponse…</small></div>}
        {erreur && <div className="campushub-chat__error">{erreur} <button type="button" onClick={(event) => envoyer(event, derniereQuestion, false)}>Réessayer</button></div>}
        <div ref={finRef} />
      </div>

      <form className="campushub-chat__composer" onSubmit={envoyer}>
        <label><span className="sr-only">Votre question</span><textarea ref={champRef} rows="1" maxLength="1200" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); envoyer(event); }
        }} placeholder="Posez votre question…" /></label>
        <button type="submit" disabled={!question.trim() || chargement} aria-label="Envoyer"><Send /></button>
      </form>
      <footer>CampusHubIA peut se tromper : confirmez toujours les conditions auprès de l’établissement.</footer>
    </section>}

    <button className="campushub-chat__launcher" type="button" onClick={() => ouvert ? fermerEtReinitialiser() : setOuvert(true)} aria-expanded={ouvert} aria-label={ouvert ? 'Fermer CampusHubIA' : 'Poser une question à CampusHubIA'}>
      {ouvert ? <X /> : <MessageCircle />}
      {!ouvert && <span><strong>Une question ?</strong><small>Demandez à CampusHubIA</small></span>}
    </button>
  </div>;
}
