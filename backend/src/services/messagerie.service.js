import { baseDeDonnees } from '../config/base-de-donnees.js';
import { ErreurApi } from '../utils/erreur-api.js';

const dureesEphemeres = {
  '1_HEURE': 60 * 60,
  '24_HEURES': 24 * 60 * 60,
  '7_JOURS': 7 * 24 * 60 * 60,
};

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

async function verifierAbsenceBlocage(utilisateurA, utilisateurB, connexion = baseDeDonnees) {
  const [blocages] = await connexion.execute(
    `SELECT 1
     FROM blocages_messagerie
     WHERE (bloqueur_id = ? AND bloque_id = ?)
        OR (bloqueur_id = ? AND bloque_id = ?)
     LIMIT 1`,
    [utilisateurA, utilisateurB, utilisateurB, utilisateurA],
  );
  if (blocages[0]) throw new ErreurApi(403, 'La messagerie est indisponible pour ce contact.');
}

async function verifierRelationAcceptee(utilisateurA, utilisateurB, connexion = baseDeDonnees) {
  const [relations] = await connexion.execute(
    `SELECT 1 FROM relations_utilisateurs
     WHERE cle_relation = CONCAT(LEAST(?, ?), ':', GREATEST(?, ?))
       AND statut = 'ACCEPTEE'
     LIMIT 1`,
    [utilisateurA, utilisateurB, utilisateurA, utilisateurB],
  );
  if (!relations[0]) {
    throw new ErreurApi(403, 'Une demande de connexion doit être acceptée avant de pouvoir envoyer un message.');
  }
}

export async function signalerPresence(utilisateurId) {
  await baseDeDonnees.execute(
    `INSERT INTO presences_messagerie (utilisateur_id, date_derniere_presence)
     VALUES (?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE date_derniere_presence = CURRENT_TIMESTAMP`,
    [utilisateurId],
  );
  return { est_en_ligne: true };
}

export async function rechercherContacts(utilisateurId, recherche) {
  const terme = `%${recherche || ''}%`;
  const [lignes] = await baseDeDonnees.execute(
    `SELECT u.code_utilisateur, u.nom_affichage, u.role, u.url_photo_profil, u.ville, u.province,
       CASE WHEN pr.date_derniere_presence >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 45 SECOND)
         THEN 1 ELSE 0 END AS est_en_ligne
     FROM utilisateurs u
     JOIN relations_utilisateurs r
       ON r.cle_relation = CONCAT(LEAST(?, u.id), ':', GREATEST(?, u.id))
      AND r.statut = 'ACCEPTEE'
     LEFT JOIN presences_messagerie pr ON pr.utilisateur_id = u.id
     WHERE u.id <> ? AND u.statut_compte = 'ACTIF'
       AND u.role IN ('VISITEUR', 'ETUDIANT', 'UNIVERSITE', 'ADMINISTRATEUR')
       AND (? = '%%' OR u.nom_affichage LIKE ? OR u.email LIKE ?)
       AND NOT EXISTS (
         SELECT 1 FROM blocages_messagerie b
         WHERE (b.bloqueur_id = ? AND b.bloque_id = u.id)
            OR (b.bloqueur_id = u.id AND b.bloque_id = ?)
       )
     ORDER BY est_en_ligne DESC, u.nom_affichage
     LIMIT 20`,
    [utilisateurId, utilisateurId, utilisateurId, terme, terme, terme, utilisateurId, utilisateurId],
  );
  return lignes;
}

