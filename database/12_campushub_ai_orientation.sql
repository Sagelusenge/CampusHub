-- CampusHub - 12. Conseiller d'orientation GPT-5.6
-- À exécuter après 11_etablissements_cartes_et_stories.sql.
USE campushub;

INSERT INTO compteurs_sequences (nom_sequence, derniere_valeur)
VALUES ('dossiers_orientation', 0)
ON DUPLICATE KEY UPDATE nom_sequence = VALUES(nom_sequence);

CREATE TABLE IF NOT EXISTS dossiers_orientation (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_dossier VARCHAR(30) NOT NULL,
  utilisateur_id BIGINT UNSIGNED NOT NULL,
  objectif VARCHAR(500) NOT NULL,
  criteres JSON NOT NULL,
  bulletin_url VARCHAR(500) NULL,
  analyse_bulletin JSON NULL,
  recommandations JSON NULL,
  reponse_ia MEDIUMTEXT NULL,
  modele_ia VARCHAR(80) NOT NULL DEFAULT 'gpt-5.6',
  mode_execution ENUM('GPT_5_6', 'DEMONSTRATION') NOT NULL DEFAULT 'GPT_5_6',
  statut ENUM('EN_COURS', 'TERMINE', 'ARCHIVE') NOT NULL DEFAULT 'TERMINE',
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_dossiers_orientation_code UNIQUE (code_dossier),
  CONSTRAINT fk_dossiers_orientation_utilisateur FOREIGN KEY (utilisateur_id)
    REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_dossiers_orientation_utilisateur_date (utilisateur_id, date_creation DESC),
  INDEX idx_dossiers_orientation_mode_date (mode_execution, date_creation DESC)
) ENGINE=InnoDB;

DELIMITER $$

DROP TRIGGER IF EXISTS trg_dossiers_orientation_avant_insertion$$
CREATE TRIGGER trg_dossiers_orientation_avant_insertion
BEFORE INSERT ON dossiers_orientation FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences
  SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
  WHERE nom_sequence = 'dossiers_orientation';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.code_dossier = CONCAT('ORI', LPAD(NEW.id, 5, '0'), YEAR(CURRENT_TIMESTAMP));
END$$

DELIMITER ;

CREATE OR REPLACE VIEW vue_impact_orientation_ia AS
SELECT
  DATE(date_creation) AS jour,
  mode_execution,
  COUNT(*) AS nombre_orientations,
  COUNT(DISTINCT utilisateur_id) AS utilisateurs_uniques
FROM dossiers_orientation
GROUP BY DATE(date_creation), mode_execution;

SELECT 'Conseiller CampusHub AI prêt' AS message;
