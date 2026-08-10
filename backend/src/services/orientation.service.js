import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import { baseDeDonnees } from '../config/base-de-donnees.js';
import { environnement } from '../config/environnement.js';
import { ErreurApi } from '../utils/erreur-api.js';

const modele = environnement.OPENAI_MODEL;
const openaiDisponible = Boolean(environnement.OPENAI_API_KEY);
const client = openaiDisponible ? new OpenAI({ apiKey: environnement.OPENAI_API_KEY }) : null;
const dossierImages = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads/images');

const outils = [
  {
    type: 'function',
    name: 'rechercher_formations',
    description: 'Recherche uniquement les formations vérifiées présentes dans la base CampusHub selon le domaine, le budget, le niveau et la localisation.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        domaine: { type: ['string', 'null'], description: 'Domaine ou métier recherché.' },
        budget_max: { type: ['number', 'null'], description: 'Budget annuel maximal.' },
        niveau: { type: ['string', 'null'], enum: ['CERTIFICAT', 'LICENCE', 'MASTER', 'DOCTORAT', 'AUTRE', null] },
        ville: { type: ['string', 'null'] },
        province: { type: ['string', 'null'] },
      },
      required: ['domaine', 'budget_max', 'niveau', 'ville', 'province'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'obtenir_conditions_admission',
    description: 'Retourne les conditions d’admission enregistrées pour un établissement CampusHub.',
    strict: true,
    parameters: {
      type: 'object',
      properties: { code_universite: { type: 'string' } },
      required: ['code_universite'],
      additionalProperties: false,
    },
  },
];

export function configurationOrientation() {
  return {
    disponible: openaiDisponible,
    modele,
    mode: openaiDisponible ? 'GPT_5_6' : 'DEMONSTRATION',
    message: openaiDisponible
      ? 'CampusHub AI est connecté à GPT-5.6.'
      : 'Ajoutez OPENAI_API_KEY dans backend/.env pour activer GPT-5.6. Le moteur vérifiable MySQL reste disponible.',
  };
}

const optionsFinaliste = {
  SCIENTIFIQUE: {
    label: 'Scientifique',
    domaines: ['informatique', 'science', 'médecine', 'santé', 'ingénierie', 'agronomie', 'architecture', 'mathématique', 'biologie', 'chimie'],
  },
  COMMERCIALE_GESTION: {
    label: 'Commerciale et gestion',
    domaines: ['gestion', 'commerce', 'économie', 'comptabilité', 'finance', 'marketing', 'droit', 'informatique de gestion'],
  },
  PEDAGOGIE: {
    label: 'Pédagogie générale',
    domaines: ['éducation', 'pédagogie', 'psychologie', 'lettres', 'langue', 'sciences sociales'],
  },
  LITTERAIRE: {
    label: 'Littéraire et humanités',
    domaines: ['droit', 'communication', 'journalisme', 'lettres', 'langue', 'histoire', 'sciences politiques', 'relations internationales'],
  },
  TECHNIQUE_INDUSTRIELLE: {
    label: 'Technique industrielle',
    domaines: ['ingénierie', 'électricité', 'électronique', 'mécanique', 'construction', 'informatique', 'réseau', 'télécommunication'],
  },
  TECHNIQUE_SOCIALE: {
    label: 'Technique sociale',
    domaines: ['santé', 'soins', 'nutrition', 'développement', 'psychologie', 'sciences sociales', 'éducation'],
  },
  AGRICULTURE: {
    label: 'Agriculture',
    domaines: ['agronomie', 'agriculture', 'environnement', 'vétérinaire', 'biologie', 'développement rural'],
  },
  AUTRE: {
    label: 'Autre option',
    domaines: [],
  },
};

