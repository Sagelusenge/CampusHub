import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';
import { envoyerNouveauContactAdministration, envoyerSuiviContact } from './email.service.js';

async function envoyerEmailSansBloquer(action, envoyer) {
  try {
    await envoyer();
    return true;
  } catch (erreur) {
    console.error(`Échec de l’e-mail ${action} :`, erreur.code || erreur.message);
    return false;
  }
}

export async function creerContact(donnees) {
  const connexion = await baseDeDonnees.getConnection();
  let contact;
  try {
    await connexion.beginTransaction();
    await connexion.execute(`INSERT INTO demandes_contact (id, code_contact, nom, email, sujet, message)
      VALUES (0, '', ?, ?, ?, ?)`, [donnees.nom, donnees.email, donnees.sujet, donnees.message]);
    const [contacts] = await connexion.query('SELECT * FROM demandes_contact WHERE id = @campushub_dernier_id');
    await connexion.execute(`INSERT INTO notifications
      (id, code_notification, destinataire_id, type_notification, titre, message, url_action)
      SELECT 0, '', id, 'SYSTEME', 'Nouveau message de contact', ?, '/administration/contacts'
      FROM utilisateurs WHERE role = 'ADMINISTRATEUR' AND statut_compte = 'ACTIF'`,
    [`${donnees.nom} vous a écrit au sujet de « ${donnees.sujet} ».`]);
    await connexion.commit();
    [contact] = contacts;
  } catch (erreur) { await connexion.rollback(); throw erreur; } finally { connexion.release(); }
  const emailAdminEnvoye = await envoyerEmailSansBloquer(
    'de nouveau contact',
    () => envoyerNouveauContactAdministration(contact),
  );
  return { ...contact, email_admin_envoye: emailAdminEnvoye };
}

export async function listerContacts(statut) {
  const valeurs = []; let where = '';
  if (statut) { where = 'WHERE d.statut = ?'; valeurs.push(statut); }
  const [lignes] = await baseDeDonnees.execute(`SELECT d.*, u.nom_affichage AS nom_administrateur
    FROM demandes_contact d LEFT JOIN utilisateurs u ON u.id = d.traite_par_id ${where}
    ORDER BY FIELD(d.statut, 'NOUVEAU', 'EN_COURS', 'TRAITE', 'ARCHIVE'), d.date_creation DESC`, valeurs);
  return lignes;
}

export async function traiterContact(code, donnees, administrateurId) {
  const [resultat] = await baseDeDonnees.execute(`UPDATE demandes_contact SET statut = ?, reponse_admin = ?, traite_par_id = ?,
    date_traitement = IF(? IN ('TRAITE', 'ARCHIVE'), NOW(), NULL) WHERE code_contact = ?`,
  [donnees.statut, donnees.reponse ?? null, administrateurId, donnees.statut, code.toUpperCase()]);
  if (!resultat.affectedRows) throw new ErreurApi(404, 'Demande de contact introuvable.');
  const [lignes] = await baseDeDonnees.execute('SELECT * FROM demandes_contact WHERE code_contact = ?', [code.toUpperCase()]);
  const contact = lignes[0];
  const emailExpediteurEnvoye = await envoyerEmailSansBloquer(
    `de suivi du contact ${contact.code_contact}`,
    () => envoyerSuiviContact(contact),
  );
  return { ...contact, email_expediteur_envoye: emailExpediteurEnvoye };
}
