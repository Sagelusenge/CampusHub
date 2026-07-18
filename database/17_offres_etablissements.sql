-- ============================================================
-- CampusHub - 17. Offres publiées par les établissements
-- À exécuter après 16_etudiants_demo.sql
-- ============================================================

USE campushub;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO compteurs_sequences (nom_sequence, derniere_valeur)
VALUES ('offres_etablissements', 0)
ON DUPLICATE KEY UPDATE nom_sequence = VALUES(nom_sequence);

CREATE TABLE IF NOT EXISTS offres_etablissements (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_offre VARCHAR(30) NOT NULL,
  universite_id BIGINT UNSIGNED NOT NULL,
  auteur_id BIGINT UNSIGNED NOT NULL,
  titre VARCHAR(220) NOT NULL,
  type_offre ENUM('INSCRIPTION', 'BOURSE', 'FORMATION', 'STAGE', 'EMPLOI', 'EVENEMENT', 'AUTRE') NOT NULL,
  public_cible ENUM('TOUS', 'ETUDIANTS', 'ELEVES', 'DIPLOMES', 'PARENTS') NOT NULL DEFAULT 'TOUS',
  description TEXT NOT NULL,
  conditions TEXT NULL,
  modalite ENUM('PRESENTIEL', 'EN_LIGNE', 'HYBRIDE') NOT NULL DEFAULT 'PRESENTIEL',
  ville VARCHAR(100) NULL,
  province VARCHAR(100) NULL,
  url_candidature VARCHAR(500) NULL,
  email_contact VARCHAR(190) NULL,
  url_image VARCHAR(500) NULL,
  date_debut DATE NULL,
  date_limite DATE NULL,
  statut ENUM('BROUILLON', 'PUBLIEE', 'CLOTUREE', 'RETIREE') NOT NULL DEFAULT 'BROUILLON',
  date_publication DATETIME NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_offres_code UNIQUE (code_offre),
  CONSTRAINT fk_offres_universite FOREIGN KEY (universite_id) REFERENCES universites(id) ON DELETE CASCADE,
  CONSTRAINT fk_offres_auteur FOREIGN KEY (auteur_id) REFERENCES utilisateurs(id) ON DELETE RESTRICT,
  CONSTRAINT ck_offres_dates CHECK (date_limite IS NULL OR date_debut IS NULL OR date_limite >= date_debut),
  INDEX idx_offres_publiques (statut, date_limite, date_publication),
  INDEX idx_offres_universite (universite_id, statut, date_creation),
  INDEX idx_offres_type (type_offre, public_cible)
) ENGINE=InnoDB;

DELIMITER $$

DROP TRIGGER IF EXISTS trg_offres_avant_insertion$$
CREATE TRIGGER trg_offres_avant_insertion
BEFORE INSERT ON offres_etablissements FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences
  SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
  WHERE nom_sequence = 'offres_etablissements';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET NEW.code_offre = CONCAT('OFF', LPAD(NEW.id, 5, '0'), YEAR(NEW.date_creation));
  IF NEW.statut = 'PUBLIEE' AND NEW.date_publication IS NULL THEN
    SET NEW.date_publication = CURRENT_TIMESTAMP;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_offres_avant_modification$$
CREATE TRIGGER trg_offres_avant_modification
BEFORE UPDATE ON offres_etablissements FOR EACH ROW
BEGIN
  IF NEW.statut = 'PUBLIEE' AND OLD.statut <> 'PUBLIEE' AND NEW.date_publication IS NULL THEN
    SET NEW.date_publication = CURRENT_TIMESTAMP;
  END IF;
END$$

DELIMITER ;

CREATE OR REPLACE VIEW vue_offres_etablissements AS
SELECT
  o.id, o.code_offre, o.titre, o.type_offre, o.public_cible, o.description,
  o.conditions, o.modalite, o.ville, o.province, o.url_candidature,
  o.email_contact, o.url_image, o.date_debut, o.date_limite, o.statut,
  o.date_publication, o.date_creation, o.date_modification,
  u.id AS universite_id, u.code_universite, u.nom AS nom_etablissement,
  u.sigle, u.slug, u.categorie_etablissement, u.type_universite,
  u.url_logo, u.statut_verification,
  a.code_utilisateur AS code_auteur, a.nom_affichage AS nom_auteur,
  CASE WHEN o.date_limite IS NOT NULL AND o.date_limite < CURRENT_DATE THEN 1 ELSE 0 END AS est_expiree
FROM offres_etablissements o
JOIN universites u ON u.id = o.universite_id
JOIN utilisateurs a ON a.id = o.auteur_id;

-- Quelques offres de démonstration. Elles sont créées uniquement si les
-- établissements et leurs gestionnaires existent déjà.
INSERT INTO offres_etablissements (
  id, code_offre, universite_id, auteur_id, titre, type_offre, public_cible,
  description, conditions, modalite, ville, province, url_candidature,
  email_contact, url_image, date_debut, date_limite, statut
)
SELECT 0, '', u.id, m.utilisateur_id,
  CASE u.categorie_etablissement
    WHEN 'ECOLE_SECONDAIRE' THEN 'Inscriptions scolaires ouvertes pour la prochaine rentrée'
    ELSE 'Admissions ouvertes pour la prochaine année académique'
  END,
  'INSCRIPTION',
  CASE u.categorie_etablissement WHEN 'ECOLE_SECONDAIRE' THEN 'ELEVES' ELSE 'ETUDIANTS' END,
  CASE u.categorie_etablissement
    WHEN 'ECOLE_SECONDAIRE' THEN 'Les familles peuvent déposer le dossier de leur enfant et découvrir les options proposées par notre école.'
    ELSE 'Découvrez nos programmes et déposez votre dossier de candidature auprès de notre service des admissions.'
  END,
  'Dossier scolaire, pièce d’identité et coordonnées valides requis.',
  'PRESENTIEL', u.ville, u.province, NULL, u.email, u.url_couverture,
  CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 90 DAY), 'PUBLIEE'
FROM universites u
JOIN membres_universite m ON m.universite_id = u.id
WHERE u.slug IN ('institut-superieur-informatique-gestion', 'universite-demonstration-grands-lacs', 'complexe-scolaire-demonstration-amani')
  AND m.est_proprietaire = 1
  AND NOT EXISTS (
    SELECT 1 FROM offres_etablissements o
    WHERE o.universite_id = u.id AND o.type_offre = 'INSCRIPTION'
  );

SELECT 'Module des offres d’établissement créé avec succès' AS message;
