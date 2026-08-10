-- ============================================================
-- CampusHub - 20. Relations, inscriptions en ligne et partenaires
-- À exécuter après 19_options_ecoles_secondaires.sql
-- ============================================================

USE campushub;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO compteurs_sequences (nom_sequence, derniere_valeur) VALUES
  ('relations_utilisateurs', 0),
  ('formulaires_inscription', 0),
  ('demandes_inscription_ligne', 0),
  ('partenaires_universite', 0)
ON DUPLICATE KEY UPDATE nom_sequence = VALUES(nom_sequence);

CREATE TABLE IF NOT EXISTS relations_utilisateurs (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_relation VARCHAR(30) NOT NULL,
  cle_relation VARCHAR(60) NOT NULL,
  demandeur_id BIGINT UNSIGNED NOT NULL,
  destinataire_id BIGINT UNSIGNED NOT NULL,
  message VARCHAR(500) NULL,
  statut ENUM('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'ANNULEE') NOT NULL DEFAULT 'EN_ATTENTE',
  date_reponse DATETIME NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_relations_code UNIQUE (code_relation),
  CONSTRAINT uq_relations_paire UNIQUE (cle_relation),
  CONSTRAINT fk_relations_demandeur FOREIGN KEY (demandeur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_relations_destinataire FOREIGN KEY (destinataire_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT ck_relations_utilisateurs_distincts CHECK (demandeur_id <> destinataire_id),
  INDEX idx_relations_demandeur (demandeur_id, statut),
  INDEX idx_relations_destinataire (destinataire_id, statut)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS formulaires_inscription (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_formulaire VARCHAR(30) NOT NULL,
  universite_id BIGINT UNSIGNED NOT NULL,
  titre VARCHAR(220) NOT NULL,
  description TEXT NULL,
  instructions TEXT NULL,
  champs JSON NOT NULL,
  date_fermeture DATE NULL,
  est_actif TINYINT(1) NOT NULL DEFAULT 0,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_formulaires_code UNIQUE (code_formulaire),
  CONSTRAINT uq_formulaires_universite UNIQUE (universite_id),
  CONSTRAINT fk_formulaires_universite FOREIGN KEY (universite_id) REFERENCES universites(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS demandes_inscription_ligne (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_demande VARCHAR(30) NOT NULL,
  formulaire_id BIGINT UNSIGNED NOT NULL,
  universite_id BIGINT UNSIGNED NOT NULL,
  candidat_id BIGINT UNSIGNED NOT NULL,
  reponses JSON NOT NULL,
  statut ENUM('SOUMISE', 'EN_ETUDE', 'DOCUMENTS_REQUIS', 'ACCEPTEE', 'REFUSEE', 'ANNULEE') NOT NULL DEFAULT 'SOUMISE',
  note_etablissement TEXT NULL,
  traite_par_id BIGINT UNSIGNED NULL,
  date_traitement DATETIME NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_demandes_inscription_code UNIQUE (code_demande),
  CONSTRAINT uq_demandes_candidat_formulaire UNIQUE (formulaire_id, candidat_id),
  CONSTRAINT fk_demandes_formulaire FOREIGN KEY (formulaire_id) REFERENCES formulaires_inscription(id) ON DELETE CASCADE,
  CONSTRAINT fk_demandes_universite FOREIGN KEY (universite_id) REFERENCES universites(id) ON DELETE CASCADE,
  CONSTRAINT fk_demandes_candidat FOREIGN KEY (candidat_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_demandes_traitement FOREIGN KEY (traite_par_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  INDEX idx_demandes_inscription_universite (universite_id, statut, date_creation),
  INDEX idx_demandes_inscription_candidat (candidat_id, date_creation)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS partenaires_universite (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_partenaire VARCHAR(30) NOT NULL,
  universite_id BIGINT UNSIGNED NOT NULL,
  nom VARCHAR(180) NOT NULL,
  categorie ENUM('ACADEMIQUE', 'ENTREPRISE', 'ONG', 'INSTITUTION', 'TECHNOLOGIQUE', 'AUTRE') NOT NULL DEFAULT 'AUTRE',
  description VARCHAR(1000) NULL,
  site_web VARCHAR(500) NULL,
  url_logo VARCHAR(500) NULL,
  est_actif TINYINT(1) NOT NULL DEFAULT 1,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_partenaires_code UNIQUE (code_partenaire),
  CONSTRAINT uq_partenaires_nom UNIQUE (universite_id, nom),
  CONSTRAINT fk_partenaires_universite FOREIGN KEY (universite_id) REFERENCES universites(id) ON DELETE CASCADE,
  INDEX idx_partenaires_publics (universite_id, est_actif, nom)
) ENGINE=InnoDB;

DELIMITER $$

DROP TRIGGER IF EXISTS trg_relations_avant_insertion$$
CREATE TRIGGER trg_relations_avant_insertion
BEFORE INSERT ON relations_utilisateurs FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences
  SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
  WHERE nom_sequence = 'relations_utilisateurs';
  SET NEW.id = LAST_INSERT_ID();
  SET NEW.code_relation = CONCAT('REL', LPAD(NEW.id, 5, '0'), YEAR(CURRENT_DATE));
  SET NEW.cle_relation = CONCAT(LEAST(NEW.demandeur_id, NEW.destinataire_id), ':', GREATEST(NEW.demandeur_id, NEW.destinataire_id));
END$$

DROP TRIGGER IF EXISTS trg_formulaires_inscription_avant_insertion$$
CREATE TRIGGER trg_formulaires_inscription_avant_insertion
BEFORE INSERT ON formulaires_inscription FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences
  SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
  WHERE nom_sequence = 'formulaires_inscription';
  SET NEW.id = LAST_INSERT_ID();
  SET NEW.code_formulaire = CONCAT('FOR', LPAD(NEW.id, 5, '0'), YEAR(CURRENT_DATE));
END$$

DROP TRIGGER IF EXISTS trg_demandes_inscription_avant_insertion$$
CREATE TRIGGER trg_demandes_inscription_avant_insertion
BEFORE INSERT ON demandes_inscription_ligne FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences
  SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
  WHERE nom_sequence = 'demandes_inscription_ligne';
  SET NEW.id = LAST_INSERT_ID();
  SET NEW.code_demande = CONCAT('DIN', LPAD(NEW.id, 5, '0'), YEAR(CURRENT_DATE));
END$$

DROP TRIGGER IF EXISTS trg_partenaires_avant_insertion$$
CREATE TRIGGER trg_partenaires_avant_insertion
BEFORE INSERT ON partenaires_universite FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences
  SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
  WHERE nom_sequence = 'partenaires_universite';
  SET NEW.id = LAST_INSERT_ID();
  SET NEW.code_partenaire = CONCAT('PAR', LPAD(NEW.id, 5, '0'), YEAR(CURRENT_DATE));
END$$

DELIMITER ;

CREATE OR REPLACE VIEW vue_relations_utilisateurs AS
SELECT r.code_relation, r.statut, r.message, r.date_creation, r.date_reponse,
       d.code_utilisateur AS code_demandeur, d.nom_affichage AS nom_demandeur,
       d.url_photo_profil AS photo_demandeur,
       t.code_utilisateur AS code_destinataire, t.nom_affichage AS nom_destinataire,
       t.url_photo_profil AS photo_destinataire
FROM relations_utilisateurs r
JOIN utilisateurs d ON d.id = r.demandeur_id
JOIN utilisateurs t ON t.id = r.destinataire_id;

CREATE OR REPLACE VIEW vue_demandes_inscription_ligne AS
SELECT d.code_demande, d.statut, d.reponses, d.note_etablissement,
       d.date_creation, d.date_traitement,
       u.code_universite, u.nom AS nom_etablissement, u.categorie_etablissement,
       c.code_utilisateur AS code_candidat, c.nom_affichage AS nom_candidat,
       c.email AS email_candidat, NULL AS telephone_candidat,
       f.code_formulaire, f.titre AS titre_formulaire
FROM demandes_inscription_ligne d
JOIN formulaires_inscription f ON f.id = d.formulaire_id
JOIN universites u ON u.id = d.universite_id
JOIN utilisateurs c ON c.id = d.candidat_id;

SELECT 'Réseau, inscriptions en ligne et partenaires prêts' AS message;
