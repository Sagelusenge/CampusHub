import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiRequest } from '../api/client.js';

const pages = {
  '/': ['CampusHub — Orientation, établissements et réseau académique', 'Découvrez des universités, instituts et écoles, comparez les formations et préparez votre orientation avec CampusHub en RDC.'],
  '/universites': ['Universités, instituts et écoles en RDC | CampusHub', 'Recherchez les établissements présents sur CampusHub : filières, campus, frais, admissions, partenaires et localisation.'],
  '/offres': ['Offres, stages, bourses et admissions | CampusHub', 'Consultez les offres académiques, stages, bourses, concours et admissions publiés sur CampusHub.'],
  '/orientation-finaliste': ['Orientation universitaire pour finalistes | CampusHubIA', 'Trouvez des parcours adaptés à votre option, votre pourcentage, votre budget et votre localisation avec CampusHubIA.'],
  '/faq': ['Aide et questions fréquentes | CampusHub', 'Découvrez comment utiliser CampusHub, envoyer une demande, vous inscrire et trouver un établissement.'],
  '/contact': ['Contacter CampusHub', 'Contactez l’administration CampusHub pour obtenir de l’aide ou présenter une demande.'],
};

function meta(selecteur, attribut, valeur) {
  let balise = document.head.querySelector(selecteur);
  if (!balise) {
    balise = document.createElement('meta');
    const [nom, contenu] = selecteur.match(/meta\[([^=]+)="([^"]+)"\]/)?.slice(1) || [];
    if (nom) balise.setAttribute(nom, contenu);
    balise.dataset.campusSeoClient = 'true';
    document.head.appendChild(balise);
  }
  balise.setAttribute(attribut, valeur);
}

function canonical(url) {
  let balise = document.head.querySelector('link[rel="canonical"]');
  if (!balise) {
    balise = document.createElement('link');
    balise.rel = 'canonical';
    balise.dataset.campusSeoClient = 'true';
    document.head.appendChild(balise);
  }
  balise.href = url;
}

function appliquer({ titre, description, url, image, structuredData }) {
  document.title = titre;
  meta('meta[name="description"]', 'content', description);
  meta('meta[property="og:title"]', 'content', titre);
  meta('meta[property="og:description"]', 'content', description);
  meta('meta[property="og:url"]', 'content', url);
  meta('meta[property="og:type"]', 'content', 'website');
  meta('meta[property="og:site_name"]', 'content', 'CampusHub');
  meta('meta[name="twitter:card"]', 'content', image ? 'summary_large_image' : 'summary');
  meta('meta[name="twitter:title"]', 'content', titre);
  meta('meta[name="twitter:description"]', 'content', description);
  if (image) meta('meta[property="og:image"]', 'content', image);
  canonical(url);
  document.querySelectorAll('script[data-campus-seo-client]').forEach((element) => element.remove());
  if (structuredData) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.campusSeoClient = 'true';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }
}

export function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    let actif = true;
    const origin = window.location.origin;
    const chemin = pathname.replace(/\/+$/, '') || '/';
    const page = pages[chemin] || ['CampusHub — Écosystème éducatif numérique', 'Orientez votre parcours, découvrez des établissements et rejoignez la communauté CampusHub.'];
    appliquer({ titre: page[0], description: page[1], url: `${origin}${chemin === '/' ? '' : chemin}` });

    const correspondance = chemin.match(/^\/universites\/([A-Za-z0-9_-]+)$/);
    if (correspondance) apiRequest(`/universites/${correspondance[1]}`).then((reponse) => {
      if (!actif) return;
      const etablissement = reponse.donnees;
      const lieu = [etablissement.ville, etablissement.province].filter(Boolean).join(', ');
      const description = String(etablissement.description || `${etablissement.nom} est un établissement situé à ${lieu}. Découvrez ses formations, campus et admissions sur CampusHub.`).replace(/\s+/g, ' ').slice(0, 158);
      const url = `${origin}/universites/${etablissement.code_universite}`;
      appliquer({
        titre: `${etablissement.nom}${etablissement.sigle ? ` (${etablissement.sigle})` : ''} | CampusHub`,
        description,
        url,
        image: etablissement.url_couverture || etablissement.url_logo,
        structuredData: {
          '@context': 'https://schema.org',
          '@type': etablissement.categorie_etablissement === 'ECOLE_SECONDAIRE' ? 'School' : 'CollegeOrUniversity',
          name: etablissement.nom,
          alternateName: etablissement.sigle || undefined,
          description,
          url,
          image: etablissement.url_couverture || etablissement.url_logo || undefined,
          address: {
            '@type': 'PostalAddress',
            streetAddress: etablissement.adresse || undefined,
            addressLocality: etablissement.ville,
            addressRegion: etablissement.province,
            addressCountry: etablissement.pays,
          },
        },
      });
    }).catch(() => null);

    return () => { actif = false; };
  }, [pathname]);

  return null;
}
