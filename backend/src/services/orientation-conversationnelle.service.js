import { baseDeDonnees } from '../config/base-de-donnees.js';
import { essayerCampusHubIA, modeleCampusHubIA } from './campushub-ia.service.js';

const OPTIONS = [
  {
    code: 'COMMERCIALE_GESTION',
    label: 'Commerciale et gestion',
    aliases: ['commerciale de gestion', 'commerciale et gestion', 'commercial et gestion', 'commerciale gestion', 'commercial', 'commerce gestion'],
    domaines: ['gestion', 'commerce', 'économie', 'comptabilité', 'finance', 'marketing', 'droit', 'administration', 'informatique de gestion'],
    pistes: ['Gestion des entreprises', 'Comptabilité', 'Finance', 'Marketing', 'Économie', 'Commerce', 'Ressources humaines', 'Informatique de gestion', 'Droit des affaires'],
  },
  {
    code: 'SCIENTIFIQUE',
    label: 'Scientifique',
    aliases: ['scientifique', 'sciences', 'math physique', 'math-physique', 'bio chimie', 'bio-chimie'],
    domaines: ['informatique', 'science', 'médecine', 'santé', 'ingénierie', 'agronomie', 'architecture', 'mathématique', 'biologie', 'chimie', 'physique'],
    pistes: ['Informatique', 'Médecine et santé', 'Ingénierie', 'Sciences biologiques', 'Mathématiques', 'Agronomie', 'Architecture'],
  },
  {
    code: 'PEDAGOGIE',
    label: 'Pédagogie générale',
    aliases: ['pedagogie', 'pédagogie', 'pedagogique', 'normale primaire'],
    domaines: ['éducation', 'pédagogie', 'psychologie', 'lettres', 'langue', 'sciences sociales', 'enseignement'],
    pistes: ['Sciences de l’éducation', 'Psychologie', 'Lettres et langues', 'Enseignement', 'Sciences sociales'],
  },
  {
    code: 'LITTERAIRE',
    label: 'Littéraire et humanités',
    aliases: ['litteraire', 'littéraire', 'latin philo', 'latin-philo', 'humanites litteraires', 'humanités littéraires'],
    domaines: ['droit', 'communication', 'journalisme', 'lettres', 'langue', 'histoire', 'sciences politiques', 'relations internationales'],
    pistes: ['Droit', 'Communication', 'Journalisme', 'Lettres et langues', 'Sciences politiques', 'Relations internationales'],
  },
  {
    code: 'TECHNIQUE_INDUSTRIELLE',
    label: 'Technique industrielle',
    aliases: ['technique industrielle', 'electricite', 'électricité', 'electronique', 'électronique', 'mecanique', 'mécanique', 'construction'],
    domaines: ['ingénierie', 'électricité', 'électronique', 'mécanique', 'construction', 'informatique', 'réseau', 'télécommunication'],
    pistes: ['Génie électrique', 'Électronique', 'Mécanique', 'Construction', 'Informatique', 'Réseaux et télécommunications'],
  },
  {
    code: 'TECHNIQUE_SOCIALE',
    label: 'Technique sociale',
    aliases: ['technique sociale', 'sociale', 'humanites sociales', 'humanités sociales'],
    domaines: ['santé', 'soins', 'nutrition', 'développement', 'psychologie', 'sciences sociales', 'éducation'],
    pistes: ['Sciences sociales', 'Développement communautaire', 'Psychologie', 'Nutrition', 'Santé publique', 'Éducation'],
  },
  {
    code: 'AGRICULTURE',
    label: 'Agriculture',
    aliases: ['agriculture', 'agronomie', 'veterinaire', 'vétérinaire', 'developpement rural', 'développement rural'],
    domaines: ['agronomie', 'agriculture', 'environnement', 'vétérinaire', 'biologie', 'développement rural'],
    pistes: ['Agronomie', 'Sciences de l’environnement', 'Médecine vétérinaire', 'Biologie', 'Développement rural'],
  },
];

