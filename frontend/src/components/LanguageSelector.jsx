import { ChevronDown, Languages } from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const GOOGLE_TRANSLATE_SCRIPT = 'campushub-google-translate';
const GOOGLE_TRANSLATE_ELEMENT = 'campushub_google_translate_engine';
const LANGUAGE_OPTIONS = Object.freeze([
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
]);
const LANGUAGE_CODES = new Set(LANGUAGE_OPTIONS.map(({ value }) => value));
const LanguageContext = createContext({ ready: false, language: 'fr', options: LANGUAGE_OPTIONS, changeLanguage: () => {} });

function langueMemorisee() {
  const cookie = document.cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith('googtrans='));
  const code = cookie?.split('/').filter(Boolean).at(-1) || 'fr';
  return LANGUAGE_CODES.has(code) ? code : 'fr';
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(langueMemorisee);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let actif = true;
    const synchroniser = () => {
      const combo = document.querySelector(`#${GOOGLE_TRANSLATE_ELEMENT} .goog-te-combo`);
      if (!combo || !actif) return false;
      const langueActive = combo.value || langueMemorisee();
      setLanguage(LANGUAGE_CODES.has(langueActive) ? langueActive : 'fr');
      setReady(true);
      return true;
    };
    const initialise = () => {
      if (!globalThis.google?.translate?.TranslateElement) return;
      const container = document.getElementById(GOOGLE_TRANSLATE_ELEMENT);
      if (!container) return;
      if (!container.dataset.initialized) {
        container.dataset.initialized = 'true';
        new globalThis.google.translate.TranslateElement({
          pageLanguage: 'fr',
          includedLanguages: 'en,es',
          autoDisplay: false,
        }, GOOGLE_TRANSLATE_ELEMENT);
      }
      globalThis.setTimeout(synchroniser, 0);
      globalThis.setTimeout(synchroniser, 500);
      globalThis.setTimeout(synchroniser, 1_500);
    };

    globalThis.campusHubGoogleTranslateInit = initialise;
    const existing = document.getElementById(GOOGLE_TRANSLATE_SCRIPT);
    if (existing) {
      existing.addEventListener('load', initialise);
      initialise();
      return () => { actif = false; existing.removeEventListener('load', initialise); };
    }
    const script = document.createElement('script');
    script.id = GOOGLE_TRANSLATE_SCRIPT;
    script.async = true;
    script.src = 'https://translate.google.com/translate_a/element.js?cb=campusHubGoogleTranslateInit';
    script.addEventListener('load', initialise);
    document.head.appendChild(script);
    return () => { actif = false; script.removeEventListener('load', initialise); };
  }, []);

  function changeLanguage(value) {
    if (!LANGUAGE_CODES.has(value)) return;
    setLanguage(value);
    if (value === 'fr') {
      document.cookie = 'googtrans=; Max-Age=0; path=/';
      document.cookie = `googtrans=; Max-Age=0; path=/; domain=${globalThis.location.hostname}`;
      globalThis.location.reload();
      return;
    }
    const traduction = `/fr/${value}`;
    document.cookie = `googtrans=${traduction}; Max-Age=31536000; path=/; SameSite=Lax`;
    document.cookie = `googtrans=${traduction}; Max-Age=31536000; path=/; domain=${globalThis.location.hostname}; SameSite=Lax`;
    globalThis.location.reload();
  }

  const value = useMemo(() => ({ ready, language, options: LANGUAGE_OPTIONS, changeLanguage }), [ready, language]);
  return <LanguageContext.Provider value={value}>{children}<div id={GOOGLE_TRANSLATE_ELEMENT} className="google-translate-engine" aria-hidden="true" /></LanguageContext.Provider>;
}

export function LanguageSelector({ compact = false }) {
  const { ready, language, options, changeLanguage } = useContext(LanguageContext);
  return (
    <label className={`language-selector notranslate ${compact ? 'language-selector--compact' : ''}`} translate="no" title="Choisir la langue">
      <Languages aria-hidden="true" />
      <span className="language-selector__code">{language.split('-')[0].toUpperCase()}</span>
      <ChevronDown className="language-selector__chevron" aria-hidden="true" />
      <select className="notranslate" translate="no" aria-label="Choisir la langue du site" value={language} disabled={!ready} onChange={(event) => changeLanguage(event.target.value)}>
        {options.map((option) => <option translate="no" value={option.value} key={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
