import nodemailer from 'nodemailer';
import { environnement } from '../config/environnement.js';
import { ErreurApi } from '../utils/erreur-api.js';

let transporteur;

function obtenirTransporteur() {
  if (!environnement.SMTP_USER || !environnement.SMTP_PASSWORD) {
    throw new ErreurApi(503, 'Le service d’envoi d’e-mails n’est pas encore configuré.');
  }
  if (!transporteur) {
    transporteur = nodemailer.createTransport({
      host: environnement.SMTP_HOST,
      port: environnement.SMTP_PORT,
      secure: environnement.SMTP_SECURE,
      pool: true,
      auth: {
        user: environnement.SMTP_USER,
        pass: environnement.SMTP_PASSWORD,
      },
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }
  return transporteur;
}

function echapperHtml(valeur = '') {
  return String(valeur).replace(/[&<>"']/g, (caractere) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[caractere]));
}

function expediteur() {
  return environnement.SMTP_FROM || environnement.SMTP_USER;
}

function emailAdministration() {
  return environnement.ADMIN_NOTIFICATION_EMAIL || environnement.SMTP_USER;
}

function miseEnPageEmail({ titre, introduction, contenu, conclusion = 'L’équipe CampusHub' }) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#173a58;line-height:1.65">
    <div style="padding:18px 22px;border-radius:14px 14px 0 0;background:#082f67;color:#fff">
      <strong style="font-size:22px">CampusHub</strong>
    </div>
    <div style="padding:24px;border:1px solid #dbe5ed;border-top:0;border-radius:0 0 14px 14px">
      <h1 style="margin:0 0 12px;color:#082f67;font-size:22px">${echapperHtml(titre)}</h1>
      <p>${introduction}</p>
      ${contenu}
      <p style="margin-top:22px;color:#76879a">${echapperHtml(conclusion)}</p>
    </div>
  </div>`;
}

export async function envoyerCodeVerification({ email, nom, code, dureeMinutes }) {
  const nomSecurise = echapperHtml(nom || 'membre CampusHub');
  const sujet = `${code} — votre code de confirmation CampusHub`;
  await obtenirTransporteur().sendMail({
    from: expediteur(),
    to: email,
    subject: sujet,
    text: `Bonjour ${nom || ''},\n\nVotre code de confirmation CampusHub est : ${code}\n\nIl expire dans ${dureeMinutes} minutes. Ne le partagez avec personne.\n\nL’équipe CampusHub`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#173a58">
      <h1 style="color:#082f67">CampusHub</h1>
      <p>Bonjour ${nomSecurise},</p>
      <p>Utilisez ce code pour confirmer votre adresse e-mail :</p>
      <p style="padding:18px;text-align:center;border-radius:12px;background:#eef8f6;color:#087f74;font-size:32px;font-weight:800;letter-spacing:8px">${code}</p>
      <p>Ce code expire dans <strong>${dureeMinutes} minutes</strong>. Ne le partagez avec personne.</p>
      <p style="color:#76879a">L’équipe CampusHub</p>
    </div>`,
  });
}

export async function envoyerNouveauContactAdministration(contact) {
  const destinataire = emailAdministration();
  if (!destinataire) throw new ErreurApi(503, 'L’adresse e-mail de l’administration n’est pas configurée.');
  const messageHtml = echapperHtml(contact.message).replaceAll('\n', '<br>');
  await obtenirTransporteur().sendMail({
    from: expediteur(),
    to: destinataire,
    replyTo: contact.email,
    subject: `[CampusHub] Nouveau message : ${contact.sujet}`,
    text: `Nouveau message de ${contact.nom} (${contact.email})\nSujet : ${contact.sujet}\nRéférence : ${contact.code_contact}\n\n${contact.message}`,
    html: miseEnPageEmail({
      titre: 'Nouveau message de contact',
      introduction: `<strong>${echapperHtml(contact.nom)}</strong> vous a écrit depuis la page publique.`,
      contenu: `<div style="padding:15px;border-radius:10px;background:#f2f7fb">
        <p style="margin:0 0 6px"><strong>Sujet :</strong> ${echapperHtml(contact.sujet)}</p>
        <p style="margin:0 0 6px"><strong>E-mail :</strong> ${echapperHtml(contact.email)}</p>
        <p style="margin:0 0 12px"><strong>Référence :</strong> ${echapperHtml(contact.code_contact)}</p>
        <p style="margin:0">${messageHtml}</p>
      </div>`,
    }),
  });
}

export async function envoyerSuiviContact(contact) {
  const libelles = {
    EN_COURS: ['Votre demande est prise en charge', 'Notre équipe examine actuellement votre message.'],
    TRAITE: ['Votre demande a été traitée', 'Notre équipe a terminé le traitement de votre message.'],
    ARCHIVE: ['Votre demande a été archivée', 'Le suivi de votre message est maintenant clôturé.'],
  };
  const [titre, description] = libelles[contact.statut] || ['Mise à jour de votre demande', 'Le statut de votre message a changé.'];
  const reponse = contact.reponse_admin
    ? `<div style="margin-top:14px;padding:15px;border-left:4px solid #0a8c80;background:#eef8f6"><strong>Réponse de l’administration</strong><p>${echapperHtml(contact.reponse_admin).replaceAll('\n', '<br>')}</p></div>`
    : '';
  await obtenirTransporteur().sendMail({
    from: expediteur(),
    to: contact.email,
    replyTo: emailAdministration(),
    subject: `[CampusHub] ${titre} — ${contact.code_contact}`,
    text: `Bonjour ${contact.nom},\n\n${description}\nRéférence : ${contact.code_contact}\nSujet : ${contact.sujet}${contact.reponse_admin ? `\n\nRéponse : ${contact.reponse_admin}` : ''}\n\nL’équipe CampusHub`,
    html: miseEnPageEmail({
      titre,
      introduction: `Bonjour ${echapperHtml(contact.nom)}, ${echapperHtml(description.toLowerCase())}`,
      contenu: `<div style="padding:14px;border-radius:10px;background:#f2f7fb"><strong>Référence :</strong> ${echapperHtml(contact.code_contact)}<br><strong>Sujet :</strong> ${echapperHtml(contact.sujet)}</div>${reponse}`,
    }),
  });
}

export async function envoyerNouvelleAffiliationGestionnaires(demande) {
  if (!demande.emails_gestionnaires?.length) return false;
  await obtenirTransporteur().sendMail({
    from: expediteur(),
    to: demande.emails_gestionnaires,
    subject: `[CampusHub] Nouvelle demande d’affiliation — ${demande.nom_etudiant}`,
    text: `${demande.nom_etudiant} demande à être affilié(e) à ${demande.nom_universite}.\nFilière : ${demande.nom_filiere}\nMatricule : ${demande.matricule_etudiant}\nRéférence : ${demande.code_demande}`,
    html: miseEnPageEmail({
      titre: 'Nouvelle demande d’affiliation',
      introduction: `<strong>${echapperHtml(demande.nom_etudiant)}</strong> a confirmé son adresse e-mail et souhaite rejoindre votre établissement.`,
      contenu: `<div style="padding:15px;border-radius:10px;background:#f2f7fb"><strong>Établissement :</strong> ${echapperHtml(demande.nom_universite)}<br><strong>Filière :</strong> ${echapperHtml(demande.nom_filiere)}<br><strong>Matricule :</strong> ${echapperHtml(demande.matricule_etudiant)}<br><strong>Référence :</strong> ${echapperHtml(demande.code_demande)}</div>`,
    }),
  });
  return true;
}

export async function envoyerDecisionAffiliationEtudiant(demande) {
  const acceptee = demande.statut === 'ACCEPTEE';
  const titre = acceptee ? 'Votre affiliation a été confirmée' : 'Mise à jour de votre demande d’affiliation';
  await obtenirTransporteur().sendMail({
    from: expediteur(),
    to: demande.email_etudiant,
    subject: `[CampusHub] ${titre}`,
    text: `Bonjour ${demande.nom_etudiant},\n\n${demande.nom_universite} a ${acceptee ? 'accepté' : 'refusé'} votre demande d’affiliation.\nFilière : ${demande.nom_filiere}\nRéférence : ${demande.code_demande}${demande.reponse_universite ? `\nRéponse : ${demande.reponse_universite}` : ''}`,
    html: miseEnPageEmail({
      titre,
      introduction: `Bonjour ${echapperHtml(demande.nom_etudiant)}, <strong>${echapperHtml(demande.nom_universite)}</strong> a ${acceptee ? 'accepté' : 'refusé'} votre demande.`,
      contenu: `<div style="padding:15px;border-radius:10px;background:${acceptee ? '#eef8f6' : '#fff4f4'}"><strong>Filière :</strong> ${echapperHtml(demande.nom_filiere)}<br><strong>Référence :</strong> ${echapperHtml(demande.code_demande)}${demande.reponse_universite ? `<br><strong>Réponse :</strong> ${echapperHtml(demande.reponse_universite)}` : ''}</div>`,
    }),
  });
}

export async function verifierTransportEmail() {
  return obtenirTransporteur().verify();
}