const interetsFinaliste = {
  INFORMATIQUE: ['informatique', 'logiciel', 'réseau', 'numérique', 'télécommunication', 'data'],
  SANTE: ['santé', 'médecine', 'soins', 'pharmacie', 'nutrition', 'biologie'],
  INGENIERIE: ['ingénierie', 'électricité', 'électronique', 'mécanique', 'construction', 'architecture'],
  GESTION: ['gestion', 'commerce', 'économie', 'comptabilité', 'finance', 'marketing'],
  DROIT: ['droit', 'politique', 'relations internationales', 'administration'],
  EDUCATION: ['éducation', 'pédagogie', 'enseignement', 'psychologie'],
  AGRICULTURE: ['agronomie', 'agriculture', 'environnement', 'vétérinaire', 'développement rural'],
  COMMUNICATION: ['communication', 'journalisme', 'langue', 'lettres'],
  SCIENCES: ['science', 'mathématique', 'physique', 'chimie', 'biologie'],
  ARTS: ['art', 'design', 'architecture', 'culture'],
};

export function configurationFinaliste() {
  return {
    options: Object.entries(optionsFinaliste).map(([code, valeur]) => ({ code, label: valeur.label })),
    interets: [
      ['INFORMATIQUE', 'Informatique et numérique'], ['SANTE', 'Santé'],
      ['INGENIERIE', 'Ingénierie et techniques'], ['GESTION', 'Gestion et commerce'],
      ['DROIT', 'Droit et administration'], ['EDUCATION', 'Éducation'],
      ['AGRICULTURE', 'Agriculture et environnement'], ['COMMUNICATION', 'Communication'],
      ['SCIENCES', 'Sciences'], ['ARTS', 'Arts et création'],
    ].map(([code, label]) => ({ code, label })),
    avertissement: 'Le score mesure une compatibilité de parcours. Il ne garantit jamais l’admission, qui dépend des conditions officielles de chaque établissement.',
  };
}

