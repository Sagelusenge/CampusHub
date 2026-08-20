import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const cible = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (cible) {
        cible.scrollIntoView({ block: 'start', behavior: 'auto' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.querySelector('.app-content')?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return null;
}
