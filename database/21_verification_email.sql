-- ============================================================
-- CampusHub - 21. Vérification des adresses e-mail
-- Codes à six chiffres, durée limitée et nombre d'essais borné.
-- ============================================================

USE campushub;

INSERT INTO compteurs_sequences (nom_sequence, derniere_valeur)
VALUES ('codes_verification_email', 0)
ON DUPLICATE KEY UPDATE nom_sequence = VALUES(nom_sequence);

CREATE TABLE IF NOT EXISTS codes_verification_email (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_reference VARCHAR(30) NOT NULL,
  utilisateur_id BIGINT UNSIGNED NOT NULL,
  code_hash CHAR(64) NOT NULL,
  date_expiration DATETIME NOT NULL,
  nombre_tentatives TINYINT UNSIGNED NOT NULL DEFAULT 0,
  date_utilisation DATETIME NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_codes_verification_reference UNIQUE (code_reference),
  CONSTRAINT fk_codes_verification_utilisateur
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_codes_verification_utilisateur
    (utilisateur_id, date_utilisation, date_expiration, date_creation)
) ENGINE=InnoDB;

DELIMITER $$

DROP TRIGGER IF EXISTS trg_codes_verification_email_avant_insertion$$
CREATE TRIGGER trg_codes_verification_email_avant_insertion
BEFORE INSERT ON codes_verification_email
FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences
    SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
    WHERE nom_sequence = 'codes_verification_email';
  SET NEW.id = LAST_INSERT_ID();
  SET NEW.code_reference = CONCAT(
    'CVE',
    LPAD(NEW.id, 6, '0'),
    YEAR(COALESCE(NEW.date_creation, CURRENT_TIMESTAMP))
  );
END$$

DELIMITER ;
