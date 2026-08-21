import { createHash } from 'node:crypto';
import webpush from 'web-push';
import { baseDeDonnees } from '../config/base-de-donnees.js';
import { environnement } from '../config/environnement.js';
import { ErreurApi } from '../utils/erreur-api.js';

const pushConfigure = Boolean(environnement.VAPID_PUBLIC_KEY && environnement.VAPID_PRIVATE_KEY);
let distributionEnCours = false;

if (pushConfigure) {
  webpush.setVapidDetails(
    environnement.VAPID_SUBJECT,
    environnement.VAPID_PUBLIC_KEY,
    environnement.VAPID_PRIVATE_KEY,
  );
}

function empreinteEndpoint(endpoint) {
  return createHash('sha256').update(endpoint).digest('hex');
}

export function configurationPush() {
  return {
    disponible: pushConfigure,
    clePublique: pushConfigure ? environnement.VAPID_PUBLIC_KEY : null,
  };
}

export async function enregistrerAbonnementPush(utilisateurId, abonnement, navigateur) {
  if (!pushConfigure) throw new ErreurApi(503, 'Les notifications push ne sont pas encore configurées sur ce serveur.');
  const endpointHash = empreinteEndpoint(abonnement.endpoint);
  await baseDeDonnees.execute(
    `INSERT INTO abonnements_push
      (id, utilisateur_id, endpoint_hash, endpoint, cle_p256dh, cle_auth, date_expiration, navigateur, est_actif)
     VALUES (UUID_SHORT(), ?, ?, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE utilisateur_id = VALUES(utilisateur_id), endpoint = VALUES(endpoint),
       cle_p256dh = VALUES(cle_p256dh), cle_auth = VALUES(cle_auth),
       date_expiration = VALUES(date_expiration), navigateur = VALUES(navigateur), est_actif = 1`,
    [
      utilisateurId,
      endpointHash,
      abonnement.endpoint,
      abonnement.keys.p256dh,
      abonnement.keys.auth,
      abonnement.expirationTime ?? null,
      navigateur || null,
    ],
  );
  return { actif: true };
}

export async function desactiverAbonnementPush(utilisateurId, endpoint) {
  const [resultat] = await baseDeDonnees.execute(
    'UPDATE abonnements_push SET est_actif = 0 WHERE utilisateur_id = ? AND endpoint_hash = ?',
    [utilisateurId, empreinteEndpoint(endpoint)],
  );
  return { actif: false, modifie: resultat.affectedRows > 0 };
}

async function livrer(livraison) {
  const abonnement = {
    endpoint: livraison.endpoint,
    keys: { p256dh: livraison.cle_p256dh, auth: livraison.cle_auth },
  };
  const contenu = JSON.stringify({
    code: livraison.code_notification,
    titre: livraison.titre,
    message: livraison.message,
    url: livraison.url_action || '/notifications',
  });
  try {
    const resultat = await webpush.sendNotification(abonnement, contenu, { TTL: 60 * 60 * 24, urgency: 'normal' });
    await baseDeDonnees.execute(
      `INSERT IGNORE INTO envois_notifications_push
        (id, notification_id, abonnement_push_id, statut, code_http)
       VALUES (UUID_SHORT(), ?, ?, 'ENVOYE', ?)`,
      [livraison.notification_id, livraison.abonnement_push_id, resultat.statusCode || 201],
    );
  } catch (erreur) {
    const codeHttp = Number(erreur.statusCode || 0) || null;
    if ([404, 410].includes(codeHttp)) {
      await baseDeDonnees.execute('UPDATE abonnements_push SET est_actif = 0 WHERE id = ?', [livraison.abonnement_push_id]);
    }
    await baseDeDonnees.execute(
      `INSERT IGNORE INTO envois_notifications_push
        (id, notification_id, abonnement_push_id, statut, code_http, erreur)
       VALUES (UUID_SHORT(), ?, ?, 'ECHEC', ?, ?)`,
      [livraison.notification_id, livraison.abonnement_push_id, codeHttp, String(erreur.message || 'Échec Web Push').slice(0, 500)],
    );
  }
}

export async function distribuerNotificationsPush() {
  if (!pushConfigure || distributionEnCours) return 0;
  distributionEnCours = true;
  try {
    const [livraisons] = await baseDeDonnees.execute(
      `SELECT n.id AS notification_id, n.code_notification, n.titre, n.message, n.url_action,
        a.id AS abonnement_push_id, a.endpoint, a.cle_p256dh, a.cle_auth
       FROM notifications n
       JOIN abonnements_push a ON a.utilisateur_id = n.destinataire_id
        AND a.est_actif = 1 AND a.date_creation <= n.date_creation
       LEFT JOIN envois_notifications_push e
        ON e.notification_id = n.id AND e.abonnement_push_id = a.id
       WHERE e.id IS NULL AND n.date_creation >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       ORDER BY n.date_creation ASC
       LIMIT 50`,
    );
    await Promise.all(livraisons.map(livrer));
    return livraisons.length;
  } finally {
    distributionEnCours = false;
  }
}

export function demarrerDistributionPush() {
  if (!pushConfigure) {
    console.warn('Web Push désactivé : clés VAPID absentes.');
    return () => {};
  }
  const lancer = () => distribuerNotificationsPush().catch((erreur) => console.error('Distribution Web Push :', erreur.message));
  const minuterie = setInterval(lancer, 10_000);
  minuterie.unref();
  void lancer();
  console.log('Distribution Web Push CampusHub active.');
  return () => clearInterval(minuterie);
}
