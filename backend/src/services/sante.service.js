import { baseDeDonnees } from '../config/base-de-donnees.js';

export async function obtenirEtatSante() {
  const debut = performance.now();
  const [lignes] = await baseDeDonnees.query('SELECT DATABASE() AS base, NOW() AS heure_serveur');
  return {
    api: 'operationnelle',
    baseDeDonnees: 'connectee',
    nomBase: lignes[0].base,
    heureServeur: lignes[0].heure_serveur,
    latenceMs: Math.round(performance.now() - debut),
  };
}
