import crypto from 'node:crypto';
import OpenAI from 'openai';
import { baseDeDonnees } from '../config/base-de-donnees.js';
import { environnement } from '../config/environnement.js';
import { ErreurApi } from '../utils/erreur-api.js';

const modele = environnement.OPENAI_MODEL;
const disponible = Boolean(environnement.OPENAI_API_KEY);
const client = disponible ? new OpenAI({ apiKey: environnement.OPENAI_API_KEY }) : null;

export function configurationCopilote() {
  return {
    disponible,
    modele,
    mode: disponible ? 'GPT_5_6' : 'DEMONSTRATION',
    message: disponible
      ? 'Le copilote institutionnel utilise GPT‑5.6 avec les données de votre fiche.'
      : 'Mode démonstration : ajoutez OPENAI_API_KEY pour activer la rédaction avec GPT‑5.6.',
  };
}

async function contexteInstitution(utilisateurId) {
  const [universites] = await baseDeDonnees.execute(
    `SELECT u.id, u.code_universite, u.nom, u.sigle, u.description, u.ville, u.province, u.pays,
      u.site_web, u.inscriptions_ouvertes, u.date_fin_inscription, u.statut_verification
     FROM membres_universite m JOIN universites u ON u.id = m.universite_id
     WHERE m.utilisateur_id = ? ORDER BY m.est_proprietaire DESC LIMIT 1`,
    [utilisateurId],
  );
  const universite = universites[0];
  if (!universite) throw new ErreurApi(409, 'Créez d’abord votre fiche universitaire pour utiliser le copilote.');

  const [[filieres], [conditions], [services], [campus], [infrastructures]] = await Promise.all([
    baseDeDonnees.execute(
      `SELECT fi.code_filiere, fi.nom, fi.domaine, fi.niveau_diplome, fi.duree_annees,
        fi.frais_minimum, fi.frais_maximum, fi.devise, fa.nom AS faculte
       FROM filieres fi JOIN facultes fa ON fa.id = fi.faculte_id
       WHERE fi.universite_id = ? AND fi.est_active = 1 ORDER BY fi.nom LIMIT 50`, [universite.id],
    ),
    baseDeDonnees.execute(
      'SELECT titre, description, niveau_diplome FROM conditions_admission WHERE universite_id = ? ORDER BY niveau_diplome, titre LIMIT 30', [universite.id],
    ),
    baseDeDonnees.execute(
      'SELECT nom, description FROM services_universitaires WHERE universite_id = ? AND est_disponible = 1 ORDER BY nom LIMIT 30', [universite.id],
    ),
    baseDeDonnees.execute(
      'SELECT nom, ville, province, adresse, est_principal FROM campus WHERE universite_id = ? ORDER BY est_principal DESC, nom LIMIT 20', [universite.id],
    ),
    baseDeDonnees.execute(
      'SELECT nom, categorie, description, quantite FROM infrastructures WHERE universite_id = ? ORDER BY categorie, nom LIMIT 30', [universite.id],
    ),
  ]);
  return { universite, filieres, conditions, services, campus, infrastructures };
}

function selectionnerContexte(contexte, donnees) {
  const filiere = donnees.codeFiliere
    ? contexte.filieres.find((item) => item.code_filiere === donnees.codeFiliere.toUpperCase())
    : null;
  if (donnees.codeFiliere && !filiere) throw new ErreurApi(404, 'La filière choisie n’appartient pas à votre établissement.');
  return { ...contexte, filiereSelectionnee: filiere };
}