function normaliserFinaliste(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function contientMotFinaliste(texte, mots) {
  const valeur = normaliserFinaliste(texte);
  return mots.some((mot) => valeur.includes(normaliserFinaliste(mot)));
}

function seuilIndicatifFinaliste(texte) {
  if (contientMotFinaliste(texte, ['médecine', 'santé', 'pharmacie', 'ingénierie', 'architecture'])) return 65;
  if (contientMotFinaliste(texte, ['science', 'informatique', 'droit', 'finance'])) return 55;
  return 50;
}

async function formationsPourFinaliste() {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT fi.code_filiere, fi.nom AS nom_filiere, fi.domaine, fi.niveau_diplome,
            fi.duree_annees, fi.frais_minimum, fi.frais_maximum, fi.devise,
            u.code_universite, u.nom AS nom_universite, u.sigle, u.ville, u.province,
            u.url_logo, u.inscriptions_ouvertes, u.categorie_etablissement,
            fa.nom AS nom_faculte
     FROM filieres fi
     JOIN universites u ON u.id = fi.universite_id
     JOIN facultes fa ON fa.id = fi.faculte_id
     WHERE u.statut_verification = 'VERIFIEE'
       AND u.categorie_etablissement <> 'ECOLE_SECONDAIRE'
       AND fi.est_active = 1
       AND fi.niveau_diplome IN ('CERTIFICAT', 'LICENCE', 'AUTRE')
     ORDER BY u.nom, fi.nom
     LIMIT 300`,
  );
  return lignes.map((ligne) => ({
    ...ligne,
    frais_minimum: ligne.frais_minimum === null ? null : Number(ligne.frais_minimum),
    frais_maximum: ligne.frais_maximum === null ? null : Number(ligne.frais_maximum),
  }));
}

function classerPourFinaliste(candidats, profil) {
  const option = optionsFinaliste[profil.optionSecondaire];
  const motsInterets = profil.interets.flatMap((interet) => interetsFinaliste[interet] || []);
  return candidats.map((candidat) => {
    const texte = `${candidat.nom_filiere} ${candidat.domaine} ${candidat.nom_faculte}`;
    const raisons = ['Établissement vérifié sur CampusHub'];
    let score = 28;
    const optionCompatible = contientMotFinaliste(texte, option.domaines);
    const interetsCompatibles = profil.interets.filter((interet) => contientMotFinaliste(texte, interetsFinaliste[interet] || []));
    if (optionCompatible) { score += 30; raisons.push(`Parcours cohérent avec l’option ${option.label}`); }
    else if (profil.optionSecondaire === 'AUTRE') { score += 10; raisons.push('Compatibilité basée sur les centres d’intérêt'); }
    else { score -= 5; }
    if (interetsCompatibles.length) {
      score += Math.min(22, 11 * interetsCompatibles.length);
      raisons.push(`${interetsCompatibles.length} centre(s) d’intérêt correspondant(s)`);
    }
    const seuil = seuilIndicatifFinaliste(texte);
    let indicateurDossier = 'À VÉRIFIER';
    if (profil.pourcentage >= seuil + 10) {
      score += 13; indicateurDossier = 'TRÈS FAVORABLE'; raisons.push(`Résultat scolaire solide : ${profil.pourcentage}%`);
    } else if (profil.pourcentage >= seuil) {
      score += 8; indicateurDossier = 'FAVORABLE'; raisons.push(`Pourcentage compatible à titre indicatif : ${profil.pourcentage}%`);
    } else {
      score -= Math.min(18, Math.ceil((seuil - profil.pourcentage) / 2));
      raisons.push(`Vérifier le seuil officiel de l’établissement`);
    }
    if (profil.budgetMax && candidat.frais_minimum !== null) {
      if (candidat.frais_minimum <= profil.budgetMax) { score += 7; raisons.push('Frais minimum compatibles avec le budget'); }
      else { score -= 8; }
    }
    if (profil.ville && normaliserFinaliste(candidat.ville) === normaliserFinaliste(profil.ville)) {
      score += 7; raisons.push('Formation disponible dans votre ville');
    } else if (profil.province && normaliserFinaliste(candidat.province) === normaliserFinaliste(profil.province)) {
      score += 5; raisons.push('Formation disponible dans votre province');
    } else if (!profil.mobilite && (profil.ville || profil.province)) score -= 10;
    return {
      ...candidat,
      score_compatibilite: Math.max(15, Math.min(98, score)),
      indicateur_dossier: indicateurDossier,
      seuil_indicatif: seuil,
      option_compatible: optionCompatible,
      interets_compatibles: interetsCompatibles,
      raisons,
    };
  }).filter((item) => item.option_compatible || item.interets_compatibles.length)
    .sort((a, b) => b.score_compatibilite - a.score_compatibilite || Number(a.frais_minimum ?? Infinity) - Number(b.frais_minimum ?? Infinity))
    .slice(0, 10);
}

export async function orienterFinaliste(utilisateur, profil) {
  const candidats = await formationsPourFinaliste();
  const recommandations = classerPourFinaliste(candidats, profil);
  const option = optionsFinaliste[profil.optionSecondaire];
  const texte = recommandations.length
    ? `À partir de votre option ${option.label}, de votre résultat de ${profil.pourcentage}% et de vos centres d’intérêt, CampusHub a classé ${recommandations.length} formation(s) vérifiée(s). Commencez par comparer les trois premiers résultats, puis consultez les conditions d’admission officielles.`
    : 'Aucune formation ne correspond suffisamment à ce profil dans les données actuelles. Essayez un autre centre d’intérêt, augmentez la mobilité ou consultez directement l’annuaire.';
  const donneesDossier = {
    objectif: `Orientation finaliste — ${option.label} — ${profil.pourcentage}%`,
    criteres: { ...profil, moteur: 'FINALISTE_V1' },
    bulletinUrl: null,
    analyseBulletin: null,
  };
  const dossier = await enregistrerDossier(utilisateur.id, donneesDossier, { recommandations, texte }, 'DEMONSTRATION');
  return {
    codeDossier: dossier.code_dossier,
    moteur: 'FINALISTE_V1',
    profil: { option: option.label, pourcentage: profil.pourcentage, interets: profil.interets },
    recommandations,
    texte,
    avertissement: configurationFinaliste().avertissement,
  };
}

export async function rechercherFormations(filtres = {}) {
  const conditions = ["u.statut_verification = 'VERIFIEE'", 'fi.est_active = 1'];
  const valeurs = [];
  if (filtres.domaine) {
    conditions.push('LOWER(CONCAT_WS(\' \', fi.nom, fi.domaine, fa.nom, fi.description)) LIKE ?');
    valeurs.push(`%${String(filtres.domaine).toLowerCase()}%`);
  }
  if (filtres.budget_max) {
    conditions.push('(fi.frais_minimum IS NULL OR fi.frais_minimum <= ?)');
    valeurs.push(Number(filtres.budget_max));
  }
  if (filtres.niveau) { conditions.push('fi.niveau_diplome = ?'); valeurs.push(filtres.niveau); }
  if (filtres.ville) { conditions.push('(u.ville = ? OR EXISTS (SELECT 1 FROM campus cx WHERE cx.universite_id = u.id AND cx.ville = ?))'); valeurs.push(filtres.ville, filtres.ville); }
  if (filtres.province) { conditions.push('u.province = ?'); valeurs.push(filtres.province); }
  const [lignes] = await baseDeDonnees.execute(
    `SELECT fi.code_filiere, fi.nom AS nom_filiere, fi.domaine, fi.niveau_diplome,
      fi.duree_annees, fi.frais_minimum, fi.frais_maximum, fi.devise,
      u.code_universite, u.nom AS nom_universite, u.ville, u.province, u.pays,
      u.inscriptions_ouvertes, u.date_fin_inscription, u.url_logo,
      fa.nom AS nom_faculte,
      (SELECT GROUP_CONCAT(DISTINCT c.nom ORDER BY c.nom SEPARATOR ', ')
       FROM campus_filieres cf JOIN campus c ON c.id = cf.campus_id WHERE cf.filiere_id = fi.id) AS campus
     FROM filieres fi
     JOIN universites u ON u.id = fi.universite_id
     JOIN facultes fa ON fa.id = fi.faculte_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY u.statut_verification DESC, fi.frais_minimum IS NULL, fi.frais_minimum, u.nom
     LIMIT 20`, valeurs,
  );
  return lignes.map((ligne) => ({ ...ligne, frais_minimum: ligne.frais_minimum === null ? null : Number(ligne.frais_minimum), frais_maximum: ligne.frais_maximum === null ? null : Number(ligne.frais_maximum) }));
}

async function obtenirConditions(codeUniversite) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT ca.code_condition, ca.titre, ca.description, ca.niveau_diplome
     FROM conditions_admission ca JOIN universites u ON u.id = ca.universite_id
     WHERE u.code_universite = ? ORDER BY ca.niveau_diplome, ca.titre`,
    [String(codeUniversite).toUpperCase()],
  );
  return lignes;
}

