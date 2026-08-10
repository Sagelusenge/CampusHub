import * as service from '../services/affiliations.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function creer(req, res) { return envoyerSucces(res, await service.creerDemandeAffiliation(req.utilisateur.id, req.validees.body), 201); }
export async function mesDemandes(req, res) { return envoyerSucces(res, await service.listerMesDemandes(req.utilisateur.id)); }
export async function demandesUniversite(req, res) { return envoyerSucces(res, await service.listerDemandesUniversite(req.utilisateur.id)); }
export async function traiter(req, res) { return envoyerSucces(res, await service.traiterDemandeAffiliation(req.validees.params.code, req.utilisateur.id, req.validees.body)); }

export async function etudiantsUniversite(req, res) {
  const resultat = await service.listerEtudiantsUniversite(req.utilisateur.id, req.validees.query);
  return envoyerSucces(res, resultat.etudiants, 200, resultat.meta);
}

export async function modifierStatutEtudiant(req, res) {
  const resultat = await service.modifierStatutEtudiantUniversite(
    req.validees.params.code,
    req.utilisateur.id,
    req.validees.body,
  );
  req.auditContexte = {
    action: `ETUDIANT_${resultat.etudiant.statut_institution}`,
    typeEntite: 'PROFIL_ETUDIANT',
    identifiantEntite: resultat.etudiant.id,
    anciennesValeurs: resultat.avant,
    nouvellesValeurs: resultat.apres,
  };
  return envoyerSucces(res, resultat.etudiant, 200, undefined, resultat.message);
}