function texteDemonstration(contexte, donnees) {
  const nom = contexte.universite.nom;
  if (donnees.type === 'PUBLICATION') {
    return `${nom} — Information aux ${donnees.publicCible}\n\n${donnees.demande}\n\nDécouvrez nos formations et contactez directement notre établissement sur CampusHub pour vérifier les modalités d’inscription.\n\n#CampusHub #Orientation #Études`;
  }
  if (donnees.type === 'PRESENTATION_FILIERE') {
    const filiere = contexte.filiereSelectionnee || contexte.filieres[0];
    if (!filiere) return 'Ajoutez d’abord une filière active afin de produire une présentation fondée sur des informations vérifiables.';
    const frais = filiere.frais_minimum === null ? 'Frais à confirmer' : `Frais à partir de ${filiere.frais_minimum} ${filiere.devise}`;
    return `${filiere.nom}\n\nCette formation de niveau ${filiere.niveau_diplome} proposée par ${nom} développe des compétences dans le domaine ${filiere.domaine}. ${filiere.duree_annees ? `Durée indicative : ${filiere.duree_annees} an(s). ` : ''}${frais}.\n\nLes candidats doivent vérifier les conditions d’admission et les dates auprès de l’établissement.`;
  }
  if (donnees.type === 'ADMISSION') {
    if (!contexte.conditions.length) return 'Aucune condition d’admission n’est encore enregistrée. Commencez par compléter la rubrique Admissions de votre espace.';
    return `Guide d’admission — ${nom}\n\n${contexte.conditions.map((item, index) => `${index + 1}. ${item.titre} : ${item.description}`).join('\n')}\n\nVérifiez que les dates, pièces et frais sont à jour avant publication.`;
  }
  const manquants = [];
  if (!contexte.universite.description) manquants.push('ajouter une description claire');
  if (!contexte.filieres.length) manquants.push('ajouter des filières actives');
  if (!contexte.conditions.length) manquants.push('préciser les conditions d’admission');
  if (!contexte.campus.length) manquants.push('renseigner au moins un campus');
  if (!contexte.services.length) manquants.push('présenter les services disponibles');
  return `Diagnostic de la fiche ${nom}\n\nPoints déjà renseignés : ${contexte.filieres.length} formation(s), ${contexte.campus.length} campus, ${contexte.services.length} service(s) et ${contexte.conditions.length} condition(s) d’admission.\n\nPriorités : ${manquants.length ? manquants.join(' ; ') : 'la fiche contient les rubriques essentielles. Vérifiez maintenant la qualité des textes, photos et dates.'}`;
}

async function genererAvecGPT(utilisateurId, contexte, donnees) {
  const instructions = `Tu es le copilote institutionnel de CampusHub. Tu aides un établissement à mieux présenter des informations académiques, mais tu ne publies jamais à sa place. Utilise uniquement les faits du contexte JSON. N’invente ni accréditation, ni classement, ni taux de réussite, ni prix, ni condition. Signale clairement les données manquantes. Produis un brouillon directement exploitable en français, avec un ton ${donnees.ton.toLowerCase()} adapté aux ${donnees.publicCible}.`;
  const reponse = await client.responses.create({
    model: modele,
    instructions,
    input: `Type de travail : ${donnees.type}\nDemande : ${donnees.demande}\nContexte vérifié : ${JSON.stringify(contexte)}`,
    reasoning: { effort: 'low' },
    text: { verbosity: 'medium' },
    max_output_tokens: 900,
    safety_identifier: crypto.createHash('sha256').update(`campushub-institution:${utilisateurId}`).digest('hex'),
  });
  return reponse.output_text;
}

async function enregistrer(utilisateurId, contexte, donnees, resultat, modeExecution) {
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.execute(
      `INSERT INTO generations_copilote_institution
        (id, code_generation, universite_id, utilisateur_id, type_generation, demande,
         contexte, resultat, modele_ia, mode_execution)
       VALUES (0, '', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [contexte.universite.id, utilisateurId, donnees.type, donnees.demande,
        JSON.stringify(contexte), resultat, modele, modeExecution],
    );
    const [lignes] = await connexion.query(
      'SELECT code_generation, date_creation FROM generations_copilote_institution WHERE id = @campushub_dernier_id',
    );
    return lignes[0];
  } finally { connexion.release(); }
}

export async function obtenirContexteCopilote(utilisateurId) {
  const contexte = await contexteInstitution(utilisateurId);
  return {
    universite: contexte.universite,
    compteurs: {
      filieres: contexte.filieres.length,
      conditions: contexte.conditions.length,
      services: contexte.services.length,
      campus: contexte.campus.length,
      infrastructures: contexte.infrastructures.length,
    },
    filieres: contexte.filieres,
  };
}

export async function genererContenu(utilisateur, donnees) {
  const contexte = selectionnerContexte(await contexteInstitution(utilisateur.id), donnees);
  const modeExecution = disponible ? 'GPT_5_6' : 'DEMONSTRATION';
  const resultat = disponible
    ? await genererAvecGPT(utilisateur.id, contexte, donnees)
    : texteDemonstration(contexte, donnees);
  const generation = await enregistrer(utilisateur.id, contexte, donnees, resultat, modeExecution);
  return { ...generation, resultat, modeExecution, modele, type: donnees.type };
}

export async function listerGenerations(utilisateurId) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT g.code_generation, g.type_generation, g.demande, g.resultat, g.modele_ia,
      g.mode_execution, g.date_creation
     FROM generations_copilote_institution g
     JOIN membres_universite m ON m.universite_id = g.universite_id
     WHERE m.utilisateur_id = ? ORDER BY g.date_creation DESC LIMIT 20`,
    [utilisateurId],
  );
  return lignes;
}
