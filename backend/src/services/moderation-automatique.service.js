import { ErreurApi } from '../utils/erreur-api.js';

const regles = [
  {
    categorie: 'MENACE_OU_VIOLENCE',
    message: 'les menaces ou l’incitation à la violence',
    motifs: [/(?:je|on|nous)\s+(?:vais|va|allons)\s+(?:te|vous|le|la)\s+(?:tuer|frapper|blesser)/iu, /(?:appel|incite)\s+à\s+(?:la\s+)?violence/iu],
  },
  {
    categorie: 'HARCELEMENT',
    message: 'le harcèlement, l’humiliation ciblée ou les insultes graves',
    motifs: [/(?:tu|vous)\s+(?:es|êtes)\s+(?:une?\s+)?(?:idiot|imbécile|ordure|inutile)/iu, /(?:harceler|humilier|traquer)\s+(?:cet|cette|un|une)\s+(?:élève|étudiant|personne)/iu],
  },
  {
    categorie: 'CONTENU_SEXUEL',
    message: 'les contenus pornographiques, sexuels explicites ou l’exploitation sexuelle',
    motifs: [/(?:pornograph|porno\b|sexe\s+explicite|nude?s?\b|contenu\s+sexuel)/iu, /(?:exploitation|abus)\s+sexuel/iu],
  },
  {
    categorie: 'HAINE_OU_DISCRIMINATION',
    message: 'les appels à la haine ou à la discrimination',
    motifs: [/(?:détester|chasser|exclure|attaquer)\s+(?:tous|toutes)\s+les\s+[\p{L}-]+/iu, /(?:race|ethnie|religion|handicap)\s+(?:inférieure|inférieur)/iu],
  },
  {
    categorie: 'DONNEES_SENSIBLES',
    message: 'la divulgation publique de mots de passe ou de codes de sécurité',
    motifs: [/(?:mot\s+de\s+passe|password|code\s+otp)\s*(?:est|:|=)\s*\S{4,}/iu],
  },
];

function texteNormalise(valeurs) {
  return valeurs.filter((valeur) => typeof valeur === 'string' && valeur.trim()).join('\n').normalize('NFKC');
}

export function analyserContenu(valeurs) {
  const texte = texteNormalise(Array.isArray(valeurs) ? valeurs : [valeurs]);
  for (const regle of regles) {
    if (regle.motifs.some((motif) => motif.test(texte))) {
      return { autorise: false, categorie: regle.categorie, raison: regle.message };
    }
  }
  return { autorise: true, categorie: null, raison: null };
}

export function verifierContenuAvantPublication(...valeurs) {
  const resultat = analyserContenu(valeurs);
  if (!resultat.autorise) {
    throw new ErreurApi(422, `Contenu refusé automatiquement : CampusHub interdit ${resultat.raison}. Corrigez le texte avant de réessayer.`);
  }
  return resultat;
}

export const reglesModeration = regles.map(({ categorie, message }) => ({ categorie, message }));
