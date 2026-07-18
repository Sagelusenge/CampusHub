-- ============================================================
-- CampusHub - 14. Copilote IA pour les établissements
-- À exécuter après 13_donnees_demo_campushub_ai.sql
-- ============================================================

USE campushub;

INSERT INTO compteurs_sequences (nom_sequence, derniere_valeur)
VALUES ('generations_copilote_institution', 0)
ON DUPLICATE KEY UPDATE nom_sequence = VALUES(nom_sequence);

CREATE TABLE IF NOT EXISTS generations_copilote_institution (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_generation VARCHAR(30) NOT NULL,
  universite_id BIGINT UNSIGNED NOT NULL,
  utilisateur_id BIGINT UNSIGNED NOT NULL,
  type_generation ENUM('PUBLICATION', 'PRESENTATION_FILIERE', 'ADMISSION', 'DIAGNOSTIC_FICHE') NOT NULL,
  demande TEXT NOT NULL,
  contexte JSON NOT NULL,
  resultat LONGTEXT NOT NULL,
  modele_ia VARCHAR(80) NOT NULL,
  mode_execution ENUM('GPT_5_6', 'DEMONSTRATION') NOT NULL DEFAULT 'DEMONSTRATION',
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_generations_copilote_code UNIQUE (code_generation),
  CONSTRAINT fk_generations_copilote_universite FOREIGN KEY (universite_id) REFERENCES universites(id) ON DELETE CASCADE,
  CONSTRAINT fk_generations_copilote_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_generations_copilote_universite_date (universite_id, date_creation DESC)
) ENGINE=InnoDB;

DELIMITER $$

DROP TRIGGER IF EXISTS trg_generations_copilote_avant_insertion$$
CREATE TRIGGER trg_generations_copilote_avant_insertion
BEFORE INSERT ON generations_copilote_institution FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences
  SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
  WHERE nom_sequence = 'generations_copilote_institution';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET NEW.code_generation = CONCAT('COP', LPAD(NEW.id, 5, '0'), YEAR(NEW.date_creation));
END$$

DELIMITER ;

CREATE OR REPLACE VIEW vue_usage_copilote_institution AS
SELECT
  u.code_universite,
  u.nom AS nom_universite,
  g.type_generation,
  g.mode_execution,
  COUNT(*) AS nombre_generations,
  MAX(g.date_creation) AS derniere_generation
FROM generations_copilote_institution g
JOIN universites u ON u.id = g.universite_id
GROUP BY u.id, u.code_universite, u.nom, g.type_generation, g.mode_execution;

SELECT 'Copilote institutionnel CampusHub créé avec succès' AS message;
