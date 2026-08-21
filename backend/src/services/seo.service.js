import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { baseDeDonnees } from '../config/base-de-donnees.js';
import { environnement } from '../config/environnement.js';

const pagesPubliques = new Map([
  ['/', {
    titre: 'CampusHub — Orientation, établissements et réseau académique',
    description: 'Découvrez des universités, instituts et écoles, comparez les formations et préparez votre orientation avec CampusHub en RDC.',
  }],
  ['/universites', {
    titre: 'Universités, instituts et écoles en RDC | CampusHub',
    description: 'Recherchez et comparez les établissements présents sur CampusHub : filières, campus, frais, admissions, partenaires et localisation.',
  }],
  ['/offres', {
    titre: 'Offres, stages, bourses et admissions | CampusHub',
    description: 'Consultez les offres académiques, stages, bourses, concours et admissions publiés par les établissements et partenaires CampusHub.',
  }],
  ['/orientation-finaliste', {
    titre: 'Orientation universitaire pour finalistes | CampusHubIA',
    description: 'Trouvez des parcours universitaires adaptés à votre option, votre pourcentage, votre budget et votre localisation avec CampusHubIA.',
  }],
  ['/faq', {
    titre: 'Aide et questions fréquentes | CampusHub',
    description: 'Comprenez le fonctionnement de CampusHub, les demandes d’affiliation, les inscriptions, les établissements et CampusHubIA.',
  }],
  ['/contact', {
    titre: 'Contacter CampusHub',
    description: 'Contactez l’administration CampusHub pour une question, un accompagnement ou une demande concernant la plateforme.',
  }],
]);

function sansSlashFinal(url) {
  return String(url).replace(/\/+$/, '');
}

