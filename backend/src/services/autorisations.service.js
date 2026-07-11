import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';

export async function trouverUniversiteParCode(code) {
  const [lignes] = await baseDeDonnees.execute(
    'SELECT * FROM universites WHERE code_universite = ? LIMIT 1',
    [code.toUpperCase()],
  );
  if (!lignes[0]) throw new ErreurApi(404, 'Université introuvable.');
  return lignes[0];
}

export async function verifierGestionUniversite(utilisateur, universiteId) {
  if (utilisateur.role === 'ADMINISTRATEUR') return true;
  const [lignes] = await baseDeDonnees.execute(
    `SELECT 1 FROM membres_universite
     WHERE universite_id = ? AND utilisateur_id = ? LIMIT 1`,
    [universiteId, utilisateur.id],
  );
  if (!lignes[0]) {
    throw new ErreurApi(403, 'Vous ne gérez pas cette université.');
  }
  return true;
}

export function verifierProprietaireOuAdmin(utilisateur, proprietaireId, message) {
  if (utilisateur.role !== 'ADMINISTRATEUR' && utilisateur.id !== proprietaireId) {
    throw new ErreurApi(403, message ?? 'Cette ressource ne vous appartient pas.');
  }
}
