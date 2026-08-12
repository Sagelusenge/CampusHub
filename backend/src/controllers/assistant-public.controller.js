import { poserQuestionPublique } from '../services/assistant-public.service.js';
import { envoyerSucces } from '../utils/reponse-api.js';

export async function question(requete, reponse) {
  return envoyerSucces(reponse, await poserQuestionPublique(requete.validees.body));
}
