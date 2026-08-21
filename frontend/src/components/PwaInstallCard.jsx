import { CheckCircle2, Download, MonitorSmartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { etatInstallationPwa, installerPwa, observerInstallationPwa } from '../utils/installation-pwa.js';

export function PwaInstallCard() {
  const [etat, setEtat] = useState(etatInstallationPwa());
  const [message, setMessage] = useState('');

  useEffect(() => observerInstallationPwa(setEtat), []);

  async function installer() {
    const resultat = await installerPwa();
    setMessage(resultat.installee ? 'CampusHub a été installé avec succès.' : 'Installation annulée. Vous pourrez réessayer plus tard.');
  }

  return <section className="app-panel settings-card pwa-install-card">
    <span>{etat.installee ? <CheckCircle2 /> : <MonitorSmartphone />}</span>
    <div>
      <h2>Application CampusHub</h2>
      {etat.installee
        ? <p>CampusHub est installé sur cet appareil et peut s’ouvrir comme une application.</p>
        : <p>Installez CampusHub sur votre téléphone ou votre ordinateur pour un accès rapide et une expérience plein écran.</p>}
      {!etat.installee && etat.disponible && <button className="secondary-action" type="button" onClick={installer}><Download />Installer CampusHub</button>}
      {!etat.installee && !etat.disponible && etat.ios && <small>Sur iPhone ou iPad : ouvrez le menu Partager de Safari, puis choisissez « Sur l’écran d’accueil ».</small>}
      {!etat.installee && !etat.disponible && !etat.ios && <small>Utilisez l’option « Installer l’application » du menu de votre navigateur si le bouton n’apparaît pas encore.</small>}
      {message && <small className="pwa-install-card__message">{message}</small>}
    </div>
  </section>;
}