const INTERETS = [
  ['INFORMATIQUE', ['informatique', 'logiciel', 'réseau', 'numérique', 'data']],
  ['SANTE', ['santé', 'médecine', 'soins', 'pharmacie', 'nutrition']],
  ['INGENIERIE', ['ingénierie', 'électricité', 'électronique', 'mécanique', 'construction', 'architecture']],
  ['GESTION', ['gestion', 'commerce', 'économie', 'comptabilité', 'finance', 'marketing']],
  ['DROIT', ['droit', 'politique', 'relations internationales', 'administration']],
  ['EDUCATION', ['éducation', 'pédagogie', 'enseignement', 'psychologie']],
  ['AGRICULTURE', ['agronomie', 'agriculture', 'environnement', 'vétérinaire', 'développement rural']],
  ['COMMUNICATION', ['communication', 'journalisme', 'langue', 'lettres']],
  ['SCIENCES', ['science', 'mathématique', 'physique', 'chimie', 'biologie']],
];

function normaliser(valeur = '') {
  return String(valeur)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9%.,$ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b(?:comerciale|commericale|commeciale|commercialle)\b/g, 'commerciale')
    .replace(/\b(?:geston|gestionn|gesion)\b/g, 'gestion')
    .replace(/\b(?:scientifque|scientifiqe)\b/g, 'scientifique')
    .replace(/\b(?:pedagojie|pedagogei)\b/g, 'pedagogie')
    .replace(/\b(?:univeriste|unniversite|universiter)\b/g, 'universite')
    .replace(/\b(?:pourcentge|pourcetage)\b/g, 'pourcentage');
}

function contient(texte, mots) {
  return mots.some((mot) => texte.includes(normaliser(mot)));
}

function extraireOption(texte) {
  return OPTIONS.find((option) => contient(texte, option.aliases)) || null;
}

function extrairePourcentage(texte) {
  const explicite = texte.match(/\b(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:%|pourcent(?:age)?\b)/);
  const avec = texte.match(/\bavec\s+(\d{1,3}(?:[.,]\d{1,2})?)\b/);
  const nombreTrouve = explicite?.[1] || avec?.[1];
  if (!nombreTrouve) return null;
  const valeur = Number(String(nombreTrouve).replace(',', '.'));
  return Number.isFinite(valeur) && valeur >= 0 && valeur <= 100 ? valeur : null;
}

function extraireBudget(texte) {
  const resultat = texte.match(/(?:budget|maximum|max|jusqu a)\D{0,12}(\d{2,6}(?:[.,]\d{1,2})?)\s*(?:usd|\$|dollars?)/);
  if (!resultat?.[1]) return null;
  const valeur = Number(String(resultat[1]).replace(',', '.'));
  return Number.isFinite(valeur) && valeur > 0 ? valeur : null;
}

function extraireInterets(texte, option) {
  const trouves = INTERETS.filter(([, mots]) => contient(texte, mots)).map(([code]) => code);
  if (trouves.length) return [...new Set(trouves)].slice(0, 3);
  const parOption = {
    COMMERCIALE_GESTION: ['GESTION'], SCIENTIFIQUE: ['SCIENCES'], PEDAGOGIE: ['EDUCATION'],
    LITTERAIRE: ['COMMUNICATION', 'DROIT'], TECHNIQUE_INDUSTRIELLE: ['INGENIERIE'],
    TECHNIQUE_SOCIALE: ['EDUCATION'], AGRICULTURE: ['AGRICULTURE'],
  };
  return parOption[option?.code] || [];
}

function estDemandeOrientation(question, texteComplet, option, pourcentage) {
  const questionNormalisee = normaliser(question);
  const intention = /\b(orient|orientation|propos|conseill|choisir|choix|etud|universit|filiere|faculte|faire|debouche)\w*/.test(questionNormalisee);
  const profilScolaire = /\b(fini|termine|diplome|exetat|option|humanite|secondaire|pourcent|resultat)\w*/.test(texteComplet);
  return (intention && (option || pourcentage !== null || profilScolaire)) || Boolean(option && pourcentage !== null);
}