function classer(candidats, criteres) {
  const domaines = (criteres.domaines || []).map((item) => item.toLowerCase());
  return candidats.map((candidat) => {
    let score = 55;
    const raisons = ['Établissement vérifié par CampusHub'];
    const texte = `${candidat.nom_filiere} ${candidat.domaine} ${candidat.nom_faculte}`.toLowerCase();
    if (domaines.some((domaine) => texte.includes(domaine))) { score += 20; raisons.push('Correspond à votre domaine'); }
    if (criteres.budgetMax && candidat.frais_minimum !== null && candidat.frais_minimum <= criteres.budgetMax) { score += 12; raisons.push('Compatible avec votre budget'); }
    if (criteres.ville && candidat.ville?.toLowerCase() === criteres.ville.toLowerCase()) { score += 8; raisons.push('Disponible dans votre ville'); }
    if (criteres.province && candidat.province?.toLowerCase() === criteres.province.toLowerCase()) { score += 5; raisons.push('Disponible dans votre province'); }
    return { ...candidat, score_compatibilite: Math.min(98, score), raisons };
  }).sort((a, b) => b.score_compatibilite - a.score_compatibilite).slice(0, 3);
}

function construireFiltres(criteres) {
  return {
    domaine: criteres.domaines?.[0] || null,
    budget_max: criteres.budgetMax ?? null,
    niveau: criteres.niveau ?? null,
    ville: criteres.mobilite ? null : criteres.ville ?? null,
    province: criteres.mobilite ? null : criteres.province ?? null,
  };
}

function fusionnerCandidats(groupes) {
  const uniques = new Map();
  groupes.flat().forEach((candidat) => uniques.set(candidat.code_filiere, candidat));
  return [...uniques.values()];
}

