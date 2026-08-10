import { ErreurApi } from '../utils/erreur-api.js';
import { envoyerSucces } from '../utils/reponse-api.js';

function reponseFichier(requete, reponse, type) {
  if (!requete.file) throw new ErreurApi(400, 'Aucun fichier valide reçu.');
  const url = `${requete.protocol}://${requete.get('host')}/uploads/${type}/${requete.file.filename}`;
  return envoyerSucces(reponse, { url, nom: requete.file.originalname, typeMime: requete.file.mimetype, tailleOctets: requete.file.size }, 201);
}
export function image(requete, reponse) { return reponseFichier(requete, reponse, 'images'); }
export function media(requete, reponse) { return reponseFichier(requete, reponse, 'medias'); }
export function preuve(requete, reponse) { return reponseFichier(requete, reponse, 'preuves'); }
export function document(requete, reponse) { return reponseFichier(requete, reponse, 'documents'); }
export function fichier(requete, reponse) { return reponseFichier(requete, reponse, 'fichiers'); }
