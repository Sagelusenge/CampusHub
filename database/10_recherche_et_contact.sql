-- CampusHub - 10. Recherche intelligente et contact administratif
-- À exécuter après 09_messagerie_privee.sql.
USE campushub;

INSERT INTO compteurs_sequences (nom_sequence, derniere_valeur) VALUES
  ('recherches_utilisateurs', 0), ('demandes_contact', 0)
ON DUPLICATE KEY UPDATE nom_sequence = VALUES(nom_sequence);

CREATE TABLE IF NOT EXISTS recherches_utilisateurs (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_recherche VARCHAR(30) NOT NULL,
  utilisateur_id BIGINT UNSIGNED NOT NULL,
  requete VARCHAR(200) NOT NULL,
  nombre_resultats SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_recherches_code UNIQUE (code_recherche),
  CONSTRAINT fk_recherches_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_recherches_utilisateur_date (utilisateur_id, date_creation DESC),
  INDEX idx_recherches_requete (requete)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS demandes_contact (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_contact VARCHAR(30) NOT NULL,
  nom VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  sujet VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  statut ENUM('NOUVEAU', 'EN_COURS', 'TRAITE', 'ARCHIVE') NOT NULL DEFAULT 'NOUVEAU',
  reponse_admin TEXT NULL,
  traite_par_id BIGINT UNSIGNED NULL,
  date_traitement DATETIME NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_contacts_code UNIQUE (code_contact),
  CONSTRAINT fk_contacts_admin FOREIGN KEY (traite_par_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  INDEX idx_contacts_statut_date (statut, date_creation DESC)
) ENGINE=InnoDB;

DELIMITER $$

DROP TRIGGER IF EXISTS trg_recherches_avant_insertion$$
CREATE TRIGGER trg_recherches_avant_insertion
BEFORE INSERT ON recherches_utilisateurs FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
  WHERE nom_sequence = 'recherches_utilisateurs';
  SET NEW.id = LAST_INSERT_ID();
  SET NEW.code_recherche = CONCAT('RCH', LPAD(NEW.id, 5, '0'), YEAR(CURRENT_TIMESTAMP));
END$$

DROP TRIGGER IF EXISTS trg_contacts_avant_insertion$$
CREATE TRIGGER trg_contacts_avant_insertion
BEFORE INSERT ON demandes_contact FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
  WHERE nom_sequence = 'demandes_contact';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.code_contact = CONCAT('CNT', LPAD(NEW.id, 5, '0'), YEAR(CURRENT_TIMESTAMP));
END$$

DELIMITER ;

SELECT 'Recherche intelligente et contact CampusHub créés avec succès' AS message;
