import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { baseDeDonnees } from '../config/base-de-donnees.js';
import { environnement } from '../config/environnement.js';
import { ErreurApi } from '../utils/erreur-api.js';
import {
  enregistrerDerniereConnexion,
  trouverUtilisateurParEmail,
} from './utilisateurs.service.js';
import {
  creerDemandeAffiliation,
  notifierDemandeAffiliation,
  validerChoixAffiliation,
} from './affiliations.service.js';
import { envoyerAlerteAdministration, envoyerCodeVerification } from './email.service.js';
import { activerEssaiGratuit, notifierActivationEssai } from './abonnements.service.js';

function creerJeton(utilisateur) {
  return jwt.sign(
    { role: utilisateur.role, code: utilisateur.code_utilisateur },
    environnement.JWT_SECRET,
    { subject: String(utilisateur.id), expiresIn: environnement.JWT_EXPIRES_IN },
  );
}

function hacherJeton(jeton) {
  return createHash('sha256').update(jeton).digest('hex');
}

async function creerJetonActualisation(utilisateurId, connexion = baseDeDonnees) {
  const jeton = randomBytes(48).toString('hex');
  const expiration = new Date(Date.now() + environnement.REFRESH_TOKEN_DAYS * 86_400_000);
  await connexion.execute(
    `INSERT INTO jetons_actualisation
      (code_jeton, utilisateur_id, jeton_hash, date_expiration)
     VALUES ('', ?, ?, ?)`,
    [utilisateurId, hacherJeton(jeton), expiration],
  );
  return jeton;
}

function sansMotDePasse(utilisateur) {
  const { mot_de_passe_hash: _motDePasse, ...donneesPubliques } = utilisateur;
  return donneesPubliques;
}

function masquerEmail(email) {
  const [nom, domaine] = email.split('@');
  const visible = nom.slice(0, Math.min(2, nom.length));
  return `${visible}${'*'.repeat(Math.max(2, nom.length - visible.length))}@${domaine}`;
}

function hacherCode(utilisateurId, code) {
  return createHmac('sha256', environnement.JWT_SECRET)
    .update(`${utilisateurId}:${code}`)
    .digest('hex');
}

async function creerEtEnvoyerCode(utilisateur) {
  const code = String(randomInt(100000, 1_000_000));
  const expiration = new Date(Date.now() + environnement.EMAIL_VERIFICATION_TTL_MINUTES * 60_000);
  await baseDeDonnees.execute(
    `UPDATE codes_verification_email
     SET date_utilisation = CURRENT_TIMESTAMP
     WHERE utilisateur_id = ? AND date_utilisation IS NULL`,
    [utilisateur.id],
  );
  await baseDeDonnees.execute(
    `INSERT INTO codes_verification_email
      (id, code_reference, utilisateur_id, code_hash, date_expiration)
     VALUES (0, '', ?, ?, ?)`,
    [utilisateur.id, hacherCode(utilisateur.id, code), expiration],
  );
  await envoyerCodeVerification({
    email: utilisateur.email,
    nom: utilisateur.nom_affichage,
    code,
    dureeMinutes: environnement.EMAIL_VERIFICATION_TTL_MINUTES,
  });
}

export async function inscrireUtilisateur(donnees) {
  const utilisateurExistant = await trouverUtilisateurParEmail(donnees.email);
  if (utilisateurExistant) throw new ErreurApi(409, 'Un compte utilise déjà cette adresse email.');
  if (donnees.role === 'ETUDIANT') await validerChoixAffiliation(donnees);

  const hash = await bcrypt.hash(donnees.motDePasse, environnement.BCRYPT_ROUNDS);
  const [resultats] = await baseDeDonnees.query(
    'CALL sp_inscrire_utilisateur(?, ?, ?, ?, ?, ?)',
    [
      donnees.email,
      hash,
      donnees.role,
      donnees.nomAffichage,
      donnees.ville ?? null,
      donnees.province ?? null,
    ],
  );

  const utilisateur = resultats[0][0];
  utilisateur.nom_affichage = donnees.nomAffichage;
  if (donnees.pays) {
    await baseDeDonnees.execute('UPDATE utilisateurs SET pays = ? WHERE id = ?', [donnees.pays, utilisateur.id]);
    utilisateur.pays = donnees.pays;
  }
  if (donnees.role === 'ETUDIANT') {
    await baseDeDonnees.query('CALL sp_creer_profil_etudiant(?, ?, ?, ?, ?, ?, ?)', [
      utilisateur.id, null, null, donnees.matriculeEtudiant,
      'Étudiant CampusHub', JSON.stringify([]), null,
    ]);
    await creerDemandeAffiliation(utilisateur.id, {
      codeUniversite: donnees.codeUniversite,
      codeFiliere: donnees.codeFiliere,
      matriculeEtudiant: donnees.matriculeEtudiant,
      message: 'Demande créée automatiquement lors de l’inscription CampusHub.',
    }, { notifier: false });
  }
  let emailEnvoye = true;
  try {
    await creerEtEnvoyerCode(utilisateur);
  } catch (erreur) {
    emailEnvoye = false;
    console.error('Échec d’envoi du code de confirmation :', erreur.message);
  }
  return {
    ...utilisateur,
    verification_email_requise: true,
    email_masque: masquerEmail(utilisateur.email),
    email_envoye: emailEnvoye,
    affiliation_demandee: donnees.role === 'ETUDIANT',
  };
}

