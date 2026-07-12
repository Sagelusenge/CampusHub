import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/PageShell.jsx';

export function NotFoundPage() {
  return (
    <PageShell>
      <section className="not-found">
        <Compass size={48} />
        <span className="eyebrow eyebrow--accent">Erreur 404</span>
        <h1>Cette destination n’existe pas.</h1>
        <p>Revenez à l’accueil pour poursuivre votre orientation.</p>
        <Link className="button" to="/"><ArrowLeft size={18} /> Retour à l’accueil</Link>
      </section>
    </PageShell>
  );
}
