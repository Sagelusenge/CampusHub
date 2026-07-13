-- CampusHub - 09. Messagerie privée du réseau social
-- À exécuter après 08_packs_et_certification.sql.
USE campushub;

ALTER TABLE notifications MODIFY COLUMN type_notification
  ENUM('ABONNEMENT', 'AFFILIATION', 'JAIME', 'COMMENTAIRE', 'ANNONCE',
       'MESSAGE', 'MODERATION', 'SYSTEME') NOT NULL;

INSERT INTO compteurs_sequences (nom_sequence, derniere_valeur) VALUES
  ('conversations', 0), ('messages_prives', 0)
ON DUPLICATE KEY UPDATE nom_sequence = VALUES(nom_sequence);

CREATE TABLE IF NOT EXISTS conversations (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_conversation VARCHAR(30) NOT NULL,
  type_conversation ENUM('DIRECTE', 'GROUPE') NOT NULL DEFAULT 'DIRECTE',
  cle_directe VARCHAR(80) NULL,
  titre VARCHAR(150) NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_conversations_code UNIQUE (code_conversation),
  CONSTRAINT uq_conversations_directe UNIQUE (cle_directe),
  INDEX idx_conversations_activite (date_modification DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS participants_conversation (
  conversation_id BIGINT UNSIGNED NOT NULL,
  utilisateur_id BIGINT UNSIGNED NOT NULL,
  date_rejoint DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_derniere_lecture DATETIME NULL,
  est_actif TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (conversation_id, utilisateur_id),
  CONSTRAINT fk_participants_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_participants_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_participants_utilisateur (utilisateur_id, est_actif)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS messages_prives (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_message VARCHAR(30) NOT NULL,
  conversation_id BIGINT UNSIGNED NOT NULL,
  auteur_id BIGINT UNSIGNED NOT NULL,
  contenu TEXT NULL,
  url_media VARCHAR(500) NULL,
  type_media ENUM('IMAGE', 'DOCUMENT') NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  date_suppression DATETIME NULL,
  CONSTRAINT uq_messages_prives_code UNIQUE (code_message),
  CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_auteur FOREIGN KEY (auteur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT chk_messages_contenu CHECK (contenu IS NOT NULL OR url_media IS NOT NULL),
  INDEX idx_messages_conversation_date (conversation_id, date_creation)
) ENGINE=InnoDB;

DELIMITER $$

DROP TRIGGER IF EXISTS trg_conversations_avant_insertion$$
CREATE TRIGGER trg_conversations_avant_insertion
BEFORE INSERT ON conversations FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences
  SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
  WHERE nom_sequence = 'conversations';
  SET NEW.id = LAST_INSERT_ID();
  SET NEW.code_conversation = CONCAT('CVS', LPAD(NEW.id, 4, '0'), YEAR(CURRENT_TIMESTAMP));
END$$

DROP TRIGGER IF EXISTS trg_messages_prives_avant_insertion$$
CREATE TRIGGER trg_messages_prives_avant_insertion
BEFORE INSERT ON messages_prives FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences
  SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
  WHERE nom_sequence = 'messages_prives';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.code_message = CONCAT('MSG', LPAD(NEW.id, 5, '0'), YEAR(CURRENT_TIMESTAMP));
END$$

DROP TRIGGER IF EXISTS trg_messages_prives_apres_insertion$$
CREATE TRIGGER trg_messages_prives_apres_insertion
AFTER INSERT ON messages_prives FOR EACH ROW
BEGIN
  UPDATE conversations SET date_modification = CURRENT_TIMESTAMP WHERE id = NEW.conversation_id;
END$$

DELIMITER ;

SELECT 'Messagerie privée CampusHub créée avec succès' AS message;
