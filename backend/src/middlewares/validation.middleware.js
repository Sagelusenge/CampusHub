import { ErreurApi } from '../utils/erreur-api.js';

export function valider(schema, source = 'body') {
  return function middlewareValidation(requete, _reponse, suivant) {
    const resultat = schema.safeParse(requete[source]);
    if (!resultat.success) {
      return suivant(new ErreurApi(
        400,
        'Les données envoyées sont invalides.',
        resultat.error.flatten(),
      ));
    }
    requete.validees ??= {};
    requete.validees[source] = resultat.data;
    return suivant();
  };
}
