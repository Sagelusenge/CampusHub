import { environnement } from '../config/environnement.js';

const API_WIKIPEDIA = 'https://fr.wikipedia.org/w/api.php';
const motsVidesRecherche = new Set([
  'alors', 'avec', 'aux', 'cette', 'ces', 'comment', 'dans', 'de', 'des', 'donne',
  'du', 'elle', 'en', 'est', 'et', 'explique', 'faire', 'il', 'je', 'la', 'le', 'les',
  'mais', 'moi', 'mon', 'ne', 'nous', 'on', 'ou', 'par', 'pas', 'pour', 'pourquoi',
  'que', 'quel', 'quelle', 'quels', 'quelles', 'qui', 'quoi', 'se', 'son', 'sur', 'tu',
  'un', 'une', 'vers', 'votre', 'vous',
]);

function nettoyer(texte = '') {
  return String(texte).replace(/\s+/g, ' ').trim();
}

function normaliser(texte = '') {
  return nettoyer(texte).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function preparerRecherche(question) {
  const avecAlias = normaliser(question)
    .replace(/republique democratique (?:du |de |d')?congo/g, ' rdc ')
    .replace(/democratic republic of (?:the )?congo/g, ' rdc ');
  const termes = avecAlias.split(/[^a-z0-9]+/)
    .filter((mot) => mot.length >= 2 && !motsVidesRecherche.has(mot))
    .slice(0, 9);
  return termes.join(' ');
}

function pertinence(page, termes) {
  const titre = normaliser(page.title);
  const contenu = normaliser(page.extract);
  const bonusReponse = termes.includes('capitale') && /\best la capitale\b/.test(contenu) ? 8 : 0;
  return bonusReponse + termes.reduce((score, terme) => score + (titre.includes(terme) ? 4 : 0) + (contenu.includes(terme) ? 1 : 0), 0);
}

function limiter(texte, longueur = 900) {
  const propre = nettoyer(texte);
  return propre.length <= longueur ? propre : `${propre.slice(0, longueur).replace(/\s+\S*$/, '')}…`;
}

export async function rechercherConnaissancesWeb(question) {
  if (!environnement.CAMPUSHUB_WEB_ENABLED || nettoyer(question).length < 3) {
    return { documents: [], sources: [] };
  }

  const controleur = new AbortController();
  const minuterie = setTimeout(() => controleur.abort(), environnement.CAMPUSHUB_WEB_TIMEOUT_MS);
  try {
    const recherche = preparerRecherche(question);
    if (!recherche) return { documents: [], sources: [] };
    const url = new URL(API_WIKIPEDIA);
    url.search = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      generator: 'search',
      gsrsearch: recherche,
      gsrlimit: String(Math.min(8, environnement.CAMPUSHUB_WEB_MAX_SOURCES * 3)),
      prop: 'extracts',
      exintro: '1',
      explaintext: '1',
      exsentences: '3',
      redirects: '1',
    });
    const reponse = await fetch(url, {
      signal: controleur.signal,
      headers: { 'User-Agent': 'CampusHubIA/1.0 (assistant académique; contact@campushub.cd)' },
    });
    if (!reponse.ok) return { documents: [], sources: [] };
    const donnees = await reponse.json();
    const termes = recherche.split(' ');
    const pages = (donnees?.query?.pages || [])
      .filter((page) => page.pageid && nettoyer(page.extract).length >= 80)
      .sort((a, b) => pertinence(b, termes) - pertinence(a, termes) || (a.index ?? 99) - (b.index ?? 99))
      .slice(0, environnement.CAMPUSHUB_WEB_MAX_SOURCES);

    return {
      documents: pages.map((page) => `Selon l’article Wikipédia « ${page.title} », ${limiter(page.extract)}`),
      sources: pages.map((page) => ({
        code: `WIKI-${page.pageid}`,
        label: `Wikipédia — ${page.title}`,
        url: `https://fr.wikipedia.org/?curid=${page.pageid}`,
        externe: true,
      })),
    };
  } catch {
    return { documents: [], sources: [] };
  } finally {
    clearTimeout(minuterie);
  }
}
