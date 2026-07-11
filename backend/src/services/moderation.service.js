import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { metaPagination, pagination } from '../utils/sql.js';

export async function creerSignalement(utilisateurId, donnees) {
  const [publications] = await baseDeDonnees.execute('SELECT id FROM publications WHERE code_publication = ? LIMIT 1', [donnees.codePublication.toUpperCase()]);
  if (!publications[0]) throw new ErreurApi(404, 'Publication introuvable.');
  const [resultats] = await baseDeDonnees.query('CALL sp_signaler_publication(?, ?, ?, ?)', [utilisateurId, publications[0].id, donnees.motif, donnees.details ?? null]);
  return resultats[0][0];
}
export async function listerSignalements(filtres) {
  const { page, limite, decalage } = pagination(filtres.page, filtres.limite);
  const where = filtres.statut ? 'WHERE s.statut_signalement = ?' : '';
  const valeurs = filtres.statut ? [filtres.statut] : [];
  const [[lignes], [compte]] = await Promise.all([
    baseDeDonnees.execute(
      `SELECT s.*, d.code_utilisateur AS code_declarant, d.nom_affichage AS nom_declarant,
       p.code_publication, p.titre AS titre_publication, m.nom_affichage AS nom_moderateur
       FROM signalements s
       JOIN utilisateurs d ON d.id = s.auteur_signalement_id
       LEFT JOIN publications p ON p.id = s.publication_id
       LEFT JOIN utilisateurs m ON m.id = s.moderateur_id
       ${where} ORDER BY FIELD(s.statut_signalement, 'OUVERT', 'EN_EXAMEN', 'RESOLU', 'REJETE'), s.date_creation
       LIMIT ? OFFSET ?`, [...valeurs, limite, decalage],
    ),
    baseDeDonnees.execute(`SELECT COUNT(*) AS total FROM signalements s ${where}`, valeurs),
  ]);
  return { signalements: lignes, meta: metaPagination(compte[0].total, page, limite) };
}
export async function traiterSignalement(code, moderateurId, donnees) {
  const [lignes] = await baseDeDonnees.execute('SELECT id FROM signalements WHERE code_signalement = ? LIMIT 1', [code.toUpperCase()]);
  if (!lignes[0]) throw new ErreurApi(404, 'Signalement introuvable.');
  const [resultats] = await baseDeDonnees.query('CALL sp_traiter_signalement(?, ?, ?, ?)', [lignes[0].id, moderateurId, donnees.statut, donnees.resolution ?? null]);
  return resultats[0][0];
}
