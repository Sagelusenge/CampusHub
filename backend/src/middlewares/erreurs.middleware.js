import { ErreurApi } from '../utils/erreur-api.js';
import { environnement } from '../config/environnement.js';

export function routeIntrouvable(requete, _reponse, suivant) {
  suivant(new ErreurApi(404, `Route introuvable : ${requete.method} ${requete.originalUrl}`));
}

function convertirErreurMysql(erreur) {
  if (erreur.name === 'MulterError' && erreur.code === 'LIMIT_FILE_SIZE') {
    return new ErreurApi(413, 'Le fichier est trop volumineux. Limite : 5 Mo pour une photo et 8 Mo pour une preuve.');
  }
  if (erreur.name === 'MulterError') {
    return new ErreurApi(400, `Le fichier envoyé est invalide : ${erreur.message}`);
  }
  if (erreur.code === 'ER_DUP_ENTRY') {
    return new ErreurApi(409, 'Cette information existe déjà dans la base de données.');
  }
  if (['ER_NO_REFERENCED_ROW_2', 'ER_ROW_IS_REFERENCED_2'].includes(erreur.code)) {
    return new ErreurApi(400, 'L’opération viole une relation entre les données.');
  }
  if (erreur.errno === 1644 || erreur.sqlState === '45000') {
    return new ErreurApi(400, erreur.sqlMessage ?? erreur.message);
  }
  return erreur;
}

export function gestionnaireErreurs(erreurInitiale, _requete, reponse, _suivant) {
  const erreur = convertirErreurMysql(erreurInitiale);
  const codeHttp = erreur instanceof ErreurApi ? erreur.codeHttp : 500;
  const message = codeHttp === 500 ? 'Une erreur interne est survenue.' : erreur.message;

  if (codeHttp === 500) console.error(erreur);

  reponse.status(codeHttp).json({
    succes: false,
    erreur: {
      message,
      ...(erreur.details ? { details: erreur.details } : {}),
      ...(codeHttp === 500 && environnement.NODE_ENV === 'development'
        ? { technique: erreur.message, code: erreur.code }
        : {}),
    },
  });
}
