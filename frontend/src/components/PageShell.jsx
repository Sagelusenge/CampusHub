import { Footer } from './Footer.jsx';
import { Header } from './Header.jsx';

export function PageShell({ children, footer = true }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      {footer && <Footer />}
    </>
  );
}
