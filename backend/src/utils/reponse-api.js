export function envoyerSucces(reponse, donnees, codeHttp = 200, meta = undefined) {
  return reponse.status(codeHttp).json({
    succes: true,
    donnees,
    ...(meta ? { meta } : {}),
  });
}
