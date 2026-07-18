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