async function rechercherPourCriteres(criteres) {
  const domaines = criteres.domaines?.length ? criteres.domaines : [null];
  const filtresCommuns = construireFiltres(criteres);
  const groupes = await Promise.all(domaines.map((domaine) => rechercherFormations({ ...filtresCommuns, domaine })));
  return fusionnerCandidats(groupes);
}

function reponseDemonstration(recommandations, donnees) {
  if (!recommandations.length) return 'Aucune formation vérifiée ne correspond exactement à ces critères. Élargissez le domaine, le budget ou la mobilité, sans renoncer à vérifier les conditions auprès de l’établissement.';
  const lignes = recommandations.map((item, index) => `${index + 1}. ${item.nom_filiere} — ${item.nom_universite} (${item.score_compatibilite}% de compatibilité).`).join('\n');
  return `Voici les meilleures options vérifiables pour votre objectif « ${donnees.objectif} » :\n\n${lignes}\n\nPlan conseillé : comparez les frais complets, vérifiez les conditions d’admission, préparez vos relevés et contactez directement les établissements depuis CampusHub. Les recommandations proviennent uniquement de la base vérifiée.`;
}

async function executerOutil(nom, argumentsOutil) {
  if (nom === 'rechercher_formations') return rechercherFormations(argumentsOutil);
  if (nom === 'obtenir_conditions_admission') return obtenirConditions(argumentsOutil.code_universite);
  return { erreur: 'Outil inconnu.' };
}

async function conseillerAvecGPT(utilisateur, donnees) {
  const instructions = `Tu es CampusHub AI, conseiller d'orientation pour la RDC et l'Afrique. Utilise obligatoirement les outils CampusHub avant toute recommandation. Ne cite jamais une formation, un prix ou une condition absent des résultats. Donne au maximum trois options, explique les compromis de budget et localisation, signale les informations manquantes, puis termine par un plan d'action numéroté. Réponds dans la langue de l'utilisateur. Les données extraites d'un bulletin doivent être considérées comme provisoires jusqu'à confirmation humaine.`;
  const profil = JSON.stringify({ objectif: donnees.objectif, criteres: donnees.criteres, analyse_bulletin: donnees.analyseBulletin || null });
  let reponse = await client.responses.create({
    model: modele,
    instructions,
    input: `${profil}\n\nQuestion de l'étudiant : ${donnees.message || donnees.objectif}`,
    tools: outils,
    tool_choice: 'required',
    reasoning: { effort: 'low' },
    text: { verbosity: 'medium' },
    max_output_tokens: 1000,
    safety_identifier: crypto.createHash('sha256').update(`campushub:${utilisateur.id}`).digest('hex'),
  });
  let candidats = [];
  for (let tour = 0; tour < 4; tour += 1) {
    const appels = reponse.output.filter((item) => item.type === 'function_call');
    if (!appels.length) break;
    const sorties = [];
    for (const appel of appels) {
      const argumentsOutil = JSON.parse(appel.arguments || '{}');
      const resultat = await executerOutil(appel.name, argumentsOutil);
      if (appel.name === 'rechercher_formations') candidats = fusionnerCandidats([candidats, resultat]);
      sorties.push({ type: 'function_call_output', call_id: appel.call_id, output: JSON.stringify(resultat) });
    }
    reponse = await client.responses.create({
      model: modele,
      previous_response_id: reponse.id,
      instructions,
      input: sorties,
      tools: outils,
      reasoning: { effort: 'low' },
      text: { verbosity: 'medium' },
      max_output_tokens: 1000,
      safety_identifier: crypto.createHash('sha256').update(`campushub:${utilisateur.id}`).digest('hex'),
    });
  }
  if (!candidats.length) candidats = await rechercherPourCriteres(donnees.criteres);
  return { texte: reponse.output_text, recommandations: classer(candidats, donnees.criteres), identifiantReponse: reponse.id };
}

