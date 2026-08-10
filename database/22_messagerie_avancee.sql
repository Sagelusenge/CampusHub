-- ============================================================
-- CampusHub - 22. Messagerie avancée
-- Présence, saisie en cours, blocage et messages éphémères.
-- À exécuter après 21_verification_email.sql.
-- ============================================================

USE campushub;

CREATE TABLE IF NOT EXISTS presences_messagerie (
  utilisateur_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  date_derniere_presence DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_presences_utilisateur
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_presences_date (date_derniere_presence)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS saisies_messagerie (
  conversation_id BIGINT UNSIGNED NOT NULL,
  utilisateur_id BIGINT UNSIGNED NOT NULL,
  date_expiration DATETIME NOT NULL,
  PRIMARY KEY (conversation_id, utilisateur_id),
  CONSTRAINT fk_saisies_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_saisies_utilisateur
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_saisies_expiration (date_expiration)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS blocages_messagerie (
  bloqueur_id BIGINT UNSIGNED NOT NULL,
  bloque_id BIGINT UNSIGNED NOT NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (bloqueur_id, bloque_id),
  CONSTRAINT fk_blocages_bloqueur
    FOREIGN KEY (bloqueur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_blocages_bloque
    FOREIGN KEY (bloque_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT chk_blocage_distinct CHECK (bloqueur_id <> bloque_id),
  INDEX idx_blocages_bloque (bloque_id, bloqueur_id)
) ENGINE=InnoDB;

ALTER TABLE messages_prives
  ADD COLUMN est_ephemere TINYINT(1) NOT NULL DEFAULT 0 AFTER type_media,
  ADD COLUMN date_expiration DATETIME NULL AFTER est_ephemere,
  ADD INDEX idx_messages_expiration (date_expiration);

SELECT 'Messagerie avancée CampusHub prête' AS message;
