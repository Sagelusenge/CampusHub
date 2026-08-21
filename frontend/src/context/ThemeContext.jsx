/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'campushub-theme';
const ThemeContext = createContext(null);

function themeInitial() {
  try {
    const saved = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Le thème du système reste disponible si le stockage local est bloqué.
  }
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#071525' : '#06246f');
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(themeInitial);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const media = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;
    const synchronize = (event) => {
      try {
        if (globalThis.localStorage?.getItem(THEME_STORAGE_KEY)) return;
      } catch {
        // Sans stockage, le thème continue à suivre le système.
      }
      setThemeState(event.matches ? 'dark' : 'light');
    };
    media.addEventListener?.('change', synchronize);
    return () => media.removeEventListener?.('change', synchronize);
  }, []);

  function setTheme(value) {
    const nextTheme = value === 'dark' ? 'dark' : 'light';
    try {
      globalThis.localStorage?.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Le changement reste actif pour la session en cours.
    }
    setThemeState(nextTheme);
  }

  const value = useMemo(() => ({
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme doit être utilisé dans ThemeProvider');
  return context;
}
