import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { metaPagination, pagination } from '../utils/sql.js';

export async function listerNotifications(utilisateurId, filtres) {
  const { page, limite, decalage } = pagination(filtres.page, filtres.limite);
  const conditionLecture = filtres.nonLues ? 'AND n.date_lecture IS NULL' : '';
  const [[lignes], [compte], [nonLues]] = await Promise.all([
    baseDeDonnees.execute(
      `SELECT n.*, a.code_utilisateur AS code_acteur, a.nom_affichage AS nom_acteur
       FROM notifications n LEFT JOIN utilisateurs a ON a.id = n.acteur_id
       WHERE n.destinataire_id = ? ${conditionLecture}
       ORDER BY n.date_creation DESC LIMIT ? OFFSET ?`, [utilisateurId, limite, decalage],
    ),
    baseDeDonnees.execute(`SELECT COUNT(*) AS total FROM notifications n WHERE n.destinataire_id = ? ${conditionLecture}`, [utilisateurId]),
    baseDeDonnees.execute('SELECT COUNT(*) AS total FROM notifications WHERE destinataire_id = ? AND date_lecture IS NULL', [utilisateurId]),
  ]);
  return { notifications: lignes, nonLues: nonLues[0].total, meta: metaPagination(compte[0].total, page, limite) };
}
export async function marquerLue(utilisateurId, code) {
  const [resultat] = await baseDeDonnees.execute(
    'UPDATE notifications SET date_lecture = COALESCE(date_lecture, CURRENT_TIMESTAMP) WHERE destinataire_id = ? AND code_notification = ?',
    [utilisateurId, code.toUpperCase()],
  );
  if (!resultat.affectedRows) throw new ErreurApi(404, 'Notification introuvable.');
  return { lue: true };
}
export async function marquerToutesLues(utilisateurId) {
  const [resultats] = await baseDeDonnees.query('CALL sp_marquer_notifications_lues(?)', [utilisateurId]);
  return { nombre: resultats[0][0].nombre_notifications_marquees_lues };
}
export async function supprimerNotification(utilisateurId, code) {
  const [resultat] = await baseDeDonnees.execute('DELETE FROM notifications WHERE destinataire_id = ? AND code_notification = ?', [utilisateurId, code.toUpperCase()]);
  if (!resultat.affectedRows) throw new ErreurApi(404, 'Notification introuvable.');
  return { supprimee: true };
}
