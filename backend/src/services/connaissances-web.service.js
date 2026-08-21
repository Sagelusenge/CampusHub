import { environnement } from '../config/environnement.js';

const API_WIKIPEDIA = 'https://fr.wikipedia.org/w/api.php';
const API_DUCKDUCKGO = 'https://api.duckduckgo.com/';
const API_BRAVE = 'https://api.search.brave.com/res/v1/web/search';
const domainesInterdits = [
  'facebook.com', 'instagram.com', 'tiktok.com', 'x.com', 'twitter.com',
  'pinterest.com', 'quora.com', 'reddit.com',
];
const domainesPrioritaires = [
  '.ac.cd', '.edu', '.edu.', '.gov', '.gouv.', 'unesco.org', 'who.int',
  'worldbank.org', 'un.org', 'campushub.cd',
];
const motsVidesRecherche = new Set([
  'alors', 'avec', 'aux', 'cette', 'ces', 'comment', 'dans', 'de', 'des', 'donne',
  'du', 'elle', 'en', 'est', 'et', 'explique', 'faire', 'il', 'je', 'la', 'le', 'les',
  'mais', 'moi', 'mon', 'ne', 'nous', 'on', 'ou', 'par', 'pas', 'pour', 'pourquoi',
  'que', 'quel', 'quelle', 'quels', 'quelles', 'qui', 'quoi', 'se', 'son', 'sur', 'tu',
  'un', 'une', 'vers', 'votre', 'vous',
]);

