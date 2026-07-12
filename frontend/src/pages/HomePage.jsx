import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  GraduationCap,
  Lightbulb,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { PageShell } from '../components/PageShell.jsx';
import { Reveal } from '../components/Reveal.jsx';
import { Spinner } from '../components/Spinner.jsx';
import { UniversityCard } from '../components/UniversityCard.jsx';

const projectImages = {
  main: '/images/projet-agritech.webp',
  solar: '/images/campus-technologie.webp',
};

export function HomePage() {
  const [universites, setUniversites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [ville, setVille] = useState('');
  const [type, setType] = useState('');
  const [apiMessage, setApiMessage] = useState('');

  useEffect(() => {
    apiRequest('/universites')
      .then((response) => {
        const verified = (response.donnees || []).filter((item) => item.statut_verification === 'VERIFIEE');
        setUniversites(verified);
      })
      .catch(() => setApiMessage('Les universités seront disponibles dès le rétablissement du serveur.'))
      .finally(() => setLoading(false));
  }, []);

  const resultats = useMemo(() => universites.filter((item) => {
    const texte = `${item.nom} ${item.sigle || ''}`.toLowerCase();
    return (!query || texte.includes(query.toLowerCase()))
      && (!ville || item.ville === ville)
      && (!type || item.type_universite === type);
  }), [universites, query, ville, type]);

  const villes = [...new Set(universites.map((item) => item.ville).filter(Boolean))];

  return (
    <PageShell>
      <section className="hero" id="recherche">
        <div className="hero-backdrop" />
        <div className="hero-orb hero-orb--one" />
        <div className="hero-orb hero-orb--two" />
        <div className="container hero-content">
          <div className="hero-copy">
            <span className="pill pill--light"><Sparkles size={15} /> L’éducation pour tous</span>
            <h1>Trouvez l’université qui donnera vie à votre <em>avenir.</em></h1>
            <p>Explorez des établissements congolais vérifiés, comparez leurs filières et découvrez les projets de leurs étudiants.</p>
          </div>

          <div className="search-panel">
            <label className="search-field">
              <Search size={20} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom ou sigle de l’université" />
            </label>
            <label>
              <span>Ville</span>
              <select value={ville} onChange={(event) => setVille(event.target.value)}>
                <option value="">Toutes les villes</option>
                {villes.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Type</span>
              <select value={type} onChange={(event) => setType(event.target.value)}>
                <option value="">Public et privé</option>
                <option value="PUBLIQUE">Publique</option>
                <option value="PRIVEE">Privée</option>
              </select>
            </label>
            <a className="button search-submit" href="#universites">Explorer <ArrowRight size={18} /></a>
          </div>

          <div className="hero-proof">
            <span><ShieldCheck /> Institutions vérifiées</span>
            <span><Users /> Talents étudiants</span>
            <span><BookOpenCheck /> Filières détaillées</span>
          </div>
        </div>
      </section>

      <section className="section" id="universites">
        <div className="container">
          <Reveal className="section-heading">
            <div>
              <span className="eyebrow eyebrow--accent">Orientation de confiance</span>
              <h2>Universités vérifiées <BadgeCheck className="heading-icon" /></h2>
              <p>Seuls les établissements examinés par l’administration CampusHub sont affichés ici.</p>
            </div>
            <span className="result-count">{resultats.length} établissement{resultats.length > 1 ? 's' : ''}</span>
          </Reveal>

          {loading ? (
            <div className="loading-state"><Spinner /> Chargement des universités…</div>
          ) : resultats.length ? (
            <div className="university-grid">
              {resultats.slice(0, 3).map((university, index) => (
                <Reveal key={university.code_universite} delay={index * 90}>
                  <UniversityCard university={university} index={index} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Building2 size={30} />
              <h3>Aucune université ne correspond à cette recherche</h3>
              <p>{apiMessage || 'Modifiez les filtres ou revenez prochainement.'}</p>
            </div>
          )}
        </div>
      </section>

      <section className="section section--soft" id="projets">
        <div className="container">
          <Reveal className="section-heading">
            <div>
              <span className="eyebrow eyebrow--accent">Talents en mouvement</span>
              <h2>Projets étudiants à découvrir</h2>
              <p>Des idées conçues sur nos campus pour répondre aux défis de la région.</p>
            </div>
            <Link className="text-link" to="/portfolios">Voir tous les portfolios <ArrowRight size={17} /></Link>
          </Reveal>

          <div className="projects-grid">
            <Reveal className="project-card project-card--main">
              <img src={projectImages.main} alt="Étudiants travaillant sur un projet numérique" />
              <div className="project-overlay">
                <span className="pill"><Lightbulb size={14} /> Innovation locale</span>
                <h3>AgriTech Goma : prévoir les récoltes avec l’IA</h3>
                <p>Une solution étudiante qui aide les agriculteurs du Nord-Kivu à prendre de meilleures décisions.</p>
                <span className="project-author">JD — Jean-Pierre & équipe</span>
              </div>
            </Reveal>
            <Reveal className="project-card project-card--wide" delay={100}>
              <img src={projectImages.solar} alt="Panneaux solaires sur un campus" />
              <div className="project-overlay">
                <span className="pill pill--teal">Énergie</span>
                <h3>Cartographie du potentiel solaire</h3>
                <p>Recherche appliquée pour des campus plus autonomes.</p>
              </div>
            </Reveal>
            <Reveal className="project-mini" delay={180}>
              <div className="project-mini__icon"><GraduationCap /></div>
              <span className="eyebrow">Droit & société</span>
              <h3>Lex Congo numérique</h3>
              <p>Le droit congolais expliqué et rendu accessible aux étudiants.</p>
              <button className="text-link">Lire le portfolio <ArrowRight size={16} /></button>
            </Reveal>
            <Reveal className="project-mini" delay={240}>
              <div className="project-mini__icon project-mini__icon--teal"><MapPin /></div>
              <span className="eyebrow">Santé connectée</span>
              <h3>Mama Health</h3>
              <p>Un suivi mobile simple pour accompagner les futures mères.</p>
              <button className="text-link">Lire le portfolio <ArrowRight size={16} /></button>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section">
        <Reveal className="container cta-card">
          <div>
            <span className="pill pill--light">Rejoignez l’écosystème</span>
            <h2>Votre établissement mérite d’être découvert.</h2>
            <p>Envoyez votre demande. Notre équipe vérifie votre identité avant toute publication.</p>
          </div>
          <div className="cta-actions">
            <Link className="button button--light" to="/inscription-etudiant"><GraduationCap size={18} /> S’inscrire comme étudiant</Link>
            <Link className="button button--teal" to="/partenariat"><Building2 size={18} /> Demande de partenariat</Link>
          </div>
        </Reveal>
      </section>
    </PageShell>
  );
}
