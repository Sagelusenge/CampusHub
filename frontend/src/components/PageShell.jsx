import { Footer } from './Footer.jsx';
import { Header } from './Header.jsx';
import { DashboardShell } from './DashboardShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function PageShell({ children, footer = true }) {
  const { utilisateur } = useAuth();
  const estVisiteur = utilisateur?.role === 'VISITEUR';
  if (estVisiteur) return <DashboardShell role="visitor">{children}</DashboardShell>;
  return (
    <>
      <Header />
      <main>{children}</main>
      {footer && <Footer />}
    </>
  );
}