function nettoyer(texte = '') {
  return String(texte).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normaliser(texte = '') {
  return nettoyer(texte).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function limiter(texte, longueur = 900) {
  const propre = nettoyer(texte);
  return propre.length <= longueur ? propre : `${propre.slice(0, longueur).replace(/\s+\S*$/, '')}…`;
}

function preparerRecherche(question) {
  const avecAlias = normaliser(question)
    .replace(/republique democratique (?:du |de |d')?congo/g, ' rdc ')
    .replace(/democratic republic of (?:the )?congo/g, ' rdc ');
  const termes = avecAlias.split(/[^a-z0-9]+/)
    .filter((mot) => mot.length >= 2 && !motsVidesRecherche.has(mot))
    .slice(0, 12);
  return termes.join(' ');
}

function urlSure(valeur) {
  try {
    const url = new URL(valeur);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const hote = url.hostname.toLowerCase().replace(/^www\./, '');
    if (domainesInterdits.some((domaine) => hote === domaine || hote.endsWith(`.${domaine}`))) return null;
    return url.href;
  } catch {
    return null;
  }
}

function prioriteSource(url) {
  try {
    const hote = new URL(url).hostname.toLowerCase();
    return domainesPrioritaires.some((domaine) => hote.includes(domaine)) ? 10 : 0;
  } catch {
    return 0;
  }
}

async function lireJson(url, options = {}) {
  const controleur = new AbortController();
  const minuterie = setTimeout(() => controleur.abort(), environnement.CAMPUSHUB_WEB_TIMEOUT_MS);
  try {
    const reponse = await fetch(url, {
      ...options,
      signal: controleur.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CampusHubIA/2.0 (assistant académique; contact@campushub.cd)',
        ...(options.headers || {}),
      },
    });
    if (!reponse.ok) return null;
    return await reponse.json();
  } catch {
    return null;
  } finally {
    clearTimeout(minuterie);
  }
}

async function rechercherBrave(recherche) {
  if (!environnement.BRAVE_SEARCH_API_KEY) return [];
  const url = new URL(API_BRAVE);
  url.search = new URLSearchParams({
    q: recherche,
    count: String(Math.min(10, environnement.CAMPUSHUB_WEB_MAX_SOURCES * 2)),
    safesearch: 'strict',
    spellcheck: 'true',
    text_decorations: 'false',
    search_lang: 'fr',
  });
  const donnees = await lireJson(url, {
    headers: { 'X-Subscription-Token': environnement.BRAVE_SEARCH_API_KEY },
  });
  return (donnees?.web?.results || []).map((resultat, index) => ({
    titre: nettoyer(resultat.title),
    extrait: limiter(resultat.description),
    url: urlSure(resultat.url),
    fournisseur: 'Recherche web',
    score: 20 - index + prioriteSource(resultat.url),
  })).filter((item) => item.url && item.titre && item.extrait.length >= 30);
}

function aplatirSujets(sujets = []) {
  return sujets.flatMap((sujet) => sujet.Topics ? aplatirSujets(sujet.Topics) : [sujet]);
}

async function rechercherDuckDuckGo(recherche) {
  const url = new URL(API_DUCKDUCKGO);
  url.search = new URLSearchParams({ q: recherche, format: 'json', no_html: '1', no_redirect: '1', skip_disambig: '1' });
  const donnees = await lireJson(url);
  if (!donnees) return [];
  const resultats = [];
  if (nettoyer(donnees.AbstractText).length >= 50 && urlSure(donnees.AbstractURL)) {
    resultats.push({
      titre: nettoyer(donnees.Heading || recherche),
      extrait: limiter(donnees.AbstractText),
      url: urlSure(donnees.AbstractURL),
      fournisseur: nettoyer(donnees.AbstractSource || 'Source web'),
      score: 18 + prioriteSource(donnees.AbstractURL),
    });
  }
  aplatirSujets(donnees.RelatedTopics).slice(0, 5).forEach((sujet, index) => {
    const sourceUrl = urlSure(sujet.FirstURL);
    const extrait = limiter(sujet.Text);
    if (sourceUrl && extrait.length >= 50) resultats.push({
      titre: extrait.split(' - ')[0] || recherche,
      extrait,
      url: sourceUrl,
      fournisseur: 'DuckDuckGo',
      score: 12 - index + prioriteSource(sourceUrl),
    });
  });
  return resultats;
}

function pertinenceWikipedia(page, termes) {
  const titre = normaliser(page.title);
  const contenu = normaliser(page.extract);
  const bonusReponse = termes.includes('capitale') && /\best la capitale\b/.test(contenu) ? 8 : 0;
  return bonusReponse + termes.reduce((score, terme) => score + (titre.includes(terme) ? 4 : 0) + (contenu.includes(terme) ? 1 : 0), 0);
}

async function rechercherWikipedia(recherche) {
  const url = new URL(API_WIKIPEDIA);
  url.search = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', generator: 'search',
    gsrsearch: recherche, gsrlimit: String(Math.min(8, environnement.CAMPUSHUB_WEB_MAX_SOURCES * 2)),
    prop: 'extracts', exintro: '1', explaintext: '1', exsentences: '4', redirects: '1',
  });
  const donnees = await lireJson(url);
  const termes = recherche.split(' ');
  return (donnees?.query?.pages || [])
    .filter((page) => page.pageid && nettoyer(page.extract).length >= 80)
    .map((page) => ({
      titre: nettoyer(page.title),
      extrait: limiter(page.extract),
      url: `https://fr.wikipedia.org/?curid=${page.pageid}`,
      fournisseur: 'Wikipédia',
      score: pertinenceWikipedia(page, termes),
    }));
}

export async function rechercherConnaissancesWeb(question) {
  if (!environnement.CAMPUSHUB_WEB_ENABLED || nettoyer(question).length < 3) {
    return { documents: [], sources: [] };
  }
  const recherche = preparerRecherche(question);
  if (!recherche) return { documents: [], sources: [] };

  const resultats = await Promise.allSettled([
    rechercherBrave(recherche),
    rechercherDuckDuckGo(recherche),
    rechercherWikipedia(recherche),
  ]);
  const uniques = new Map();
  resultats.flatMap((resultat) => resultat.status === 'fulfilled' ? resultat.value : [])
    .sort((a, b) => b.score - a.score)
    .forEach((item) => {
      const cle = item.url.split('#')[0];
      if (!uniques.has(cle)) uniques.set(cle, item);
    });
  const selection = [...uniques.values()].slice(0, environnement.CAMPUSHUB_WEB_MAX_SOURCES);
  const dateConsultation = new Intl.DateTimeFormat('fr-CA', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date());

  return {
    documents: selection.map((item) => `${item.fournisseur} — « ${item.titre} » : ${item.extrait}`),
    sources: selection.map((item, index) => ({
      code: `WEB-${index + 1}`,
      label: `${item.fournisseur} — ${item.titre}`,
      url: item.url,
      externe: true,
      consulteLe: dateConsultation,
    })),
  };
}