export async function listerConversations(utilisateurId) {
  const [lignes] = await baseDeDonnees.execute(
    `SELECT c.code_conversation, c.type_conversation, c.date_modification,
       autre.code_utilisateur, autre.nom_affichage, autre.role, autre.url_photo_profil,
       CASE WHEN presence.date_derniere_presence >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 45 SECOND)
         THEN 1 ELSE 0 END AS est_en_ligne,
       EXISTS(
         SELECT 1 FROM blocages_messagerie b
         WHERE b.bloqueur_id = ? AND b.bloque_id = autre.id
       ) AS bloque_par_moi,
       EXISTS(
         SELECT 1 FROM blocages_messagerie b
         WHERE b.bloqueur_id = autre.id AND b.bloque_id = ?
       ) AS je_suis_bloque,
       EXISTS(
         SELECT 1 FROM relations_utilisateurs r
         WHERE r.cle_relation = CONCAT(LEAST(?, autre.id), ':', GREATEST(?, autre.id))
           AND r.statut = 'ACCEPTEE'
       ) AS relation_acceptee,
       (SELECT CASE WHEN m.est_ephemere = 1 THEN 'Message éphémère'
          ELSE COALESCE(m.contenu, 'Photo') END
        FROM messages_prives m
        WHERE m.conversation_id = c.id AND m.date_suppression IS NULL
          AND (m.date_expiration IS NULL OR m.date_expiration > CURRENT_TIMESTAMP)
        ORDER BY m.id DESC LIMIT 1) AS dernier_message,
       (SELECT m.date_creation FROM messages_prives m
        WHERE m.conversation_id = c.id AND m.date_suppression IS NULL
          AND (m.date_expiration IS NULL OR m.date_expiration > CURRENT_TIMESTAMP)
        ORDER BY m.id DESC LIMIT 1) AS date_dernier_message,
       (SELECT COUNT(*) FROM messages_prives m
        WHERE m.conversation_id = c.id AND m.auteur_id <> ?
          AND m.date_suppression IS NULL
          AND (m.date_expiration IS NULL OR m.date_expiration > CURRENT_TIMESTAMP)
          AND m.date_creation > COALESCE(moi.date_derniere_lecture, '1970-01-01')) AS non_lus
     FROM participants_conversation moi
     JOIN conversations c ON c.id = moi.conversation_id
     LEFT JOIN participants_conversation pa
       ON pa.conversation_id = c.id AND pa.utilisateur_id <> ? AND pa.est_actif = 1
     LEFT JOIN utilisateurs autre ON autre.id = pa.utilisateur_id
     LEFT JOIN presences_messagerie presence ON presence.utilisateur_id = autre.id
     WHERE moi.utilisateur_id = ? AND moi.est_actif = 1
     ORDER BY COALESCE(date_dernier_message, c.date_creation) DESC`,
    [utilisateurId, utilisateurId, utilisateurId, utilisateurId, utilisateurId, utilisateurId, utilisateurId],
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
         AND role IN ('VISITEUR', 'ETUDIANT', 'UNIVERSITE', 'ADMINISTRATEUR') LIMIT 1`,
      [codeDestinataire.toUpperCase(), utilisateurId],
    );
    const destinataire = destinataires[0];
    if (!destinataire) throw new ErreurApi(404, 'Destinataire introuvable.');
    await verifierAbsenceBlocage(utilisateurId, destinataire.id, connexion);
    await verifierRelationAcceptee(utilisateurId, destinataire.id, connexion);
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
    `SELECT m.code_message, m.contenu, m.url_media, m.type_media, m.nom_media,
       m.type_mime, m.taille_octets, m.est_ephemere,
       m.date_expiration, m.date_creation,
       u.code_utilisateur AS code_auteur, u.nom_affichage AS nom_auteur, u.url_photo_profil,
       CASE WHEN m.auteur_id = ? THEN
         CASE
           WHEN EXISTS(
             SELECT 1 FROM participants_conversation lecture
             WHERE lecture.conversation_id = m.conversation_id
               AND lecture.utilisateur_id <> m.auteur_id
               AND lecture.date_derniere_lecture >= m.date_creation
           ) THEN 'LU'
           WHEN EXISTS(
             SELECT 1
             FROM participants_conversation destinataire
             JOIN presences_messagerie presence
               ON presence.utilisateur_id = destinataire.utilisateur_id
             WHERE destinataire.conversation_id = m.conversation_id
               AND destinataire.utilisateur_id <> m.auteur_id
               AND presence.date_derniere_presence >= m.date_creation
           ) THEN 'LIVRE'
           ELSE 'ENVOYE'
         END
       ELSE NULL END AS statut_reception
     FROM messages_prives m
     JOIN utilisateurs u ON u.id = m.auteur_id
     WHERE m.conversation_id = ? AND m.date_suppression IS NULL
       AND (m.date_expiration IS NULL OR m.date_expiration > CURRENT_TIMESTAMP)
     ORDER BY m.date_creation ASC LIMIT 200`,
    [utilisateurId, conversation.id],
  );
  await baseDeDonnees.execute(
    `UPDATE participants_conversation SET date_derniere_lecture = CURRENT_TIMESTAMP
     WHERE conversation_id = ? AND utilisateur_id = ?`, [conversation.id, utilisateurId],
  );
  return messages;
}

export async function obtenirEtatConversation(code, utilisateurId) {
  const conversation = await conversationAccessible(code, utilisateurId);
  const [lignes] = await baseDeDonnees.execute(
    `SELECT u.code_utilisateur, u.nom_affichage, u.role, u.url_photo_profil,
       CASE WHEN pr.date_derniere_presence >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 45 SECOND)
         THEN 1 ELSE 0 END AS est_en_ligne,
       EXISTS(
         SELECT 1 FROM saisies_messagerie s
         WHERE s.conversation_id = ? AND s.utilisateur_id = u.id
           AND s.date_expiration > CURRENT_TIMESTAMP
       ) AS est_en_train_ecrire,
       EXISTS(
         SELECT 1 FROM blocages_messagerie b
         WHERE b.bloqueur_id = ? AND b.bloque_id = u.id
       ) AS bloque_par_moi,
       EXISTS(
         SELECT 1 FROM blocages_messagerie b
         WHERE b.bloqueur_id = u.id AND b.bloque_id = ?
       ) AS je_suis_bloque,
       EXISTS(
         SELECT 1 FROM relations_utilisateurs r
         WHERE r.cle_relation = CONCAT(LEAST(?, u.id), ':', GREATEST(?, u.id))
           AND r.statut = 'ACCEPTEE'
       ) AS relation_acceptee
     FROM participants_conversation p
     JOIN utilisateurs u ON u.id = p.utilisateur_id
     LEFT JOIN presences_messagerie pr ON pr.utilisateur_id = u.id
     WHERE p.conversation_id = ? AND p.utilisateur_id <> ? AND p.est_actif = 1
     LIMIT 1`,
    [conversation.id, utilisateurId, utilisateurId, utilisateurId, utilisateurId, conversation.id, utilisateurId],
  );
  return lignes[0] || {
    est_en_ligne: 0,
    est_en_train_ecrire: 0,
    bloque_par_moi: 0,
    je_suis_bloque: 0,
    relation_acceptee: 0,
  };
}

export async function mettreAJourSaisie(code, utilisateurId, actif) {
  const conversation = await conversationAccessible(code, utilisateurId);
  if (!actif) {
    await baseDeDonnees.execute(
      'DELETE FROM saisies_messagerie WHERE conversation_id = ? AND utilisateur_id = ?',
      [conversation.id, utilisateurId],
    );
    return { actif: false };
  }
  await baseDeDonnees.execute(
    `INSERT INTO saisies_messagerie (conversation_id, utilisateur_id, date_expiration)
     VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 6 SECOND))
     ON DUPLICATE KEY UPDATE date_expiration = VALUES(date_expiration)`,
    [conversation.id, utilisateurId],
  );
  return { actif: true };
}

export async function modifierBlocage(utilisateurId, codeContact, bloque) {
  const [contacts] = await baseDeDonnees.execute(
    `SELECT id, code_utilisateur, nom_affichage FROM utilisateurs
     WHERE code_utilisateur = ? AND id <> ? AND statut_compte = 'ACTIF' LIMIT 1`,
    [codeContact.toUpperCase(), utilisateurId],
  );
  const contact = contacts[0];
  if (!contact) throw new ErreurApi(404, 'Contact introuvable.');
  if (bloque) {
    await baseDeDonnees.execute(
      `INSERT INTO blocages_messagerie (bloqueur_id, bloque_id)
       VALUES (?, ?) ON DUPLICATE KEY UPDATE date_creation = date_creation`,
      [utilisateurId, contact.id],
    );
  } else {
    await baseDeDonnees.execute(
      'DELETE FROM blocages_messagerie WHERE bloqueur_id = ? AND bloque_id = ?',
      [utilisateurId, contact.id],
    );
  }
  return {
    code_utilisateur: contact.code_utilisateur,
    nom_affichage: contact.nom_affichage,
    bloque,
  };
}

export async function envoyerMessage(code, utilisateur, donnees) {
  const conversation = await conversationAccessible(code, utilisateur.id);
  const connexion = await baseDeDonnees.getConnection();
  try {
    await connexion.beginTransaction();
    const [participants] = await connexion.execute(
      `SELECT utilisateur_id FROM participants_conversation
       WHERE conversation_id = ? AND utilisateur_id <> ? AND est_actif = 1 LIMIT 1`,
      [conversation.id, utilisateur.id],
    );
    if (!participants[0]) throw new ErreurApi(404, 'Destinataire introuvable.');
    await verifierAbsenceBlocage(utilisateur.id, participants[0].utilisateur_id, connexion);
    await verifierRelationAcceptee(utilisateur.id, participants[0].utilisateur_id, connexion);

    const duree = donnees.dureeEphemere ? dureesEphemeres[donnees.dureeEphemere] : null;
    await connexion.execute(
      `INSERT INTO messages_prives
        (id, code_message, conversation_id, auteur_id, contenu, url_media, type_media,
         nom_media, type_mime, taille_octets, est_ephemere, date_expiration)
       VALUES (0, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, TIMESTAMPADD(SECOND, ?, CURRENT_TIMESTAMP))`,
      [
        conversation.id,
        utilisateur.id,
        donnees.contenu ?? null,
        donnees.urlMedia ?? null,
        donnees.typeMedia ?? null,
        donnees.nomMedia ?? null,
        donnees.typeMime ?? null,
        donnees.tailleOctets ?? null,
        duree ? 1 : 0,
        duree,
      ],
    );
    const [messages] = await connexion.query(
      `SELECT m.code_message, m.contenu, m.url_media, m.type_media, m.nom_media,
        m.type_mime, m.taille_octets, m.est_ephemere,
        m.date_expiration, m.date_creation,
        u.code_utilisateur AS code_auteur, u.nom_affichage AS nom_auteur,
        'ENVOYE' AS statut_reception
       FROM messages_prives m JOIN utilisateurs u ON u.id = m.auteur_id
       WHERE m.id = @campushub_dernier_id`,
    );
    await connexion.execute(
      `INSERT INTO notifications
        (id, code_notification, destinataire_id, acteur_id, type_notification, titre, message, url_action)
       SELECT 0, '', p.utilisateur_id, ?, 'MESSAGE', ?, ?, '/messages'
       FROM participants_conversation p
       WHERE p.conversation_id = ? AND p.utilisateur_id <> ? AND p.est_actif = 1`,
      [
        utilisateur.id,
        `Nouveau message de ${utilisateur.nom_affichage}`,
        duree ? 'Vous avez reçu un message éphémère.' : donnees.contenu?.slice(0, 180) || 'Vous avez reçu une photo.',
        conversation.id,
        utilisateur.id,
      ],
    );
    await connexion.execute(
      `UPDATE participants_conversation SET date_derniere_lecture = CURRENT_TIMESTAMP
       WHERE conversation_id = ? AND utilisateur_id = ?`, [conversation.id, utilisateur.id],
    );
    await connexion.execute(
      'DELETE FROM saisies_messagerie WHERE conversation_id = ? AND utilisateur_id = ?',
      [conversation.id, utilisateur.id],
    );
    await connexion.commit();
    return messages[0];
  } catch (erreur) {
    await connexion.rollback();
    throw erreur;
  } finally { connexion.release(); }
}
