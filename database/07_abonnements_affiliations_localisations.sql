-- CampusHub - 07. Abonnements, affiliations et suggestions de localisation
-- À exécuter après les scripts 01 à 06.
USE campushub;

ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS pays VARCHAR(100) NULL AFTER biographie;
ALTER TABLE notifications MODIFY COLUMN type_notification
  ENUM('ABONNEMENT', 'AFFILIATION', 'JAIME', 'COMMENTAIRE', 'ANNONCE', 'MODERATION', 'SYSTEME') NOT NULL;

INSERT INTO compteurs_sequences (nom_sequence, derniere_valeur) VALUES
  ('plans_abonnement', 0), ('paiements_abonnement', 0),
  ('abonnements_universite', 0), ('demandes_affiliation_etudiante', 0),
  ('suggestions_localisation', 0)
ON DUPLICATE KEY UPDATE nom_sequence = VALUES(nom_sequence);

CREATE TABLE IF NOT EXISTS plans_abonnement (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_plan VARCHAR(30) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  prix_acces DECIMAL(10,2) NOT NULL DEFAULT 13.00,
  prix_certification DECIMAL(10,2) NOT NULL DEFAULT 7.00,
  prix_total DECIMAL(10,2) GENERATED ALWAYS AS (prix_acces + prix_certification) STORED,
  duree_jours SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  avantages JSON NOT NULL,
  est_actif TINYINT(1) NOT NULL DEFAULT 1,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_plans_code UNIQUE (code_plan)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS paiements_abonnement (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_paiement VARCHAR(30) NOT NULL,
  utilisateur_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  montant DECIMAL(10,2) NOT NULL,
  devise CHAR(3) NOT NULL DEFAULT 'USD',
  moyen_paiement ENUM('MOBILE_MONEY', 'CARTE', 'VIREMENT', 'ESPECES', 'AUTRE') NOT NULL,
  reference_paiement VARCHAR(120) NOT NULL,
  url_preuve VARCHAR(500) NULL,
  statut ENUM('EN_ATTENTE', 'VALIDE', 'REJETE') NOT NULL DEFAULT 'EN_ATTENTE',
  commentaire_admin VARCHAR(1000) NULL,
  traite_par_id BIGINT UNSIGNED NULL,
  date_traitement DATETIME NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_paiements_code UNIQUE (code_paiement),
  CONSTRAINT uq_paiements_reference UNIQUE (reference_paiement),
  CONSTRAINT fk_paiements_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_paiements_plan FOREIGN KEY (plan_id) REFERENCES plans_abonnement(id),
  CONSTRAINT fk_paiements_admin FOREIGN KEY (traite_par_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  INDEX idx_paiements_statut_date (statut, date_creation)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS abonnements_universite (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_abonnement VARCHAR(30) NOT NULL,
  utilisateur_id BIGINT UNSIGNED NOT NULL,
  universite_id BIGINT UNSIGNED NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  paiement_id BIGINT UNSIGNED NOT NULL,
  date_debut DATETIME NOT NULL,
  date_fin DATETIME NOT NULL,
  statut ENUM('ACTIF', 'EXPIRE', 'SUSPENDU') NOT NULL DEFAULT 'ACTIF',
  renouvellement_automatique TINYINT(1) NOT NULL DEFAULT 0,
  certification_incluse TINYINT(1) NOT NULL DEFAULT 1,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_abonnements_code UNIQUE (code_abonnement),
  CONSTRAINT uq_abonnements_paiement UNIQUE (paiement_id),
  CONSTRAINT fk_abonnements_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_abonnements_universite FOREIGN KEY (universite_id) REFERENCES universites(id) ON DELETE SET NULL,
  CONSTRAINT fk_abonnements_plan FOREIGN KEY (plan_id) REFERENCES plans_abonnement(id),
  CONSTRAINT fk_abonnements_paiement FOREIGN KEY (paiement_id) REFERENCES paiements_abonnement(id),
  INDEX idx_abonnements_fin (statut, date_fin)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS demandes_affiliation_etudiante (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_demande VARCHAR(30) NOT NULL,
  etudiant_id BIGINT UNSIGNED NOT NULL,
  universite_id BIGINT UNSIGNED NOT NULL,
  filiere_id BIGINT UNSIGNED NULL,
  matricule_etudiant VARCHAR(80) NULL,
  message_etudiant VARCHAR(2000) NULL,
  statut ENUM('EN_ATTENTE', 'ACCEPTEE', 'REJETEE', 'ANNULEE') NOT NULL DEFAULT 'EN_ATTENTE',
  reponse_universite VARCHAR(2000) NULL,
  traite_par_id BIGINT UNSIGNED NULL,
  date_traitement DATETIME NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_affiliations_code UNIQUE (code_demande),
  CONSTRAINT fk_affiliations_etudiant FOREIGN KEY (etudiant_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_affiliations_universite FOREIGN KEY (universite_id) REFERENCES universites(id) ON DELETE CASCADE,
  CONSTRAINT fk_affiliations_filiere FOREIGN KEY (filiere_id) REFERENCES filieres(id) ON DELETE SET NULL,
  CONSTRAINT fk_affiliations_gestionnaire FOREIGN KEY (traite_par_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  INDEX idx_affiliations_etudiant (etudiant_id, statut),
  INDEX idx_affiliations_universite_statut (universite_id, statut, date_creation)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS suggestions_localisation (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_suggestion VARCHAR(30) NOT NULL,
  utilisateur_id BIGINT UNSIGNED NULL,
  pays VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  ville_proposee VARCHAR(100) NOT NULL,
  email_contact VARCHAR(190) NULL,
  statut ENUM('EN_ATTENTE', 'ACCEPTEE', 'REJETEE') NOT NULL DEFAULT 'EN_ATTENTE',
  date_traitement DATETIME NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_suggestions_code UNIQUE (code_suggestion),
  CONSTRAINT fk_suggestions_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  INDEX idx_suggestions_statut (statut, date_creation)
) ENGINE=InnoDB;

DELIMITER $$
DROP TRIGGER IF EXISTS trg_plans_avant_insertion$$
CREATE TRIGGER trg_plans_avant_insertion BEFORE INSERT ON plans_abonnement FOR EACH ROW BEGIN
  UPDATE compteurs_sequences SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1) WHERE nom_sequence = 'plans_abonnement';
  SET NEW.id = LAST_INSERT_ID(); SET NEW.code_plan = CONCAT('PLN', LPAD(NEW.id, 4, '0'), YEAR(CURRENT_TIMESTAMP));
END$$
DROP TRIGGER IF EXISTS trg_paiements_avant_insertion$$
CREATE TRIGGER trg_paiements_avant_insertion BEFORE INSERT ON paiements_abonnement FOR EACH ROW BEGIN
  UPDATE compteurs_sequences SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1) WHERE nom_sequence = 'paiements_abonnement';
  SET NEW.id = LAST_INSERT_ID(); SET NEW.code_paiement = CONCAT('PAY', LPAD(NEW.id, 4, '0'), YEAR(CURRENT_TIMESTAMP));
END$$
DROP TRIGGER IF EXISTS trg_abonnements_avant_insertion$$
CREATE TRIGGER trg_abonnements_avant_insertion BEFORE INSERT ON abonnements_universite FOR EACH ROW BEGIN
  UPDATE compteurs_sequences SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1) WHERE nom_sequence = 'abonnements_universite';
  SET NEW.id = LAST_INSERT_ID(); SET NEW.code_abonnement = CONCAT('ABO', LPAD(NEW.id, 4, '0'), YEAR(CURRENT_TIMESTAMP));
END$$
DROP TRIGGER IF EXISTS trg_affiliations_avant_insertion$$
CREATE TRIGGER trg_affiliations_avant_insertion BEFORE INSERT ON demandes_affiliation_etudiante FOR EACH ROW BEGIN
  UPDATE compteurs_sequences SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1) WHERE nom_sequence = 'demandes_affiliation_etudiante';
  SET NEW.id = LAST_INSERT_ID(); SET NEW.code_demande = CONCAT('AFF', LPAD(NEW.id, 4, '0'), YEAR(CURRENT_TIMESTAMP));
END$$
DROP TRIGGER IF EXISTS trg_suggestions_avant_insertion$$
CREATE TRIGGER trg_suggestions_avant_insertion BEFORE INSERT ON suggestions_localisation FOR EACH ROW BEGIN
  UPDATE compteurs_sequences SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1) WHERE nom_sequence = 'suggestions_localisation';
  SET NEW.id = LAST_INSERT_ID(); SET NEW.code_suggestion = CONCAT('LOC', LPAD(NEW.id, 4, '0'), YEAR(CURRENT_TIMESTAMP));
END$$
DELIMITER ;

INSERT INTO plans_abonnement (id, code_plan, nom, prix_acces, prix_certification, duree_jours, avantages)
SELECT 0, '', 'CampusHub Certifié', 13.00, 7.00, 30,
  JSON_ARRAY('Fiche universitaire complète', 'Gestion du catalogue académique',
    'Demandes étudiantes', 'Publications et statistiques', 'Badge CampusHub Certifié',
    'Priorité dans l’annuaire', 'Alertes et support prioritaire')
WHERE NOT EXISTS (SELECT 1 FROM plans_abonnement WHERE nom = 'CampusHub Certifié');

CREATE OR REPLACE VIEW vue_abonnements_universites AS
SELECT a.id, a.code_abonnement, a.utilisateur_id, a.universite_id,
  u.code_universite, u.nom AS nom_universite, ut.code_utilisateur,
  ut.nom_affichage, ut.email, p.nom AS nom_plan, p.prix_total,
  a.date_debut, a.date_fin,
  CASE WHEN a.date_fin < CURRENT_TIMESTAMP THEN 'EXPIRE' ELSE a.statut END AS statut,
  GREATEST(DATEDIFF(a.date_fin, CURRENT_TIMESTAMP), 0) AS jours_restants,
  a.certification_incluse, a.renouvellement_automatique
FROM abonnements_universite a
JOIN utilisateurs ut ON ut.id = a.utilisateur_id
JOIN plans_abonnement p ON p.id = a.plan_id
LEFT JOIN universites u ON u.id = a.universite_id;