function seuilIndicatif(texte) {
  if (contient(texte, ['médecine', 'santé', 'pharmacie', 'ingénierie', 'architecture'])) return 65;
  if (contient(texte, ['science', 'informatique', 'droit', 'finance'])) return 55;
  return 50;
}

async function chargerFormations() {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT fi.code_filiere, fi.nom AS nom_filiere, fi.domaine, fi.niveau_diplome,
            fi.duree_annees, fi.frais_minimum, fi.frais_maximum, fi.devise,
            u.code_universite, u.nom AS nom_universite, u.ville, u.province,
            fa.nom AS nom_faculte
     FROM filieres fi
     JOIN universites u ON u.id = fi.universite_id
     JOIN facultes fa ON fa.id = fi.faculte_id
     WHERE u.statut_verification = 'VERIFIEE'
       AND u.categorie_etablissement <> 'ECOLE_SECONDAIRE'
       AND fi.est_active = 1
     ORDER BY u.nom, fi.nom
     LIMIT 400`,
  );
  return lignes;
}

function classer(formations, option, pourcentage, interets, budget, questionNormalisee) {
  const motsInterets = interets.flatMap((code) => INTERETS.find(([nom]) => nom === code)?.[1] || []);
  const localisationDemandee = formations.find((formation) => {
    const ville = normaliser(formation.ville);
    const province = normaliser(formation.province);
    return (ville.length >= 3 && questionNormalisee.includes(ville))
      || (province.length >= 3 && questionNormalisee.includes(province));
  });
  const classes = formations.map((formation) => {
    const texte = normaliser(`${formation.nom_filiere} ${formation.domaine} ${formation.nom_faculte}`);
    const optionCompatible = contient(texte, option.domaines);
    const interetCompatible = contient(texte, motsInterets);
    if (!optionCompatible && !interetCompatible) return null;
    const seuil = seuilIndicatif(texte);
    let score = 35 + (optionCompatible ? 30 : 0) + (interetCompatible ? 15 : 0);
    const raisons = ['Établissement vérifié sur CampusHub'];
    if (optionCompatible) raisons.push(`Parcours cohérent avec l’option ${option.label}`);
    if (pourcentage >= seuil + 10) { score += 13; raisons.push(`Résultat scolaire solide : ${pourcentage}%`); }
    else if (pourcentage >= seuil) { score += 8; raisons.push(`Résultat compatible à titre indicatif : ${pourcentage}%`); }
    else { score -= Math.min(18, Math.ceil((seuil - pourcentage) / 2)); raisons.push(`Seuil officiel à vérifier auprès de l’établissement`); }
    const frais = formation.frais_minimum === null ? null : Number(formation.frais_minimum);
    if (budget && frais !== null) {
      if (frais <= budget) { score += 7; raisons.push('Frais minimum compatibles avec le budget'); } else score -= 8;
    }
    if (localisationDemandee) {
      if (normaliser(formation.ville) === normaliser(localisationDemandee.ville)) {
        score += 10; raisons.push(`Formation disponible à ${formation.ville}`);
      } else if (normaliser(formation.province) === normaliser(localisationDemandee.province)) {
        score += 6; raisons.push(`Formation disponible dans la province ${formation.province}`);
      } else score -= 5;
    }
    return {
      ...formation,
      frais_minimum: frais,
      frais_maximum: formation.frais_maximum === null ? null : Number(formation.frais_maximum),
      score_compatibilite: Math.max(15, Math.min(98, score)),
      indicateur_dossier: pourcentage >= seuil + 10 ? 'TRÈS FAVORABLE' : pourcentage >= seuil ? 'FAVORABLE' : 'À VÉRIFIER',
      seuil_indicatif: seuil,
      raisons,
    };
  }).filter(Boolean).sort((a, b) => b.score_compatibilite - a.score_compatibilite
    || Number(a.frais_minimum ?? Infinity) - Number(b.frais_minimum ?? Infinity));

  const parUniversite = new Map();
  classes.forEach((item) => {
    if (!parUniversite.has(item.code_universite)) parUniversite.set(item.code_universite, item);
  });
  const distinctes = [...parUniversite.values()];
  return [...distinctes, ...classes.filter((item) => !distinctes.includes(item))].slice(0, 5);
}

function reponseSansPourcentage(option) {
  return [
    `Oui. Avec une option ${option.label}, vous pouvez notamment envisager :`,
    option.pistes.slice(0, 7).map((piste) => `• ${piste}`).join('\n'),
    '',
    'Pour que je classe les universités réellement adaptées, indiquez-moi votre pourcentage obtenu. Vous pouvez aussi préciser votre ville, votre budget et le domaine qui vous attire le plus.',
  ].join('\n');
}

function reponseSecours(option, pourcentage, recommandations) {
  const debut = `Avec une option ${option.label} et ${pourcentage} %, vous pouvez envisager :\n${option.pistes.slice(0, 7).map((piste) => `• ${piste}`).join('\n')}`;
  if (!recommandations.length) return `${debut}\n\nJe ne trouve pas encore de formation supérieure active correspondant à ce profil dans les établissements vérifiés. Consultez l’annuaire ou précisez votre ville et votre budget pour élargir la recherche.`;
  const liste = recommandations.map((item, index) => `${index + 1}. ${item.nom_filiere} — ${item.nom_universite} (${item.score_compatibilite} % de compatibilité)`).join('\n');
  return `${debut}\n\nUniversités et formations à examiner sur CampusHub :\n${liste}\n\nVérifiez toujours les conditions d’admission officielles avant d’envoyer votre candidature.`;
}

export async function essayerOrientationConversationnelle({ question, historique = [] }) {
  const messagesUtilisateur = historique
    .filter((message) => message.role === 'UTILISATEUR')
    .slice(-4)
    .map((message) => message.contenu);
  const texteComplet = normaliser([...messagesUtilisateur, question].join(' '));
  const option = extraireOption(texteComplet);
  const pourcentage = extrairePourcentage(texteComplet);
  if (!estDemandeOrientation(question, texteComplet, option, pourcentage)) return null;

  if (!option) {
    return {
      reponse: 'Je peux vous orienter. Indiquez d’abord votre option des humanités, par exemple Commerciale et gestion, Scientifique, Pédagogie, Littéraire, Technique ou Agriculture, ainsi que votre pourcentage obtenu.',
      modele: modeleCampusHubIA,
      modeExecution: 'ORIENTATION_CONVERSATIONNELLE',
      confiance: 0.96,
      sources: [],
    };
  }
  if (pourcentage === null) {
    return {
      reponse: reponseSansPourcentage(option),
      modele: modeleCampusHubIA,
      modeExecution: 'ORIENTATION_CONVERSATIONNELLE',
      confiance: 0.97,
      sources: [],
    };
  }

  const interets = extraireInterets(texteComplet, option);
  const budget = extraireBudget(texteComplet);
  const recommandations = classer(await chargerFormations(), option, pourcentage, interets, budget, texteComplet);
  const resultatAgent = recommandations.length ? await essayerCampusHubIA({
    task: 'ORIENTATION_FINALISTE',
    message: question,
    audience: 'PUBLIC',
    context: {
      objectif: `Orientation après l’option ${option.label}`,
      profil: { option: option.label, pourcentage, interets },
      pistes: option.pistes,
      recommandations,
    },
  }) : null;
  const sources = recommandations.map((item) => ({
    code: item.code_universite,
    label: item.nom_universite,
    url: `/universites/${item.code_universite}`,
  }));
  return {
    reponse: resultatAgent?.response || reponseSecours(option, pourcentage, recommandations),
    modele: resultatAgent?.model || modeleCampusHubIA,
    modeExecution: resultatAgent ? 'CAMPUSHUB_IA_ORIENTATION' : 'ORIENTATION_CONVERSATIONNELLE',
    confiance: resultatAgent?.confidence ?? 0.96,
    sources: [...new Map(sources.map((source) => [source.code, source])).values()].slice(0, 5),
  };
}
