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
  const configure = environnement.SMTP_FROM?.trim();
  if (configure?.includes('@')) return configure;
  return `CampusHub <${environnement.SMTP_USER}>`;
}

function emailAdministration() {
  return environnement.ADMIN_NOTIFICATION_EMAIL || environnement.SMTP_USER;
}

function boutonEmail(libelle, chemin = '/') {
  const url = new URL(chemin, environnement.FRONTEND_URL).toString();
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 4px"><tr><td style="border-radius:10px;background:#0b887b">
    <a href="${echapperHtml(url)}" style="display:inline-block;padding:13px 22px;color:#fff;text-decoration:none;font-size:14px;font-weight:800">${echapperHtml(libelle)}</a>
  </td></tr></table>`;
}

function formatDateEmail(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long', timeZone: 'Africa/Lubumbashi',
  }).format(new Date(date));
}

function miseEnPageEmail({ titre, preheader, introduction, contenu, action, conclusion = 'À très bientôt sur CampusHub.' }) {
  const logoUrl = new URL('/favicon.svg', environnement.FRONTEND_URL).toString();
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${echapperHtml(titre)}</title></head>
  <body style="margin:0;padding:0;background:#eef3f8;color:#173a58;font-family:Arial,Helvetica,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${echapperHtml(preheader || titre)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#eef3f8"><tr><td align="center" style="padding:28px 12px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:620px;border-collapse:separate;background:#fff;border:1px solid #d9e3ed;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(8,47,103,.08)">
        <tr><td style="height:5px;background:linear-gradient(90deg,#0b887b,#79e3d7,#082f67)"></td></tr>
        <tr><td style="padding:22px 28px;background:#082f67">
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td><img src="${echapperHtml(logoUrl)}" width="46" height="46" alt="CampusHub" style="display:block;width:46px;height:46px;border:0;border-radius:12px"></td>
            <td style="padding-left:13px;color:#fff"><strong style="display:block;font-size:23px;letter-spacing:-.5px">Campus<span style="color:#79e3d7">Hub</span></strong><span style="font-size:11px;color:#c9d8eb">Orientation et communauté académique</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:32px 30px 28px">
          <p style="margin:0 0 8px;color:#0b887b;font-size:11px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase">Notification CampusHub</p>
          <h1 style="margin:0 0 14px;color:#082f67;font-size:25px;line-height:1.25">${echapperHtml(titre)}</h1>
          <div style="margin:0;color:#53687d;font-size:15px;line-height:1.7">${introduction}</div>
          <div style="margin-top:20px;color:#29455f;font-size:14px;line-height:1.65">${contenu}</div>
          ${action ? boutonEmail(action.libelle, action.chemin) : ''}
          <p style="margin:26px 0 0;padding-top:20px;border-top:1px solid #e7edf3;color:#718397;font-size:13px;line-height:1.6">${echapperHtml(conclusion)}<br><strong style="color:#173a58">L’équipe CampusHub</strong></p>
        </td></tr>
        <tr><td style="padding:17px 28px;text-align:center;background:#f6f9fc;color:#8090a2;font-size:11px;line-height:1.6">
          Cet e-mail a été envoyé automatiquement par CampusHub.<br>Ne transmettez jamais votre mot de passe ni votre code de sécurité.
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}

export async function envoyerCodeVerification({ email, nom, code, dureeMinutes }) {
  const nomSecurise = echapperHtml(nom || 'membre CampusHub');
  const sujet = `${code} — votre code de confirmation CampusHub`;
  await obtenirTransporteur().sendMail({
    from: expediteur(),
    to: email,
    subject: sujet,
    text: `Bonjour ${nom || ''},\n\nVotre code de confirmation CampusHub est : ${code}\n\nIl expire dans ${dureeMinutes} minutes. Ne le partagez avec personne.\n\nL’équipe CampusHub`,
    html: miseEnPageEmail({
      titre: 'Confirmez votre adresse e-mail',
      preheader: `Votre code CampusHub est ${code}. Il expire dans ${dureeMinutes} minutes.`,
      introduction: `Bonjour <strong style="color:#173a58">${nomSecurise}</strong>, utilisez le code ci-dessous pour sécuriser et activer votre compte.`,
      contenu: `<div style="padding:20px;text-align:center;border:1px solid #bce4dd;border-radius:14px;background:#ecfaf7">
        <span style="display:block;color:#607b7a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Code de confirmation</span>
        <strong style="display:block;margin-top:7px;color:#087f74;font-size:34px;letter-spacing:9px">${code}</strong>
      </div><p style="margin:15px 0 0">Ce code expire dans <strong>${dureeMinutes} minutes</strong> et ne peut être utilisé qu’une seule fois.</p>`,
      conclusion: 'Si vous n’avez pas créé ce compte, ignorez simplement cet e-mail.',
    }),
  });
}

export async function envoyerActivationEssai({ email, nom, dateFin }) {
  const nomSecurise = echapperHtml(nom || 'partenaire CampusHub');
  const fin = formatDateEmail(dateFin);
  await obtenirTransporteur().sendMail({
    from: expediteur(),
    to: email,
    subject: '[CampusHub] Vos 30 jours d’essai gratuit commencent maintenant',
    text: `Bonjour ${nom || ''},\n\nVotre essai gratuit CampusHub est actif pendant 30 jours, jusqu’au ${fin}. Vous pouvez découvrir les outils institutionnels sans paiement. Vous pourrez ensuite choisir l’accès annuel à 20 USD ou l’accès à vie à 200 USD.\n\nL’équipe CampusHub`,
    html: miseEnPageEmail({
      titre: 'Bienvenue dans votre essai gratuit',
      preheader: `Votre espace institutionnel est accessible gratuitement jusqu’au ${fin}.`,
      introduction: `Bonjour <strong style="color:#173a58">${nomSecurise}</strong>, votre espace institutionnel est maintenant actif.`,
      contenu: `<div style="padding:18px;border-radius:14px;background:#ecfaf7;border:1px solid #bce4dd">
        <strong style="display:block;color:#087f74;font-size:18px">30 jours offerts</strong>
        <span style="display:block;margin-top:5px;color:#486b70">Essai valable jusqu’au <strong>${echapperHtml(fin)}</strong>, sans paiement immédiat.</span>
      </div><p>Vous pouvez créer votre fiche, présenter vos formations, gérer les demandes étudiantes, publier des offres et découvrir les rapports CampusHub. Ensuite, choisissez <strong>20 USD par an</strong> ou <strong>200 USD en paiement unique pour un accès à vie</strong>.</p>`,
      action: { libelle: 'Accéder à mon espace', chemin: '/connexion' },
    }),
  });
}

export async function envoyerDecisionPaiement({ email, nom, codePaiement, statut, commentaire, montant, dateFin, nomPlan, estAVie }) {
  const valide = statut === 'VALIDE';
  const titre = valide ? (estAVie ? 'Votre accès CampusHub à vie est actif' : 'Votre abonnement annuel est actif') : 'Votre paiement nécessite une vérification';
  const detail = valide
    ? `Votre paiement de ${Number(montant).toFixed(2)} USD a été validé. ${estAVie ? 'Votre accès institutionnel est maintenant actif à vie.' : 'Votre abonnement est enregistré pour une année.'}`
    : `La preuve de paiement ${echapperHtml(codePaiement)} n’a pas été validée. ${commentaire ? echapperHtml(commentaire) : 'Vérifiez la référence et la preuve avant un nouvel envoi.'}`;
  await obtenirTransporteur().sendMail({
    from: expediteur(),
    to: email,
    subject: `[CampusHub] ${titre}`,
    text: `Bonjour ${nom || ''},\n\n${valide ? `Votre paiement de ${montant} USD pour la formule ${nomPlan || 'CampusHub'} a été validé.` : `Votre paiement ${codePaiement} n’a pas été validé. ${commentaire || ''}`}\n\nL’équipe CampusHub`,
    html: miseEnPageEmail({
      titre,
      introduction: `Bonjour <strong style="color:#173a58">${echapperHtml(nom || 'partenaire CampusHub')}</strong>, voici la mise à jour de votre paiement.`,
      contenu: `<div style="padding:17px;border-radius:13px;background:${valide ? '#ecfaf7' : '#fff4f2'};border:1px solid ${valide ? '#bce4dd' : '#f0cbc4'}">
        <strong style="color:${valide ? '#087f74' : '#a94735'}">${valide ? 'Paiement validé' : 'Paiement non validé'}</strong><br>
        <span>${detail}</span>${valide && dateFin && !estAVie ? `<br><span>Échéance : <strong>${echapperHtml(formatDateEmail(dateFin))}</strong></span>` : ''}
      </div>`,
      action: { libelle: valide ? 'Ouvrir mon espace' : 'Vérifier mon abonnement', chemin: valide ? '/connexion' : '/connexion' },
    }),
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
      action: { libelle: 'Ouvrir les messages de contact', chemin: '/administration/contacts' },
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
      action: { libelle: 'Consulter CampusHub', chemin: '/contact' },
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
      action: { libelle: 'Examiner la demande', chemin: '/espace-universite/affiliations' },
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
      action: { libelle: 'Voir mon affiliation', chemin: '/espace-etudiant/affiliation' },
    }),
  });
}

export async function verifierTransportEmail() {
  return obtenirTransporteur().verify();
}