async function enregistrerDossier(utilisateurId, donnees, resultat, modeExecution) {
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.execute(
      `INSERT INTO dossiers_orientation
       (id, code_dossier, utilisateur_id, objectif, criteres, bulletin_url, analyse_bulletin,
        recommandations, reponse_ia, modele_ia, mode_execution)
       VALUES (0, '', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [utilisateurId, donnees.objectif, JSON.stringify(donnees.criteres), donnees.bulletinUrl ?? null,
        donnees.analyseBulletin ? JSON.stringify(donnees.analyseBulletin) : null,
        JSON.stringify(resultat.recommandations), resultat.texte, modele, modeExecution],
    );
    const [lignes] = await connexion.query('SELECT * FROM dossiers_orientation WHERE id = @campushub_dernier_id');
    return lignes[0];
  } finally { connexion.release(); }
}

export async function orienter(utilisateur, donnees) {
  let resultat;
  let modeExecution = 'DEMONSTRATION';
  if (openaiDisponible) {
    resultat = await conseillerAvecGPT(utilisateur, donnees);
    modeExecution = 'GPT_5_6';
  } else {
    const candidats = await rechercherPourCriteres(donnees.criteres);
    const recommandations = classer(candidats, donnees.criteres);
    resultat = { texte: reponseDemonstration(recommandations, donnees), recommandations };
  }
  const dossier = await enregistrerDossier(utilisateur.id, donnees, resultat, modeExecution);
  return { codeDossier: dossier.code_dossier, modeExecution, modele, ...resultat };
}

export async function listerDossiers(utilisateurId) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT code_dossier, objectif, criteres, bulletin_url, analyse_bulletin, recommandations,
      reponse_ia, modele_ia, mode_execution, date_creation
     FROM dossiers_orientation WHERE utilisateur_id = ? ORDER BY date_creation DESC LIMIT 20`, [utilisateurId],
  );
  return lignes;
}

export async function obtenirDossier(code, utilisateur) {
  const [lignes] = await baseDeDonnees.execute(
    'SELECT * FROM dossiers_orientation WHERE code_dossier = ? AND (utilisateur_id = ? OR ? = \'ADMINISTRATEUR\') LIMIT 1',
    [code.toUpperCase(), utilisateur.id, utilisateur.role],
  );
  if (!lignes[0]) throw new ErreurApi(404, 'Dossier d’orientation introuvable.');
  return lignes[0];
}

function extraireJson(texte) {
  const nettoye = texte.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  try { return JSON.parse(nettoye); } catch { return { matieres: [], moyenne_estimee: null, avertissement: 'Extraction à confirmer manuellement.', texte_brut: texte }; }
}

export async function analyserBulletin(urlImage) {
  if (!openaiDisponible) return { disponible: false, modeExecution: 'DEMONSTRATION', analyse: null, message: 'OPENAI_API_KEY est nécessaire pour analyser le bulletin avec GPT-5.6.' };
  const url = new URL(urlImage);
  if (!url.pathname.startsWith('/uploads/images/')) throw new ErreurApi(400, 'Le bulletin doit être une image téléversée sur CampusHub.');
  const nomFichier = path.basename(url.pathname);
  const chemin = path.join(dossierImages, nomFichier);
  const extension = path.extname(nomFichier).toLowerCase();
  const typeMime = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
  let contenu;
  try { contenu = await fs.readFile(chemin, 'base64'); } catch { throw new ErreurApi(404, 'Image du bulletin introuvable.'); }
  const reponse = await client.responses.create({
    model: modele,
    instructions: 'Extrais uniquement les informations lisibles du bulletin. N’invente aucune note. Retourne exclusivement un objet JSON avec les clés matieres (tableau de {nom,note,max}), moyenne_estimee, niveau_detecte, points_forts (tableau), champs_incertains (tableau), avertissement.',
    input: [{ role: 'user', content: [{ type: 'input_text', text: 'Analyse ce bulletin scolaire pour préparer une orientation. Les résultats seront confirmés par l’étudiant.' }, { type: 'input_image', image_url: `data:${typeMime};base64,${contenu}`, detail: 'original' }] }],
    reasoning: { effort: 'low' },
    max_output_tokens: 700,
  });
  return { disponible: true, modeExecution: 'GPT_5_6', modele, analyse: extraireJson(reponse.output_text) };
}
