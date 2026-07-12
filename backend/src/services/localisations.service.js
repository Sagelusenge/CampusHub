import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';

export async function creerSuggestion(donnees, utilisateurId = null) {
  await baseDeDonnees.execute(
    `INSERT INTO suggestions_localisation
      (id, code_suggestion, utilisateur_id, pays, province, ville_proposee, email_contact)
     VALUES (0, '', ?, ?, ?, ?, ?)`,
    [utilisateurId, donnees.pays, donnees.province, donnees.villeProposee, donnees.emailContact ?? null],
  );
  const [lignes] = await baseDeDonnees.execute(
    `SELECT * FROM suggestions_localisation
     WHERE pays = ? AND province = ? AND ville_proposee = ?
     ORDER BY id DESC LIMIT 1`,
    [donnees.pays, donnees.province, donnees.villeProposee],
  );
  return lignes[0];
}

export async function listerSuggestions() {
  const [lignes] = await baseDeDonnees.query(
    `SELECT s.*, u.code_utilisateur, u.nom_affichage
     FROM suggestions_localisation s LEFT JOIN utilisateurs u ON u.id = s.utilisateur_id
     ORDER BY FIELD(s.statut, 'EN_ATTENTE','ACCEPTEE','REJETEE'), s.date_creation DESC`,
  );
  return lignes;
}

export async function traiterSuggestion(code, statut) {
  const [resultat] = await baseDeDonnees.execute(
    `UPDATE suggestions_localisation SET statut = ?, date_traitement = CURRENT_TIMESTAMP WHERE code_suggestion = ?`,
    [statut, code.toUpperCase()],
  );
  if (!resultat.affectedRows) throw new ErreurApi(404, 'Suggestion introuvable.');
  const [lignes] = await baseDeDonnees.execute('SELECT * FROM suggestions_localisation WHERE code_suggestion = ?', [code.toUpperCase()]);
  return lignes[0];
}
