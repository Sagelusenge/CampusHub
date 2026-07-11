export function gestionnaireAsync(fonction) {
  return function executerAvecGestionErreur(requete, reponse, suivant) {
    Promise.resolve(fonction(requete, reponse, suivant)).catch(suivant);
  };
}