export async function renvoyerCodeVerification(email) {
  const utilisateur = await trouverUtilisateurParEmail(email);
  if (!utilisateur) {
    return { email_masque: masquerEmail(email), email_envoye: true };
  }
  if (utilisateur.date_verification_email) {
    throw new ErreurApi(409, 'Cette adresse e-mail est déjà confirmée.');
  }
  const [derniers] = await baseDeDonnees.execute(
    `SELECT date_creation FROM codes_verification_email
     WHERE utilisateur_id = ? ORDER BY date_creation DESC LIMIT 1`,
    [utilisateur.id],
  );
  if (derniers[0] && Date.now() - new Date(derniers[0].date_creation).getTime() < 60_000) {
    throw new ErreurApi(429, 'Patientez une minute avant de demander un nouveau code.');
  }
  await creerEtEnvoyerCode(utilisateur);
  return { email_masque: masquerEmail(utilisateur.email), email_envoye: true };
}

export async function confirmerCodeVerification(email, code) {
  const utilisateur = await trouverUtilisateurParEmail(email);
  if (!utilisateur) throw new ErreurApi(400, 'Le code est invalide ou expiré.');
  if (utilisateur.date_verification_email) {
    if (utilisateur.role !== 'UNIVERSITE') {
      return { email_verifie: true, statut_compte: utilisateur.statut_compte };
    }
    const connexionExistante = await baseDeDonnees.getConnection();
    let essaiExistant;
    try {
      await connexionExistante.beginTransaction();
      essaiExistant = await activerEssaiGratuit(utilisateur.id, connexionExistante);
      await connexionExistante.commit();
    } catch (erreur) {
      await connexionExistante.rollback();
      throw erreur;
    } finally {
      connexionExistante.release();
    }
    await notifierActivationEssai(essaiExistant);
    return {
      email_verifie: true,
      statut_compte: 'ACTIF',
      essai_gratuit: essaiExistant.abonnement,
    };
  }
  const [lignes] = await baseDeDonnees.execute(
    `SELECT id, code_hash, date_expiration, nombre_tentatives
     FROM codes_verification_email
     WHERE utilisateur_id = ? AND date_utilisation IS NULL
     ORDER BY date_creation DESC LIMIT 1`,
    [utilisateur.id],
  );
  const verification = lignes[0];
  if (!verification || new Date(verification.date_expiration) <= new Date()) {
    throw new ErreurApi(410, 'Ce code a expiré. Demandez un nouveau code.');
  }
  if (verification.nombre_tentatives >= environnement.EMAIL_VERIFICATION_MAX_ATTEMPTS) {
    throw new ErreurApi(429, 'Trop de codes incorrects. Demandez un nouveau code.');
  }
  const attendu = Buffer.from(verification.code_hash, 'hex');
  const recu = Buffer.from(hacherCode(utilisateur.id, code), 'hex');
  if (attendu.length !== recu.length || !timingSafeEqual(attendu, recu)) {
    await baseDeDonnees.execute(
      'UPDATE codes_verification_email SET nombre_tentatives = nombre_tentatives + 1 WHERE id = ?',
      [verification.id],
    );
    throw new ErreurApi(400, 'Le code est invalide ou expiré.');
  }

  const connexion = await baseDeDonnees.getConnection();
  let essaiGratuit = null;
  try {
    await connexion.beginTransaction();
    const [utilisation] = await connexion.execute(
      `UPDATE codes_verification_email SET date_utilisation = CURRENT_TIMESTAMP
       WHERE id = ? AND date_utilisation IS NULL`,
      [verification.id],
    );
    if (!utilisation.affectedRows) throw new ErreurApi(409, 'Ce code a déjà été utilisé.');
    await connexion.execute(
      `UPDATE utilisateurs
       SET date_verification_email = CURRENT_TIMESTAMP,
           statut_compte = CASE WHEN role IN ('ETUDIANT', 'VISITEUR', 'ENTREPRISE') THEN 'ACTIF' ELSE statut_compte END,
           statut_verification = CASE WHEN role = 'UNIVERSITE' THEN 'EN_ATTENTE' ELSE statut_verification END
       WHERE id = ?`,
      [utilisateur.id],
    );
    if (utilisateur.role === 'UNIVERSITE') {
      essaiGratuit = await activerEssaiGratuit(utilisateur.id, connexion);
    }
    await connexion.commit();
  } catch (erreur) {
    await connexion.rollback();
    throw erreur;
  } finally {
    connexion.release();
  }
  if (utilisateur.role === 'ETUDIANT') {
    try {
      await notifierDemandeAffiliation(utilisateur.id);
    } catch (erreur) {
      console.error('Échec de la notification d’affiliation après vérification :', erreur.code || erreur.message);
    }
  }
  if (utilisateur.role === 'UNIVERSITE') {
    try {
      await baseDeDonnees.execute(
        `INSERT INTO notifications
          (id, code_notification, destinataire_id, acteur_id, type_notification, titre, message, url_action)
         SELECT 0, '', a.id, ?, 'SYSTEME', 'Nouvelle demande institutionnelle', ?, '/administration/demandes'
         FROM utilisateurs a WHERE a.role = 'ADMINISTRATEUR' AND a.statut_compte = 'ACTIF'`,
        [utilisateur.id, `${utilisateur.nom_affichage} a confirmé son adresse e-mail et attend votre vérification.`],
      );
      await envoyerAlerteAdministration({
        titre: 'Nouvel établissement à examiner',
        introduction: `${utilisateur.nom_affichage} a confirmé son adresse e-mail.`,
        details: [`Compte : ${utilisateur.email}`, 'La fiche et l’identité de l’établissement doivent être vérifiées.'],
        chemin: '/administration/demandes',
      });
    } catch (erreur) {
      console.error('Échec de la notification institutionnelle :', erreur.code || erreur.message);
    }
  }
  await notifierActivationEssai(essaiGratuit);
  return {
    email_verifie: true,
    statut_compte: ['ETUDIANT', 'VISITEUR', 'UNIVERSITE', 'ENTREPRISE'].includes(utilisateur.role) ? 'ACTIF' : utilisateur.statut_compte,
    essai_gratuit: essaiGratuit?.abonnement ?? null,
  };
}

