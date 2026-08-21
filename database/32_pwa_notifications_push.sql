-- ============================================================
-- CAMPUSHUB — PWA ET NOTIFICATIONS WEB PUSH
-- ============================================================

USE campushub;

CREATE TABLE IF NOT EXISTS abonnements_push (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  utilisateur_id BIGINT UNSIGNED NOT NULL,
  endpoint_hash CHAR(64) NOT NULL,
  endpoint TEXT NOT NULL,
  cle_p256dh VARCHAR(255) NOT NULL,
  cle_auth VARCHAR(255) NOT NULL,
  date_expiration BIGINT NULL,
  navigateur VARCHAR(500) NULL,
  est_actif TINYINT(1) NOT NULL DEFAULT 1,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_abonnements_push_endpoint UNIQUE (endpoint_hash),
  CONSTRAINT fk_abonnements_push_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_abonnements_push_utilisateur (utilisateur_id, est_actif)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS envois_notifications_push (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  notification_id BIGINT UNSIGNED NOT NULL,
  abonnement_push_id BIGINT UNSIGNED NOT NULL,
  statut ENUM('ENVOYE', 'ECHEC') NOT NULL,
  code_http SMALLINT UNSIGNED NULL,
  erreur VARCHAR(500) NULL,
  date_envoi DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_envois_push_notification_abonnement UNIQUE (notification_id, abonnement_push_id),
  CONSTRAINT fk_envois_push_notification FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  CONSTRAINT fk_envois_push_abonnement FOREIGN KEY (abonnement_push_id) REFERENCES abonnements_push(id) ON DELETE CASCADE,
  INDEX idx_envois_push_statut_date (statut, date_envoi)
) ENGINE=InnoDB;

SELECT 'Abonnements et distribution Web Push CampusHub créés' AS message;
