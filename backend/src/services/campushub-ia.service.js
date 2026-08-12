import { environnement } from '../config/environnement.js';

export const modeleCampusHubIA = environnement.CAMPUSHUB_IA_MODEL;

async function requeteCampusHubIA(chemin, options = {}) {
  const controleur = new AbortController();
  const minuterie = setTimeout(() => controleur.abort(), environnement.CAMPUSHUB_IA_TIMEOUT_MS);
  try {
    const reponse = await fetch(`${environnement.CAMPUSHUB_IA_URL}${chemin}`, {
      ...options,
      signal: controleur.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-CampusHub-IA-Token': environnement.CAMPUSHUB_IA_TOKEN,
        ...(options.headers || {}),
      },
    });
    const resultat = await reponse.json().catch(() => ({}));
    if (!reponse.ok) throw new Error(resultat.error || `CampusHubIA a répondu ${reponse.status}.`);
    return resultat;
  } finally {
    clearTimeout(minuterie);
  }
}

export async function verifierCampusHubIA() {
  try {
    const resultat = await requeteCampusHubIA('/health');
    return { disponible: resultat.status === 'ok', ...resultat };
  } catch (erreur) {
    return { disponible: false, erreur: erreur.name === 'AbortError' ? 'Délai dépassé.' : erreur.message };
  }
}

export async function interrogerCampusHubIA({ task, message, audience, context }) {
  return requeteCampusHubIA('/api/v1/respond', {
    method: 'POST',
    body: JSON.stringify({ task, message, audience, context }),
  });
}

export async function essayerCampusHubIA(donnees) {
  try {
    return await interrogerCampusHubIA(donnees);
  } catch (erreur) {
    console.error('CampusHubIA indisponible, moteur de règles utilisé :', erreur.name === 'AbortError' ? 'délai dépassé' : erreur.message);
    return null;
  }
}
