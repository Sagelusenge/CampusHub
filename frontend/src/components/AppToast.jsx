import { CheckCircle2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function AppToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    function show(event) {
      window.clearTimeout(timer.current);
      setToast(event.detail || { message: 'Enregistrement effectué.', type: 'success' });
      timer.current = window.setTimeout(() => setToast(null), 2200);
    }
    window.addEventListener('campushub:toast', show);
    return () => { window.removeEventListener('campushub:toast', show); window.clearTimeout(timer.current); };
  }, []);

  if (!toast) return null;
  return <div className={`app-toast app-toast--${toast.type || 'success'}`} role="status">
    <CheckCircle2 /><span>{toast.message}</span><button type="button" onClick={() => setToast(null)} aria-label="Fermer"><X /></button>
  </div>;
}
