-- CampusHub - 11. Catégories d'établissements, cartes et stories
-- À exécuter après 10_recherche_et_contact.sql.
USE campushub;

-- MySQL 8.4 ne prend pas en charge `ADD COLUMN IF NOT EXISTS`.
SET @ddl_ajouter_categorie = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'universites'
     AND column_name = 'categorie_etablissement') = 0,
  'ALTER TABLE universites ADD COLUMN categorie_etablissement ENUM(''UNIVERSITE'', ''INSTITUT_SUPERIEUR'', ''ECOLE_SECONDAIRE'') NOT NULL DEFAULT ''UNIVERSITE'' AFTER type_universite',
  'SELECT 1'
);
PREPARE stmt_ajouter_categorie FROM @ddl_ajouter_categorie;
EXECUTE stmt_ajouter_categorie;
DEALLOCATE PREPARE stmt_ajouter_categorie;

-- Classe automatiquement les établissements existants dont le nom est explicite.
UPDATE universites SET categorie_etablissement = 'INSTITUT_SUPERIEUR'
WHERE categorie_etablissement = 'UNIVERSITE'
  AND (nom LIKE '%Institut Supérieur%' OR nom LIKE '%Institut Superieur%');
UPDATE universites SET categorie_etablissement = 'ECOLE_SECONDAIRE'
WHERE categorie_etablissement = 'UNIVERSITE'
  AND (nom LIKE '%École secondaire%' OR nom LIKE '%Ecole secondaire%' OR nom LIKE '%Lycée%' OR nom LIKE '%Lycee%');

INSERT INTO compteurs_sequences (nom_sequence, derniere_valeur)
VALUES ('stories', 0)
ON DUPLICATE KEY UPDATE nom_sequence = VALUES(nom_sequence);

CREATE TABLE IF NOT EXISTS stories (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_story VARCHAR(30) NOT NULL,
  auteur_id BIGINT UNSIGNED NOT NULL,
  type_media ENUM('IMAGE', 'VIDEO') NOT NULL DEFAULT 'IMAGE',
  url_media VARCHAR(500) NOT NULL,
  texte VARCHAR(500) NULL,
  couleur_fond VARCHAR(20) NULL,
  date_expiration DATETIME NOT NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_stories_code UNIQUE (code_story),
  CONSTRAINT fk_stories_auteur FOREIGN KEY (auteur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_stories_expiration_date (date_expiration, date_creation DESC),
  INDEX idx_stories_auteur_date (auteur_id, date_creation DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vues_stories (
  story_id BIGINT UNSIGNED NOT NULL,
  utilisateur_id BIGINT UNSIGNED NOT NULL,
  date_vue DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (story_id, utilisateur_id),
  CONSTRAINT fk_vues_stories_story FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  CONSTRAINT fk_vues_stories_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_vues_stories_utilisateur_date (utilisateur_id, date_vue DESC)
) ENGINE=InnoDB;

DELIMITER $$

DROP TRIGGER IF EXISTS trg_stories_avant_insertion$$
CREATE TRIGGER trg_stories_avant_insertion
BEFORE INSERT ON stories FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
  WHERE nom_sequence = 'stories';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET NEW.date_expiration = COALESCE(NEW.date_expiration, DATE_ADD(NEW.date_creation, INTERVAL 24 HOUR));
  SET NEW.code_story = CONCAT('STO', LPAD(NEW.id, 5, '0'), YEAR(NEW.date_creation));
END$$

DELIMITER ;

CREATE OR REPLACE VIEW vue_universites_resume AS
SELECT
  u.id, u.code_universite, u.nom, u.sigle, u.slug, u.type_universite,
  u.categorie_etablissement, u.statut_verification, u.ville, u.province, u.pays,
  u.latitude, u.longitude, u.url_logo, u.url_couverture,
  u.inscriptions_ouvertes, u.date_debut_inscription, u.date_fin_inscription,
  (SELECT COUNT(*) FROM campus c WHERE c.universite_id = u.id) AS nombre_campus,
  (SELECT COUNT(*) FROM facultes fa WHERE fa.universite_id = u.id) AS nombre_facultes,
  (SELECT COUNT(*) FROM filieres fi WHERE fi.universite_id = u.id AND fi.est_active = 1) AS nombre_filieres,
  (SELECT COUNT(*) FROM profils_etudiants pe WHERE pe.universite_id = u.id AND pe.statut_institution = 'ACTIF') AS nombre_etudiants,
  (SELECT COUNT(*) FROM abonnements_universites au WHERE au.universite_id = u.id) AS nombre_abonnes,
  (SELECT MIN(fi.frais_minimum) FROM filieres fi WHERE fi.universite_id = u.id AND fi.est_active = 1) AS frais_minimum,
  (SELECT MAX(fi.frais_maximum) FROM filieres fi WHERE fi.universite_id = u.id AND fi.est_active = 1) AS frais_maximum
FROM universites u;

SELECT 'Catégories, cartes et stories CampusHub créées avec succès' AS message;
