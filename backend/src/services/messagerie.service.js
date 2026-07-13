import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';

async function conversationAccessible(code, utilisateurId, connexion = baseDeDonnees) {
  const [lignes] = await connexion.execute(
    `SELECT c.id, c.code_conversation
     FROM conversations c
     JOIN participants_conversation p ON p.conversation_id = c.id
     WHERE c.code_conversation = ? AND p.utilisateur_id = ? AND p.est_actif = 1
     LIMIT 1`,
    [code.toUpperCase(), utilisateurId],
  );
  if (!lignes[0]) throw new ErreurApi(404, 'Conversation introuvable.');
  return lignes[0];
}

export async function rechercherContacts(utilisateurId, recherche) {
  const terme = `%${recherche || ''}%`;
  const [lignes] = await baseDeDonnees.execute(
    `SELECT code_utilisateur, nom_affichage, role, url_photo_profil, ville, province
     FROM utilisateurs
     WHERE id <> ? AND statut_compte = 'ACTIF'
       AND role IN ('ETUDIANT', 'UNIVERSITE')
       AND (? = '%%' OR nom_affichage LIKE ? OR email LIKE ?)
     ORDER BY nom_affichage LIMIT 20`,
    [utilisateurId, terme, terme, terme],
  );
  return lignes;
}

export async function listerConversations(utilisateurId) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT c.code_conversation, c.type_conversation, c.date_modification,
       autre.code_utilisateur, autre.nom_affichage, autre.role, autre.url_photo_profil,
       (SELECT COALESCE(m.contenu, 'Photo') FROM messages_prives m
        WHERE m.conversation_id = c.id AND m.date_suppression IS NULL
        ORDER BY m.id DESC LIMIT 1) AS dernier_message,
       (SELECT m.date_creation FROM messages_prives m
        WHERE m.conversation_id = c.id AND m.date_suppression IS NULL
        ORDER BY m.id DESC LIMIT 1) AS date_dernier_message,
       (SELECT COUNT(*) FROM messages_prives m
        WHERE m.conversation_id = c.id AND m.auteur_id <> ?
          AND m.date_suppression IS NULL
          AND m.date_creation > COALESCE(moi.date_derniere_lecture, '1970-01-01')) AS non_lus
     FROM participants_conversation moi
     JOIN conversations c ON c.id = moi.conversation_id
     LEFT JOIN participants_conversation pa ON pa.conversation_id = c.id AND pa.utilisateur_id <> ? AND pa.est_actif = 1
     LEFT JOIN utilisateurs autre ON autre.id = pa.utilisateur_id
     WHERE moi.utilisateur_id = ? AND moi.est_actif = 1
     ORDER BY COALESCE(date_dernier_message, c.date_creation) DESC`,
    [utilisateurId, utilisateurId, utilisateurId],
  );
  return lignes;
}

export async function creerConversation(utilisateurId, codeDestinataire) {
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.beginTransaction();
    const [destinataires] = await connexion.execute(
      `SELECT id FROM utilisateurs
       WHERE code_utilisateur = ? AND id <> ? AND statut_compte = 'ACTIF'
         AND role IN ('ETUDIANT', 'UNIVERSITE') LIMIT 1`,
      [codeDestinataire.toUpperCase(), utilisateurId],
    );
    const destinataire = destinataires[0];
    if (!destinataire) throw new ErreurApi(404, 'Destinataire introuvable.');
    const cleDirecte = [Number(utilisateurId), Number(destinataire.id)].sort((a, b) => a - b).join(':');
    let [existantes] = await connexion.execute(
      'SELECT id, code_conversation FROM conversations WHERE cle_directe = ? LIMIT 1', [cleDirecte],
    );
    let conversation = existantes[0];
    if (!conversation) {
      await connexion.execute(
        `INSERT INTO conversations (id, code_conversation, type_conversation, cle_directe)
         VALUES (0, '', 'DIRECTE', ?)`, [cleDirecte],
      );
      [existantes] = await connexion.execute(
        'SELECT id, code_conversation FROM conversations WHERE cle_directe = ? LIMIT 1', [cleDirecte],
      );
      conversation = existantes[0];
      await connexion.execute(
        `INSERT INTO participants_conversation (conversation_id, utilisateur_id)
         VALUES (?, ?), (?, ?)`,
        [conversation.id, utilisateurId, conversation.id, destinataire.id],
      );
    } else {
      await connexion.execute(
        `UPDATE participants_conversation SET est_actif = 1
         WHERE conversation_id = ? AND utilisateur_id IN (?, ?)`,
        [conversation.id, utilisateurId, destinataire.id],
      );
    }
    await connexion.commit();
    return { code_conversation: conversation.code_conversation };
  } catch (erreur) {
    await connexion.rollback();
    throw erreur;
  } finally { connexion.release(); }
}

export async function listerMessages(code, utilisateurId) {
  const conversation = await conversationAccessible(code, utilisateurId);
  const [messages] = await baseDeDonnees.execute(
    `SELECT m.code_message, m.contenu, m.url_media, m.type_media, m.date_creation,
       u.code_utilisateur AS code_auteur, u.nom_affichage AS nom_auteur, u.url_photo_profil
     FROM messages_prives m
     JOIN utilisateurs u ON u.id = m.auteur_id
     WHERE m.conversation_id = ? AND m.date_suppression IS NULL
     ORDER BY m.date_creation ASC LIMIT 200`,
    [conversation.id],
  );
  await baseDeDonnees.execute(
    `UPDATE participants_conversation SET date_derniere_lecture = CURRENT_TIMESTAMP
     WHERE conversation_id = ? AND utilisateur_id = ?`, [conversation.id, utilisateurId],
  );
  return messages;
}

export async function envoyerMessage(code, utilisateur, donnees) {
  const conversation = await conversationAccessible(code, utilisateur.id);
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.beginTransaction();
    await connexion.execute(
      `INSERT INTO messages_prives
        (id, code_message, conversation_id, auteur_id, contenu, url_media, type_media)
       VALUES (0, '', ?, ?, ?, ?, ?)`,
      [conversation.id, utilisateur.id, donnees.contenu ?? null, donnees.urlMedia ?? null, donnees.typeMedia ?? null],
    );
    const [messages] = await connexion.query(
      `SELECT m.code_message, m.contenu, m.url_media, m.type_media, m.date_creation,
        u.code_utilisateur AS code_auteur, u.nom_affichage AS nom_auteur
       FROM messages_prives m JOIN utilisateurs u ON u.id = m.auteur_id
       WHERE m.id = @campushub_dernier_id`,
    );
    await connexion.execute(
      `INSERT INTO notifications
        (id, code_notification, destinataire_id, acteur_id, type_notification, titre, message, url_action)
       SELECT 0, '', p.utilisateur_id, ?, 'MESSAGE', ?, ?, '/messages'
       FROM participants_conversation p
       WHERE p.conversation_id = ? AND p.utilisateur_id <> ? AND p.est_actif = 1`,
      [utilisateur.id, `Nouveau message de ${utilisateur.nom_affichage}`, donnees.contenu?.slice(0, 180) || 'Vous avez reçu une photo.', conversation.id, utilisateur.id],
    );
    await connexion.execute(
      `UPDATE participants_conversation SET date_derniere_lecture = CURRENT_TIMESTAMP
       WHERE conversation_id = ? AND utilisateur_id = ?`, [conversation.id, utilisateur.id],
    );
    await connexion.commit();
    return messages[0];
  } catch (erreur) {
    await connexion.rollback(); throw erreur;
  } finally { connexion.release(); }
}
