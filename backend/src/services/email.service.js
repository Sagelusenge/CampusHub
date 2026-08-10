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
  return valeur.replace(/[&<>"']/g, (caractere) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[caractere]));
}

export async function envoyerCodeVerification({ email, nom, code, dureeMinutes }) {
  const nomSecurise = echapperHtml(nom || 'membre CampusHub');
  const sujet = `${code} — votre code de confirmation CampusHub`;
  await obtenirTransporteur().sendMail({
    from: environnement.SMTP_FROM || environnement.SMTP_USER,
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

export async function verifierTransportEmail() {
  return obtenirTransporteur().verify();
}