function echapperXml(valeur = '') {
  return String(valeur).replace(/[<>&"']/g, (caractere) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[caractere]);
}

function echapperAttribut(valeur = '') {
  return String(valeur).replace(/[&<>"']/g, (caractere) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[caractere]);
}

function limiter(texte = '', longueur = 158) {
  const propre = String(texte).replace(/\s+/g, ' ').trim();
  if (propre.length <= longueur) return propre;
  return `${propre.slice(0, longueur - 1).replace(/\s+\S*$/, '')}…`;
}

function jsonLdSecurise(donnees) {
  return JSON.stringify(donnees).replace(/</g, '\\u003c');
}

function injecterSeo(html, seo) {
  const titre = echapperAttribut(seo.titre);
  const description = echapperAttribut(seo.description);
  const canonical = echapperAttribut(seo.canonical);
  const image = echapperAttribut(seo.image || `${sansSlashFinal(environnement.PUBLIC_SITE_URL)}/favicon.svg`);
  const balises = [
    `<link rel="canonical" href="${canonical}" data-campus-seo="canonical">`,
    `<meta property="og:type" content="${seo.type || 'website'}" data-campus-seo="og:type">`,
    `<meta property="og:site_name" content="CampusHub" data-campus-seo="og:site_name">`,
    `<meta property="og:locale" content="fr_CD" data-campus-seo="og:locale">`,
    `<meta property="og:title" content="${titre}" data-campus-seo="og:title">`,
    `<meta property="og:description" content="${description}" data-campus-seo="og:description">`,
    `<meta property="og:url" content="${canonical}" data-campus-seo="og:url">`,
    `<meta property="og:image" content="${image}" data-campus-seo="og:image">`,
    '<meta name="twitter:card" content="summary_large_image" data-campus-seo="twitter:card">',
    `<meta name="twitter:title" content="${titre}" data-campus-seo="twitter:title">`,
    `<meta name="twitter:description" content="${description}" data-campus-seo="twitter:description">`,
    `<script type="application/ld+json" data-campus-seo="structured">${jsonLdSecurise(seo.structuredData)}</script>`,
  ].join('\n    ');
  return html
    .replace(/<title>[^<]*<\/title>/i, `<title>${titre}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/>/i, `<meta name="description" content="${description}" />`)
    .replace('</head>', `    ${balises}\n  </head>`);
}

async function seoEtablissement(code) {
  const [etablissements] = await baseDeDonnees.execute(
    `SELECT id, code_universite, nom, sigle, description, categorie_etablissement,
      adresse, ville, province, pays, url_logo, url_couverture, site_web,
      date_modification, inscriptions_ouvertes
     FROM universites
     WHERE code_universite = ? AND statut_verification = 'VERIFIEE'
     LIMIT 1`,
    [code.toUpperCase()],
  );
  const etablissement = etablissements[0];
  if (!etablissement) return null;
  const [filieres] = await baseDeDonnees.execute(
    `SELECT nom, domaine, niveau_diplome
     FROM filieres WHERE universite_id = ? AND est_active = 1 ORDER BY nom LIMIT 30`,
    [etablissement.id],
  );
  const base = sansSlashFinal(environnement.PUBLIC_SITE_URL);
  const canonical = `${base}/universites/${encodeURIComponent(etablissement.code_universite)}`;
  const localisation = [etablissement.ville, etablissement.province, etablissement.pays].filter(Boolean).join(', ');
  const categorie = etablissement.categorie_etablissement === 'ECOLE_SECONDAIRE' ? 'École secondaire' : 'Établissement supérieur';
  const description = limiter(etablissement.description
    || `${etablissement.nom} est un ${categorie.toLowerCase()} situé à ${localisation}. Découvrez ses formations, campus et admissions sur CampusHub.`);
  const typeSchema = etablissement.categorie_etablissement === 'ECOLE_SECONDAIRE' ? 'School' : 'CollegeOrUniversity';
  return {
    titre: `${etablissement.nom}${etablissement.sigle ? ` (${etablissement.sigle})` : ''} | CampusHub`,
    description,
    canonical,
    image: etablissement.url_couverture || etablissement.url_logo || `${base}/favicon.svg`,
    type: 'profile',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': typeSchema,
      name: etablissement.nom,
      alternateName: etablissement.sigle || undefined,
      description,
      url: canonical,
      logo: etablissement.url_logo || undefined,
      image: etablissement.url_couverture || etablissement.url_logo || undefined,
      sameAs: etablissement.site_web ? [etablissement.site_web] : undefined,
      address: {
        '@type': 'PostalAddress',
        streetAddress: etablissement.adresse || undefined,
        addressLocality: etablissement.ville,
        addressRegion: etablissement.province,
        addressCountry: etablissement.pays,
      },
      hasOfferCatalog: filieres.length ? {
        '@type': 'OfferCatalog',
        name: `Formations de ${etablissement.nom}`,
        itemListElement: filieres.map((filiere) => ({
          '@type': 'Course',
          name: filiere.nom,
          description: [filiere.domaine, filiere.niveau_diplome].filter(Boolean).join(' — '),
          provider: { '@type': typeSchema, name: etablissement.nom, url: canonical },
        })),
      } : undefined,
    },
  };
}

function seoPageStatique(chemin) {
  const page = pagesPubliques.get(chemin);
  if (!page) return null;
  const base = sansSlashFinal(environnement.PUBLIC_SITE_URL);
  return {
    ...page,
    canonical: `${base}${chemin === '/' ? '' : chemin}`,
    structuredData: chemin === '/' ? {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'CampusHub',
      url: base,
      description: page.description,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${base}/universites?recherche={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    } : {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.titre,
      description: page.description,
      url: `${base}${chemin}`,
      isPartOf: { '@type': 'WebSite', name: 'CampusHub', url: base },
    },
  };
}

export async function servirPageSeo(requete, reponse, suivant, dossierFrontend) {
  if (requete.method !== 'GET' || !requete.accepts('html')) return suivant();
  let seo = seoPageStatique(requete.path);
  const correspondance = requete.path.match(/^\/universites\/([A-Za-z0-9_-]+)$/);
  if (correspondance) seo = await seoEtablissement(correspondance[1]);
  if (!seo) return suivant();
  try {
    const html = await readFile(path.join(dossierFrontend, 'index.html'), 'utf8');
    reponse.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    return reponse.type('html').send(injecterSeo(html, seo));
  } catch {
    return suivant();
  }
}

export async function sitemapXml() {
  const [etablissements] = await baseDeDonnees.execute(
    `SELECT code_universite, date_modification, url_couverture, url_logo
     FROM universites WHERE statut_verification = 'VERIFIEE'
     ORDER BY date_modification DESC`,
  );
  const base = sansSlashFinal(environnement.PUBLIC_SITE_URL);
  const maintenant = new Date().toISOString().slice(0, 10);
  const statiques = ['/', '/universites', '/offres', '/orientation-finaliste', '/faq', '/contact'];
  const entrees = statiques.map((chemin) => ({
    loc: `${base}${chemin === '/' ? '' : chemin}`,
    lastmod: maintenant,
    priority: chemin === '/' ? '1.0' : '0.8',
    changefreq: chemin === '/offres' ? 'daily' : 'weekly',
  }));
  etablissements.forEach((item) => entrees.push({
    loc: `${base}/universites/${encodeURIComponent(item.code_universite)}`,
    lastmod: new Date(item.date_modification).toISOString().slice(0, 10),
    priority: '0.9',
    changefreq: 'weekly',
    image: item.url_couverture || item.url_logo,
  }));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entrees.map((item) => `  <url><loc>${echapperXml(item.loc)}</loc><lastmod>${item.lastmod}</lastmod><changefreq>${item.changefreq}</changefreq><priority>${item.priority}</priority>${item.image ? `<image:image><image:loc>${echapperXml(item.image)}</image:loc></image:image>` : ''}</url>`).join('\n')}\n</urlset>`;
}

export function robotsTxt() {
  const base = sansSlashFinal(environnement.PUBLIC_SITE_URL);
  return `User-agent: *\nAllow: /\nDisallow: /administration/\nDisallow: /espace-universite/\nDisallow: /espace-etudiant/\nDisallow: /connexion\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n`;
}
