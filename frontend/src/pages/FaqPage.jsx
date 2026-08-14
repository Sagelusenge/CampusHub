import {
  BookOpenCheck, Building2, ChevronDown, CircleHelp, Compass, GraduationCap,
  Lightbulb, MessageCircleQuestion, Search, ShieldCheck, Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/PageShell.jsx';

const sections = [
  {
    id: 'decouvrir',
    title: 'Découvrir CampusHub',
    description: 'Pourquoi la plateforme existe et comment commencer.',
    icon: Compass,
    questions: [
      {
        question: 'Pourquoi choisir CampusHub ?',
        answer: 'CampusHub réunit dans un même environnement les établissements vérifiés, leurs formations, leurs campus, leurs offres, les inscriptions en ligne, l’orientation et un réseau académique. L’objectif est de réduire les informations dispersées ou trompeuses et de rendre chaque parcours plus clair, traçable et accessible.',
      },
      {
        question: 'Comment fonctionne CampusHub, du début à l’inscription ?',
        answer: 'Commencez par rechercher un établissement, filtrez sa catégorie et sa localisation, consultez sa fiche, ses coordonnées exactes, ses filières et ses partenaires, puis utilisez son formulaire d’inscription si les admissions sont ouvertes. CampusHubIA peut aussi poser des questions sur votre option et votre résultat afin de proposer des pistes pertinentes.',
      },
      {
        question: 'Que signifie « établissement vérifié » ?',
        answer: 'L’administration CampusHub a examiné la demande institutionnelle et les preuves disponibles avant de rendre la fiche visible. La vérification améliore la fiabilité du catalogue, mais chaque candidat doit toujours confirmer les conditions officielles directement auprès de l’établissement.',
      },
      {
        question: 'Qui développe CampusHub ?',
        answer: 'CampusHub est développé par Sagel Lusenge. Son portfolio et ses autres réalisations sont accessibles depuis le pied de page de l’application.',
      },
    ],
  },
  {
    id: 'comptes',
    title: 'Comptes et accès',
    description: 'Comprendre les rôles et commencer avec le bon parcours.',
    icon: Users,
    questions: [
      {
        question: 'Quelle est la différence entre un visiteur, un étudiant et un établissement ?',
        answer: 'Le visiteur rejoint le réseau pour découvrir, suivre et échanger. L’étudiant possède aussi un espace personnel pour son affiliation, son orientation et son portfolio. L’établissement dispose d’un tableau de bord pour gérer sa fiche, ses formations, ses demandes, ses offres et ses publications.',
      },
      {
        question: 'Comment créer un compte étudiant ?',
        answer: 'Ouvrez la page de connexion, choisissez la carte Étudiant, puis renseignez votre nom, votre adresse e-mail, votre matricule obligatoire, votre mot de passe et votre localisation. Après la connexion, vous arriverez directement dans votre espace étudiant.',
      },
      {
        question: 'Pourquoi le matricule étudiant est-il obligatoire ?',
        answer: 'Le matricule aide l’établissement à reconnaître l’étudiant lorsqu’il reçoit sa demande d’affiliation. Il n’accorde pas automatiquement le statut étudiant : l’établissement doit encore confirmer la demande.',
      },
      {
        question: 'Comment créer un compte visiteur ?',
        answer: 'Depuis la connexion, choisissez la carte Visiteur. Le compte visiteur ouvre directement le réseau CampusHub et ne crée pas un tableau de bord institutionnel.',
      },
      {
        question: 'Que se passe-t-il après la connexion ?',
        answer: 'CampusHub redirige automatiquement chaque personne vers son espace : administration, établissement, étudiant ou réseau visiteur. Vous ne repassez pas inutilement par l’accueil.',
      },
    ],
  },
  {
    id: 'etudiants',
    title: 'Parcours étudiant',
    description: 'Affiliation, orientation, profil et vie académique.',
    icon: GraduationCap,
    questions: [
      {
        question: 'Comment demander à mon université de confirmer mon inscription ?',
        answer: 'Dans votre espace étudiant, ouvrez Mon affiliation, choisissez un établissement et une filière, puis envoyez la demande avec votre matricule et un message. Le gestionnaire de l’établissement peut l’accepter ou la refuser et vous recevez une notification.',
      },
      {
        question: 'Comment fonctionne l’orientation des finalistes ?',
        answer: 'Indiquez votre option du secondaire, votre pourcentage, vos centres d’intérêt et, si nécessaire, votre budget ou votre ville. CampusHub classe ensuite les formations compatibles parmi les établissements vérifiés.',
      },
      {
        question: 'À quoi sert CampusHubIA ?',
        answer: 'CampusHubIA est notre agent local entraîné sur les informations CampusHub. Il explique les possibilités d’études à partir des formations vérifiées et des données MySQL actualisées ; ses propositions ne remplacent pas la décision de l’étudiant ni la confirmation de l’établissement.',
      },
      {
        question: 'Que peut contenir mon profil étudiant ?',
        answer: 'Votre profil peut présenter votre photo, votre titre, vos compétences, votre année de diplomation, vos publications et votre établissement confirmé. Vous choisissez aussi si le profil doit être visible.',
      },
    ],
  },
  {
    id: 'etablissements',
    title: 'Établissements',
    description: 'Fiche publique, abonnement et gestion quotidienne.',
    icon: Building2,
    questions: [
      {
        question: 'Comment un établissement rejoint-il CampusHub ?',
        answer: 'Il crée son compte institutionnel et confirme son adresse e-mail. CampusHub active alors un essai gratuit unique de 30 jours afin que le gestionnaire puisse découvrir son espace et compléter sa fiche.',
      },
      {
        question: 'Que peut modifier le gestionnaire sur la fiche publique ?',
        answer: 'Il peut modifier le logo, la couverture, la présentation, la localisation, les campus, facultés ou sections, filières ou options, services, infrastructures, conditions d’admission et partenaires.',
      },
      {
        question: 'Comment fonctionne l’abonnement des établissements ?',
        answer: 'Chaque établissement commence avec 30 jours gratuits, sans paiement immédiat. Pour continuer, CampusHub propose ensuite un abonnement institutionnel unique à 10 USD par an. Les jours gratuits restants ne sont pas perdus si le paiement est validé pendant l’essai.',
      },
      {
        question: 'Comment publier une offre ?',
        answer: 'Depuis le tableau de bord, ouvrez Offres, ajoutez le titre, le public concerné, les conditions, les dates et éventuellement une image ou un document PDF. Les visiteurs peuvent consulter la première page, ouvrir le document complet et le télécharger.',
      },
      {
        question: 'Comment ajouter un partenaire ?',
        answer: 'Ouvrez Partenaires, indiquez le nom, la catégorie, la description et le site web, puis chargez le logo depuis votre machine. Un partenaire actif apparaît sur la fiche publique de l’établissement.',
      },
    ],
  },
  {
    id: 'inscriptions',
    title: 'Inscriptions en ligne',
    description: 'Créer, publier et traiter un formulaire de candidature.',
    icon: BookOpenCheck,
    questions: [
      {
        question: 'Comment créer un formulaire d’inscription en ligne ?',
        answer: 'Dans l’espace établissement, ouvrez Inscriptions en ligne. Ajoutez un titre, une présentation, les instructions et une date de clôture éventuelle. Composez ensuite les champs demandés et indiquez ceux qui sont obligatoires.',
      },
      {
        question: 'Comment ouvrir ou fermer les inscriptions ?',
        answer: 'Utilisez l’interrupteur Inscriptions ouvertes dans le constructeur, puis enregistrez. Un formulaire fermé reste conservé dans le tableau de bord, mais il n’est plus disponible pour une nouvelle candidature publique.',
      },
      {
        question: 'Comment un candidat envoie-t-il son formulaire ?',
        answer: 'Sur la fiche publique de l’établissement, le candidat ouvre l’inscription en ligne, remplit les champs définis par le gestionnaire et envoie sa candidature. Il doit être connecté comme visiteur ou étudiant.',
      },
      {
        question: 'Où arrivent les candidatures envoyées ?',
        answer: 'Elles apparaissent dans Dossiers reçus. Le gestionnaire peut les placer en étude, demander des documents, les accepter ou les refuser. Le candidat est informé du changement de statut.',
      },
    ],
  },
  {
    id: 'reseau',
    title: 'Réseau et publications',
    description: 'Publications, stories, relations et messagerie.',
    icon: MessageCircleQuestion,
    questions: [
      {
        question: 'Qui peut publier sur le réseau CampusHub ?',
        answer: 'Les étudiants et les établissements autorisés peuvent partager une publication selon leur espace. Le visiteur est en mode découverte : il peut consulter le réseau, mais il ne peut ni publier ni créer une story.',
      },
      {
        question: 'Quelles interactions sont disponibles ?',
        answer: 'Vous pouvez aimer, commenter, répondre à un commentaire, enregistrer, republier et partager une publication. Vous pouvez aussi suivre des établissements, créer des relations et discuter dans le chat.',
      },
      {
        question: 'Comment fonctionnent les stories ?',
        answer: 'Une story est une photo accompagnée d’un texte facultatif. Elle apparaît en haut du réseau pendant 24 heures, puis expire automatiquement.',
      },
      {
        question: 'Pourquoi une notification n’affiche-t-elle pas toujours un point rouge ?',
        answer: 'Le point rouge apparaît uniquement lorsqu’une notification non lue existe. Dès que toutes les notifications sont lues, l’indicateur disparaît.',
      },
    ],
  },
  {
    id: 'securite',
    title: 'Sécurité et assistance',
    description: 'Données, localisation et contact avec CampusHub.',
    icon: ShieldCheck,
    questions: [
      {
        question: 'Comment la localisation est-elle renseignée ?',
        answer: 'Le pays est choisi dans une liste, puis CampusHub propose les provinces ou États et les villes correspondantes. Si une ville manque, vous pouvez la signaler au gestionnaire sans saisir une localisation incohérente dans la fiche.',
      },
      {
        question: 'Mes fichiers sont-ils chargés depuis mon ordinateur ?',
        answer: 'Oui. Les photos de profil, couvertures, images de publication, logos, preuves et documents acceptés peuvent être sélectionnés depuis la machine. CampusHub contrôle leur type et leur taille avant stockage.',
      },
      {
        question: 'Que faire si une information est incorrecte ou si une ville manque ?',
        answer: 'Utilisez le signalement proposé dans le formulaire concerné ou ouvrez la page Contact. Le message est transmis à l’administration, qui peut le prendre en charge et vous répondre.',
      },
      {
        question: 'Comment contacter l’administration ?',
        answer: 'Ouvrez Contact dans le header, indiquez votre nom, votre adresse e-mail, le sujet et un message détaillé. Pour une réponse plus rapide, ajoutez le code de votre compte, de votre établissement ou de votre demande.',
      },
    ],
  },
];

function normalize(value) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function FaqPage() {
  const [query, setQuery] = useState('');
  const filteredSections = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return sections;
    return sections.map((section) => ({
      ...section,
      questions: section.questions.filter((item) => normalize(
        `${item.question} ${item.answer} ${section.title}`,
      ).includes(term)),
    })).filter((section) => section.questions.length);
  }, [query]);
  const total = filteredSections.reduce((sum, section) => sum + section.questions.length, 0);

  return <PageShell>
    <section className="faq-hero">
      <div className="container faq-hero__content">
        <span className="faq-hero__icon"><CircleHelp /></span>
        <div><span className="eyebrow">Centre d’aide CampusHub</span><h1>Une réponse claire à chaque étape.</h1><p>Comptes, affiliation, formulaires, publications, paiements et réseau : retrouvez ici le fonctionnement essentiel de la plateforme.</p><nav className="faq-intro-actions"><a href="#decouvrir"><Compass />Comment fonctionne CampusHub ?</a><a href="#decouvrir"><Lightbulb />Pourquoi CampusHub ?</a></nav></div>
        <label className="faq-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une question, une fonctionnalité…" /><span>{total} réponse{total > 1 ? 's' : ''}</span></label>
      </div>
    </section>

    <section className="section faq-section">
      <div className="container faq-layout">
        <aside className="faq-categories">
          <strong>Parcourir l’aide</strong>
          {sections.map((section) => <a href={`#${section.id}`} key={section.id}><section.icon /><span>{section.title}</span></a>)}
        </aside>
        <div className="faq-content">
          {filteredSections.length ? filteredSections.map((section) => <section className="faq-group" id={section.id} key={section.id}>
            <header><span><section.icon /></span><div><h2>{section.title}</h2><p>{section.description}</p></div></header>
            <div className="faq-questions">{section.questions.map((item, index) => <details key={item.question} open={Boolean(query) && index === 0}><summary><span>{item.question}</span><ChevronDown /></summary><p>{item.answer}</p></details>)}</div>
          </section>) : <div className="faq-empty"><Search /><h2>Aucune réponse trouvée</h2><p>Essayez un autre mot ou transmettez directement votre question à l’administration.</p></div>}
          <section className="faq-contact">
            <span><MessageCircleQuestion /></span><div><small>Une question reste sans réponse ?</small><h2>L’administration CampusHub peut vous aider.</h2><p>Décrivez votre situation et ajoutez les références utiles pour recevoir une réponse précise.</p></div><Link className="button" to="/contact">Poser ma question</Link>
          </section>
        </div>
      </div>
    </section>
  </PageShell>;
}
