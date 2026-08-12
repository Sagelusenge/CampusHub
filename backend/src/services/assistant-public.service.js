import { baseDeDonnees } from '../config/base-de-donnees.js';
import { essayerCampusHubIA, modeleCampusHubIA } from './campushub-ia.service.js';
import { rechercherConnaissancesWeb } from './connaissances-web.service.js';
import { essayerOrientationConversationnelle } from './orientation-conversationnelle.service.js';

const motsVides = new Set([
  'avec', 'avoir', 'cela', 'cette', 'comment', 'dans', 'des', 'elle', 'est', 'faire',
  'les', 'mais', 'nous', 'pour', 'que', 'quel', 'quelle', 'quels', 'quelles', 'sur',
  'une', 'vous', 'votre', 'universite', 'universites', 'etablissement', 'etablissements',
  'ecole', 'ecoles', 'institut', 'instituts', 'campushub',
]);

const vocabulaireDomaine = [
  'admission', 'campus', 'candidature', 'ecole', 'etablissement', 'etablissements',
  'etudiant', 'etudiants', 'faculte', 'filiere', 'filieres', 'formation', 'formations',
  'inscription', 'institut', 'orientation', 'partenaire', 'province', 'universite', 'universites',
];

function normaliser(texte = '') {
  return String(texte).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function distanceEdition(a, b) {
  const ligne = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let precedent = ligne[0];
    ligne[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const ancienne = ligne[j];
      ligne[j] = Math.min(ligne[j] + 1, ligne[j - 1] + 1, precedent + (a[i - 1] === b[j - 1] ? 0 : 1));
      precedent = ancienne;
    }
  }
  return ligne[b.length];
}

function corrigerMot(mot) {
  const compact = mot.replace(/(.)\1{2,}/g, '$1$1');
  if (compact.length < 5 || vocabulaireDomaine.includes(compact)) return compact;
  let meilleur = compact;
  let score = 0;
  for (const candidat of vocabulaireDomaine) {
    const similarite = 1 - (distanceEdition(compact, candidat) / Math.max(compact.length, candidat.length));
    if (similarite > score) { meilleur = candidat; score = similarite; }
  }
  return score >= 0.76 ? meilleur : compact;
}

function extraireMots(question) {
  return [...new Set(normaliser(question).split(/[^a-z0-9]+/)
    .map(corrigerMot)
    .filter((mot) => mot.length >= 3 && !motsVides.has(mot)))].slice(0, 6);
}

