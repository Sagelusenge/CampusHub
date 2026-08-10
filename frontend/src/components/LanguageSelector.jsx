import { ChevronDown, Languages } from 'lucide-react';
import { createContext, useContext, useEffect, useState } from 'react';

const LANGUAGE_OPTIONS = Object.freeze([
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
]);
const LANGUAGE_CODES = new Set(LANGUAGE_OPTIONS.map(({ value }) => value));
const LANGUAGE_STORAGE_KEY = 'campushub-language';
const SEPARATOR = '|||CAMPUSHUB_7F3A|||';
const LanguageContext = createContext({ ready: true, language: 'fr', options: LANGUAGE_OPTIONS, changeLanguage: () => {} });

function langueMemorisee() {
  const code = globalThis.localStorage?.getItem(LANGUAGE_STORAGE_KEY) || 'fr';
  return LANGUAGE_CODES.has(code) ? code : 'fr';
}

function texteTraduisible(node) {
  const parent = node.parentElement;
  const texte = node.nodeValue?.trim();
  if (!parent || !texte || texte.length < 2 || !/[A-Za-zÀ-ÿ]/.test(texte)) return false;
  if (parent.closest('.notranslate, .language-selector, script, style, noscript, code, pre, option')) return false;
  if (/^(https?:\/\/|www\.|[^\s@]+@[^\s@]+\.[^\s@]+$)/i.test(texte)) return false;
  return true;
}

function lotsDeTraduction(entrees) {
  const lots = [];
  let lot = [];
  let taille = 0;
  for (const entree of entrees) {
    const cout = encodeURIComponent(entree.texte).length + SEPARATOR.length;
    if (lot.length && (lot.length >= 35 || taille + cout > 2_800)) {
      lots.push(lot);
      lot = [];
      taille = 0;
    }
    lot.push(entree);
    taille += cout;
  }
  if (lot.length) lots.push(lot);
  return lots;
}

async function traduireLot(lot, langue) {
  const requete = lot.map(({ texte }) => texte).join(`\n${SEPARATOR}\n`);
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.search = new URLSearchParams({ client: 'gtx', sl: 'fr', tl: langue, dt: 't', q: requete });
  const reponse = await fetch(url, { referrerPolicy: 'no-referrer' });
  if (!reponse.ok) throw new Error('Service de traduction indisponible.');
  const donnees = await reponse.json();
  const resultat = (donnees?.[0] || []).map((segment) => segment?.[0] || '').join('');
  const traductions = resultat.split(SEPARATOR).map((texte) => texte.trim());
  if (traductions.length !== lot.length) return;
  lot.forEach(({ noeuds, attributs }, index) => {
    const traduction = traductions[index];
    if (!traduction) return;
    noeuds.forEach((node) => {
      const original = node.nodeValue || '';
      const debut = original.match(/^\s*/)?.[0] || '';
      const fin = original.match(/\s*$/)?.[0] || '';
      node.nodeValue = `${debut}${traduction}${fin}`;
    });
    attributs.forEach(({ element, nom }) => element.setAttribute(nom, traduction));
  });
}

function creerTraducteur(langue) {
  const etatNoeuds = new WeakMap();
  const etatAttributs = new WeakMap();
  let enCours = false;
  let relanceDemandee = false;

  async function traduirePage() {
    if (enCours) { relanceDemandee = true; return; }
    enCours = true;
    try {
      const groupes = new Map();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        if (texteTraduisible(node) && etatNoeuds.get(node) !== node.nodeValue) {
          const texte = node.nodeValue.trim();
          if (!groupes.has(texte)) groupes.set(texte, { noeuds: [], attributs: [] });
          groupes.get(texte).noeuds.push(node);
        }
        node = walker.nextNode();
      }
      document.querySelectorAll('[placeholder], [title], [aria-label]').forEach((element) => {
        if (element.closest('.notranslate, .language-selector')) return;
        for (const nom of ['placeholder', 'title', 'aria-label']) {
          const texte = element.getAttribute(nom)?.trim();
          const precedent = etatAttributs.get(element)?.[nom];
          if (!texte || texte.length < 2 || !/[A-Za-zÀ-ÿ]/.test(texte) || precedent === texte) continue;
          if (!groupes.has(texte)) groupes.set(texte, { noeuds: [], attributs: [] });
          groupes.get(texte).attributs.push({ element, nom });
        }
      });
      const entrees = Array.from(groupes, ([texte, cibles]) => ({ texte, ...cibles }));
      for (const lot of lotsDeTraduction(entrees)) {
        await traduireLot(lot, langue);
        lot.forEach(({ noeuds, attributs }) => {
          noeuds.forEach((noeud) => etatNoeuds.set(noeud, noeud.nodeValue));
          attributs.forEach(({ element, nom }) => {
            const etat = etatAttributs.get(element) || {};
            etat[nom] = element.getAttribute(nom);
            etatAttributs.set(element, etat);
          });
        });
      }
    } catch {
      // Le site reste utilisable en français si le service externe est momentanément indisponible.
    } finally {
      enCours = false;
      if (relanceDemandee) {
        relanceDemandee = false;
        globalThis.setTimeout(traduirePage, 80);
      }
    }
  }

  let minuterie;
  const observer = new MutationObserver(() => {
    globalThis.clearTimeout(minuterie);
    minuterie = globalThis.setTimeout(traduirePage, 120);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['placeholder', 'title', 'aria-label'],
  });
  traduirePage();
  return () => { observer.disconnect(); globalThis.clearTimeout(minuterie); };
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(langueMemorisee);

  useEffect(() => {
    document.documentElement.lang = language;
    if (language === 'fr') return undefined;
    const demarrer = globalThis.setTimeout(() => {
      globalThis.campusHubStopTranslation = creerTraducteur(language);
    }, 0);
    return () => {
      globalThis.clearTimeout(demarrer);
      globalThis.campusHubStopTranslation?.();
      delete globalThis.campusHubStopTranslation;
    };
  }, [language]);

  function changeLanguage(value) {
    if (!LANGUAGE_CODES.has(value) || value === language) return;
    globalThis.localStorage?.setItem(LANGUAGE_STORAGE_KEY, value);
    setLanguage(value);
    globalThis.location.reload();
  }

  const value = { ready: true, language, options: LANGUAGE_OPTIONS, changeLanguage };
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function LanguageSelector({ compact = false }) {
  const { ready, language, options, changeLanguage } = useContext(LanguageContext);
  return (
    <label className={`language-selector notranslate ${compact ? 'language-selector--compact' : ''}`} translate="no" title="Choisir la langue">
      <Languages aria-hidden="true" />
      <span className="language-selector__code">{language.toUpperCase()}</span>
      <ChevronDown className="language-selector__chevron" aria-hidden="true" />
      <select className="notranslate" translate="no" aria-label="Choisir la langue du site" value={language} disabled={!ready} onChange={(event) => changeLanguage(event.target.value)}>
        {options.map((option) => <option translate="no" value={option.value} key={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
