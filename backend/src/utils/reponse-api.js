export function envoyerSucces(
  reponse,
  donnees,
  codeHttp = 200,
  meta = undefined,
  message = undefined,
) {
  return reponse.status(codeHttp).json({
    succes: true,
    ...(message ? { message } : {}),
    donnees,
    ...(meta ? { meta } : {}),
  });
}
