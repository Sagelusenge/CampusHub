import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { essayerCampusHubIA, modeleCampusHubIA, verifierCampusHubIA } from './campushub-ia.service.js';

const modele = modeleCampusHubIA;

export async function configurationOrientation() {
  const etat = await verifierCampusHubIA();
  return {
    disponible: etat.disponible,
    modele,
    mode: etat.disponible ? 'CAMPUSHUB_IA' : 'MOTEUR_REGLES',
    message: etat.disponible
      ? 'CampusHubIA local est connecté aux données vérifiées de la plateforme.'
      : 'CampusHubIA redémarre. Le moteur de règles MySQL reste disponible.',
    capacites: { orientation: true, donnees_temps_reel: true, analyse_bulletin: false },
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
  const texteRegles = recommandations.length
    ? `À partir de votre option ${option.label}, de votre résultat de ${profil.pourcentage}% et de vos centres d’intérêt, CampusHub a classé ${recommandations.length} formation(s) vérifiée(s). Commencez par comparer les trois premiers résultats, puis consultez les conditions d’admission officielles.`
    : 'Aucune formation ne correspond suffisamment à ce profil dans les données actuelles. Essayez un autre centre d’intérêt, augmentez la mobilité ou consultez directement l’annuaire.';
  const reponseAgent = await essayerCampusHubIA({
    task: 'ORIENTATION_FINALISTE',
    message: `Oriente ce finaliste issu de l’option ${option.label}.`,
    audience: utilisateur.role,
    context: {
      objectif: `Orientation finaliste — ${option.label}`,
      profil: { option: option.label, pourcentage: profil.pourcentage, interets: profil.interets },
      recommandations,
    },
  });
  const texte = reponseAgent?.response || texteRegles;
  const modeExecution = reponseAgent ? 'CAMPUSHUB_IA' : 'MOTEUR_REGLES';
  const donneesDossier = {
    objectif: `Orientation finaliste — ${option.label} — ${profil.pourcentage}%`,
    criteres: { ...profil, moteur: 'FINALISTE_V1' },
    bulletinUrl: null,
    analyseBulletin: null,
  };
  const dossier = await enregistrerDossier(utilisateur.id, donneesDossier, { recommandations, texte }, modeExecution);
  return {
    codeDossier: dossier.code_dossier,
    moteur: reponseAgent?.model || 'FINALISTE_V1',
    modeExecution,
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

function reponseRegles(recommandations, donnees) {
  if (!recommandations.length) return 'Aucune formation vérifiée ne correspond exactement à ces critères. Élargissez le domaine, le budget ou la mobilité, sans renoncer à vérifier les conditions auprès de l’établissement.';
  const lignes = recommandations.map((item, index) => `${index + 1}. ${item.nom_filiere} — ${item.nom_universite} (${item.score_compatibilite}% de compatibilité).`).join('\n');
  return `Voici les meilleures options vérifiables pour votre objectif « ${donnees.objectif} » :\n\n${lignes}\n\nPlan conseillé : comparez les frais complets, vérifiez les conditions d’admission, préparez vos relevés et contactez directement les établissements depuis CampusHub. Les recommandations proviennent uniquement de la base vérifiée.`;
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
  const candidats = await rechercherPourCriteres(donnees.criteres);
  const recommandations = classer(candidats, donnees.criteres);
  const reponseAgent = await essayerCampusHubIA({
    task: 'ORIENTATION',
    message: donnees.message || donnees.objectif,
    audience: utilisateur.role,
    context: { objectif: donnees.objectif, criteres: donnees.criteres, recommandations },
  });
  const modeExecution = reponseAgent ? 'CAMPUSHUB_IA' : 'MOTEUR_REGLES';
  const resultat = {
    texte: reponseAgent?.response || reponseRegles(recommandations, donnees),
    recommandations,
    sources: reponseAgent?.sources || recommandations.map((item) => ({ code: item.code_filiere, label: item.nom_filiere })),
  };
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

export async function analyserBulletin() {
  return {
    disponible: false,
    modeExecution: 'MOTEUR_REGLES',
    modele,
    analyse: null,
    message: 'La lecture locale des bulletins n’est pas encore activée. Saisissez vos résultats dans le formulaire d’orientation.',
  };
}
