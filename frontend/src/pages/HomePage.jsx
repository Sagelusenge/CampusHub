import { ArrowRight, BadgeCheck, Bot, BrainCircuit, Building2, CheckCircle2, GraduationCap, Network, SearchCheck, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/PageShell.jsx';
import { Reveal } from '../components/Reveal.jsx';

const objectifs = [
  { icon: SearchCheck, titre: 'Mieux orienter', texte: 'Comparer des universités vérifiées, leurs filières, leurs campus et leurs conditions d’admission.' },
  { icon: ShieldCheck, titre: 'Créer la confiance', texte: 'Chaque université et chaque affiliation étudiante passent par une validation claire.' },
  { icon: Network, titre: 'Relier les talents', texte: 'Un réseau académique pour découvrir des projets, échanger et suivre les établissements.' },
];

export function HomePage() {
  return <PageShell>
    <section className="mission-hero">
      <div className="mission-hero__image" />
      <div className="container mission-hero__content">
        <span className="pill pill--light"><Sparkles /> L’écosystème universitaire connecté</span>
        <h1>Orienter, vérifier et connecter la communauté universitaire.</h1>
        <p>CampusHub rapproche étudiants, visiteurs et universités autour d’informations fiables et d’un réseau académique vivant.</p>
        <div className="mission-hero__actions">
          <Link className="button button--teal button--large" to="/universites">Découvrir les universités <ArrowRight /></Link>
          <Link className="button button--light button--large" to="/inscription-visiteur">Rejoindre la communauté</Link>
        </div>
        <div className="mission-hero__proof"><span><BadgeCheck /> Établissements vérifiés</span><span><Users /> Quatre parcours adaptés</span><span><ShieldCheck /> Communauté modérée</span></div>
      </div>
    </section>

    <section className="section mission-section">
      <div className="container">
        <Reveal className="section-heading"><div><span className="eyebrow eyebrow--accent">Notre raison d’être</span><h2>Une passerelle fiable vers l’enseignement supérieur.</h2><p>L’accueil présente la mission de CampusHub. Le catalogue, le réseau et les espaces de gestion restent clairement séparés.</p></div></Reveal>
        <div className="mission-objectives">{objectifs.map(({ icon: Icon, titre, texte }, index) => <Reveal key={titre} delay={index * 80}><article><span><Icon /></span><h3>{titre}</h3><p>{texte}</p></article></Reveal>)}</div>
      </div>
    </section>

    <section className="section ai-home-section">
      <div className="container ai-home-card">
        <Reveal className="ai-home-card__copy">
          <span className="pill pill--light"><Sparkles /> Nouveau • GPT‑5.6</span>
          <h2>Votre projet d’études devient un plan concret.</h2>
          <p>CampusHub AI croise votre objectif, votre budget et votre mobilité avec les formations vérifiées de la plateforme. Il peut aussi lire une photo de bulletin, avec votre confirmation.</p>
          <div className="ai-home-card__proof"><span><CheckCircle2 />Aucune formation inventée</span><span><CheckCircle2 />Recommandations expliquées</span><span><CheckCircle2 />Dossier sauvegardé</span></div>
          <Link className="button button--teal button--large" to="/orientation">Essayer CampusHub AI <ArrowRight /></Link>
        </Reveal>
        <Reveal className="ai-home-card__visual" delay={120}>
          <span className="ai-home-card__brain"><BrainCircuit /></span>
          <div><Bot /><span><small>CampusHub AI</small><strong>3 formations compatibles trouvées</strong></span></div>
          <div><GraduationCap /><span><small>Option recommandée</small><strong>Génie logiciel et intelligence artificielle</strong></span><b>92%</b></div>
          <div><ShieldCheck /><span><small>Source des informations</small><strong>Catalogue CampusHub vérifié</strong></span></div>
        </Reveal>
      </div>
    </section>

    <section className="section section--soft">
      <div className="container actor-section">
        <Reveal className="actor-section__copy"><span className="eyebrow eyebrow--accent">Un parcours pour chacun</span><h2>Quatre acteurs, une seule communauté.</h2><p>Le visiteur rejoint directement le réseau. L’étudiant, l’université et l’administration disposent chacun d’un espace de travail, avec un accès commun aux actualités.</p><Link className="text-link" to="/connexion">J’ai déjà un compte <ArrowRight /></Link></Reveal>
        <div className="actor-grid">
          <Reveal delay={60}><article><Users /><strong>Visiteur</strong><p>Consulte, commente, suit les universités et reçoit un fil personnalisé.</p></article></Reveal>
          <Reveal delay={120}><article><GraduationCap /><strong>Étudiant</strong><p>Gère son profil, son affiliation et participe au réseau.</p></article></Reveal>
          <Reveal delay={180}><article><Building2 /><strong>Université</strong><p>Présente son offre, publie et confirme ses étudiants.</p></article></Reveal>
          <Reveal delay={240}><article><ShieldCheck /><strong>Administration</strong><p>Vérifie, modère et accompagne toute la plateforme.</p></article></Reveal>
        </div>
      </div>
    </section>

    <section className="section"><Reveal className="container cta-card"><div><span className="pill pill--light">CampusHub</span><h2>Commencez par explorer les universités.</h2><p>Consultez les établissements validés ou écrivez directement à notre administration.</p></div><div className="cta-actions"><Link className="button button--light" to="/universites">Voir les universités</Link><Link className="button button--teal" to="/contact">Nous contacter</Link></div></Reveal></section>
  </PageShell>;
}