function estConversationCourte(question) {
  const texte = normaliser(question).replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return /^(bonjour|bonsoir|salut|hello|hey|merci|merci beaucoup|au revoir|bye|ok|okay|d'accord|super|parfait)$/.test(texte)
    || /\b(ca va|comment vas tu|comment allez vous|tu vas bien|qui es tu|quel est ton nom|je m'appelle)\b/.test(texte);
}

async function chercherContextePublic(question) {
  const mots = extraireMots(question);
  const filtre = mots.length
    ? `AND (${mots.map(() => "LOWER(CONCAT_WS(' ', nom, sigle, ville, province, categorie_etablissement)) LIKE ?").join(' OR ')})`
    : '';
  const valeurs = mots.map((mot) => `%${mot}%`);
  const [universites] = await baseDeDonnees.execute(
    `SELECT code_universite, nom, sigle, categorie_etablissement, ville, province, pays,
      inscriptions_ouvertes, date_fin_inscription, nombre_campus, nombre_filieres,
      frais_minimum, frais_maximum
     FROM vue_universites_resume
     WHERE statut_verification = 'VERIFIEE' ${filtre}
     ORDER BY nombre_filieres DESC, nom
     LIMIT 6`,
    valeurs,
  );

  const filtreFormations = mots.length
    ? `AND (${mots.map(() => "LOWER(CONCAT_WS(' ', nom_filiere, domaine, nom_faculte, nom_universite, ville, province)) LIKE ?").join(' OR ')})`
    : '';
  const [formations] = await baseDeDonnees.execute(
    `SELECT code_filiere, nom_filiere, domaine, niveau_diplome, duree_annees,
      frais_minimum, frais_maximum, devise, code_universite, nom_universite, ville, province
     FROM vue_catalogue_filieres
     WHERE statut_verification = 'VERIFIEE' AND est_active = 1 ${filtreFormations}
     ORDER BY frais_minimum IS NULL, frais_minimum, nom_universite
     LIMIT 8`,
    valeurs,
  );

  const documents = [
    ...universites.map((item) => [
      `${item.nom} (${item.code_universite}) est un établissement vérifié`,
      `catégorie ${item.categorie_etablissement}`,
      `localisation ${[item.ville, item.province, item.pays].filter(Boolean).join(', ')}`,
      `${item.nombre_campus} campus et ${item.nombre_filieres} formation(s)`,
      item.frais_minimum === null ? 'frais à confirmer' : `frais à partir de ${item.frais_minimum} USD`,
      item.inscriptions_ouvertes ? 'inscriptions ouvertes' : 'inscriptions non signalées comme ouvertes',
    ].join(' ; ')),
    ...formations.map((item) => [
      `${item.nom_filiere} (${item.code_filiere})`,
      `domaine ${item.domaine}`,
      `niveau ${item.niveau_diplome}`,
      `proposée par ${item.nom_universite} à ${item.ville}, ${item.province}`,
      item.frais_minimum === null ? 'frais à confirmer' : `frais à partir de ${item.frais_minimum} ${item.devise}`,
    ].join(' ; ')),
  ];
  const sources = [...new Map([...universites, ...formations.map((item) => ({
    code_universite: item.code_universite,
    nom: item.nom_universite,
  }))].map((item) => [item.code_universite, {
    code: item.code_universite,
    label: item.nom,
    url: `/universites/${item.code_universite}`,
  }])).values()];
  return { documents, sources };
}

export async function poserQuestionPublique({ question, historique }) {
  const historiqueRecent = (historique || []).slice(-6);
  const orientation = await essayerOrientationConversationnelle({ question, historique: historiqueRecent });
  if (orientation) return orientation;
  const precedenteQuestion = [...historiqueRecent].reverse().find((message) => message.role === 'UTILISATEUR')?.contenu;
  const questionRecherche = extraireMots(question).length <= 2 && precedenteQuestion
    ? `${precedenteQuestion} ${question}` : question;
  const contexteCampusHub = estConversationCourte(question)
    ? { documents: [], sources: [] }
    : await chercherContextePublic(questionRecherche);

  let resultat = await essayerCampusHubIA({
    task: 'GENERAL',
    message: question,
    audience: 'PUBLIC',
    context: { documents: contexteCampusHub.documents, historique: historiqueRecent },
  });

  let sources = resultat?.source === 'live_context' ? contexteCampusHub.sources : [];
  let modeExecution = resultat ? 'CAMPUSHUB_IA' : 'MOTEUR_REGLES';
  const rechercheWebNecessaire = !estConversationCourte(question)
    && resultat
    && (resultat.source === 'fallback'
      || (resultat.source === 'knowledge_base' && Number(resultat.confidence || 0) < 0.35));

  if (rechercheWebNecessaire) {
    const contexteWeb = await rechercherConnaissancesWeb(question);
    if (contexteWeb.documents.length) {
      const resultatWeb = await essayerCampusHubIA({
        task: 'GENERAL',
        message: question,
        audience: 'PUBLIC',
        context: {
          documents: [...contexteCampusHub.documents, ...contexteWeb.documents],
          historique: historiqueRecent,
        },
      });
      if (resultatWeb && resultatWeb.source !== 'fallback') {
        resultat = resultatWeb;
        sources = resultatWeb.source === 'live_context'
          ? [...contexteWeb.sources, ...contexteCampusHub.sources].slice(0, 4)
          : [];
        modeExecution = 'CAMPUSHUB_IA_WEB';
      }
    }
  }

  return {
    reponse: resultat?.response || 'CampusHubIA redémarre actuellement. Vous pouvez consulter les établissements vérifiés, les offres ou la FAQ, puis réessayer dans un instant.',
    modele: resultat?.model || modeleCampusHubIA,
    modeExecution,
    confiance: resultat?.confidence ?? 0,
    sources: sources.slice(0, 4),
  };
}