export async function connecterUtilisateur(email, motDePasse) {
  const utilisateur = await trouverUtilisateurParEmail(email, true);
  if (!utilisateur || !(await bcrypt.compare(motDePasse, utilisateur.mot_de_passe_hash))) {
    throw new ErreurApi(401, 'Email ou mot de passe incorrect.');
  }
  if (utilisateur.statut_compte !== 'ACTIF') {
    if (!utilisateur.date_verification_email) {
      throw new ErreurApi(403, 'Confirmez d’abord votre adresse e-mail avec le code reçu.');
    }
    throw new ErreurApi(403, `Ce compte est actuellement ${utilisateur.statut_compte.toLowerCase()}.`);
  }

  await enregistrerDerniereConnexion(utilisateur.id);
  const jetonAcces = creerJeton(utilisateur);
  const jetonActualisation = await creerJetonActualisation(utilisateur.id);
  return {
    utilisateur: sansMotDePasse(utilisateur),
    jeton: jetonAcces,
    jetonAcces,
    jetonActualisation,
  };
}

export async function actualiserSession(jetonActuel) {
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.beginTransaction();
    const [lignes] = await connexion.execute(
      `SELECT j.id AS jeton_id, u.*
       FROM jetons_actualisation j
       JOIN utilisateurs u ON u.id = j.utilisateur_id
       WHERE j.jeton_hash = ? AND j.date_revocation IS NULL
         AND j.date_expiration > CURRENT_TIMESTAMP
       LIMIT 1 FOR UPDATE`,
      [hacherJeton(jetonActuel)],
    );
    const utilisateur = lignes[0];
    if (!utilisateur || utilisateur.statut_compte !== 'ACTIF') {
      throw new ErreurApi(401, 'Le jeton d’actualisation est invalide ou expiré.');
    }
    await connexion.execute(
      'UPDATE jetons_actualisation SET date_revocation = CURRENT_TIMESTAMP WHERE id = ?',
      [utilisateur.jeton_id],
    );
    const nouveauJeton = await creerJetonActualisation(utilisateur.id, connexion);
    await connexion.commit();
    return {
      utilisateur: sansMotDePasse(utilisateur),
      jetonAcces: creerJeton(utilisateur),
      jetonActualisation: nouveauJeton,
    };
  } catch (erreur) {
    await connexion.rollback();
    throw erreur;
  } finally {
    connexion.release();
  }
}

export async function deconnecterSession(jetonActualisation) {
  const [resultat] = await baseDeDonnees.execute(
    `UPDATE jetons_actualisation SET date_revocation = CURRENT_TIMESTAMP
     WHERE jeton_hash = ? AND date_revocation IS NULL`,
    [hacherJeton(jetonActualisation)],
  );
  return { sessionRevoquee: resultat.affectedRows > 0 };
}
