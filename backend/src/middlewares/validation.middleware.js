import { ErreurApi } from '../utils/erreur-api.js';

export function valider(schema, source = 'body') {
  return function middlewareValidation(requete, _reponse, suivant) {
    const resultat = schema.safeParse(requete[source]);
    if (!resultat.success) {
      const premierProbleme = resultat.error.issues[0];
      const champ = premierProbleme?.path?.join('.');
      return suivant(new ErreurApi(
        400,
        champ ? `Le champ « ${champ} » est invalide : ${premierProbleme.message}` : 'Les données envoyées sont invalides.',
        resultat.error.flatten(),
      ));
    }
    requete.validees ??= {};
    requete.validees[source] = resultat.data;
    return suivant();
  };
}
