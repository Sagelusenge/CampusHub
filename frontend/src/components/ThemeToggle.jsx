import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

const labels = {
  fr: { dark: 'Activer le mode sombre', light: 'Activer le mode clair' },
  en: { dark: 'Turn on dark mode', light: 'Turn on light mode' },
  es: { dark: 'Activar el modo oscuro', light: 'Activar el modo claro' },
};

export function ThemeToggle({ compact = true }) {
  const { isDark, toggleTheme } = useTheme();
  const language = globalThis.localStorage?.getItem('campushub-language') || 'fr';
  const text = (labels[language] || labels.fr)[isDark ? 'light' : 'dark'];

  return (
    <button
      className={`theme-toggle ${compact ? 'theme-toggle--compact' : ''}`}
      type="button"
      onClick={toggleTheme}
      aria-label={text}
      title={text}
      aria-pressed={isDark}
    >
      <span className="theme-toggle__icons" aria-hidden="true">
        <Sun className="theme-toggle__sun" />
        <Moon className="theme-toggle__moon" />
      </span>
      {!compact && <span>{isDark ? 'Mode clair' : 'Mode sombre'}</span>}
    </button>
  );
}
