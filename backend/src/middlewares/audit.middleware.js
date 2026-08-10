import { baseDeDonnees } from '../config/base-de-donnees.js';

const actionsParMethode = {
  GET: 'CONSULTATION',
  POST: 'CREATION',
  PUT: 'MODIFICATION',
  PATCH: 'MODIFICATION',
  DELETE: 'SUPPRESSION',
};

const champsSecrets = /mot.?de.?passe|password|secret|token|jeton|authorization|cookie|codeverification|code_verification/i;

function nettoyer(valeur, profondeur = 0) {
  if (valeur === null || valeur === undefined) return valeur;
  if (profondeur > 4) return '[PROFONDEUR_LIMITEE]';
  if (Buffer.isBuffer(valeur)) return '[DONNEE_BINAIRE]';
  if (typeof valeur === 'string') return valeur.length > 500 ? `${valeur.slice(0, 500)}…` : valeur;
  if (typeof valeur !== 'object') return valeur;
  if (Array.isArray(valeur)) return valeur.slice(0, 20).map((item) => nettoyer(item, profondeur + 1));
  return Object.fromEntries(Object.entries(valeur).slice(0, 50).map(([cle, contenu]) => [
    cle,
    champsSecrets.test(cle) ? '[MASQUE]' : nettoyer(contenu, profondeur + 1),
  ]));
}

function typeEntite(requete) {
  const segment = requete.path.split('/').filter(Boolean)[0] || 'SYSTEME';
  return segment.replace(/[^a-z0-9_-]/gi, '').toUpperCase().slice(0, 80) || 'SYSTEME';
}

function actionAutomatique(requete, codeHttp) {
  const chemin = requete.path.toLowerCase();
  let action = actionsParMethode[requete.method] || 'ACTION';
  if (chemin.endsWith('/connexion')) action = 'CONNEXION';
  if (chemin.endsWith('/deconnexion')) action = 'DECONNEXION';
  if (chemin.includes('/verification-email/confirmer')) action = 'CONFIRMATION_EMAIL';
  if (chemin.endsWith('/inscription')) action = 'INSCRIPTION';
  return codeHttp >= 400 ? `${action}_ECHEC` : action;
}

function doitAuditer(requete) {
  if (process.env.NODE_ENV === 'test' && process.env.RUN_MYSQL_INTEGRATION !== '1') return false;
  if (requete.path.startsWith('/sante')) return false;
  if (requete.method !== 'GET') return true;
  if (!requete.utilisateur?.id) return false;
  if (requete.path.startsWith('/notifications')) return false;
  return true;
}

export function auditerActions(requete, reponse, suivant) {
  reponse.on('finish', () => {
    if (!doitAuditer(requete)) return;
    const contexte = requete.auditContexte || {};
    const corps = nettoyer(requete.body || {});
    if (requete.path.includes('/verification-email/')) corps.code = '[MASQUE]';
    const nouvellesValeurs = contexte.nouvellesValeurs || {
      methode: requete.method,
      chemin: requete.originalUrl.split('?')[0],
      codeHttp: reponse.statusCode,
      parametres: nettoyer(requete.params || {}),
      requete: corps,
    };
    baseDeDonnees.execute(
      `INSERT INTO journal_audit
        (id, code_audit, utilisateur_id, action, type_entite, identifiant_entite,
         anciennes_valeurs, nouvelles_valeurs, adresse_ip)
       VALUES (0, '', ?, ?, ?, ?, ?, ?, ?)`,
      [
        requete.utilisateur?.id || requete.auditUtilisateurId || null,
        (contexte.action || actionAutomatique(requete, reponse.statusCode)).slice(0, 120),
        (contexte.typeEntite || typeEntite(requete)).slice(0, 80),
        Number.isSafeInteger(Number(contexte.identifiantEntite)) ? Number(contexte.identifiantEntite) : null,
        contexte.anciennesValeurs ? JSON.stringify(nettoyer(contexte.anciennesValeurs)) : null,
        JSON.stringify(nettoyer(nouvellesValeurs)),
        String(requete.ip || requete.socket?.remoteAddress || '').slice(0, 45) || null,
      ],
    ).catch((erreur) => {
      if (process.env.NODE_ENV !== 'test') console.error('Échec de journalisation audit :', erreur.message);
    });
  });
  suivant();
}
