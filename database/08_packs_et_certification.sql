-- CampusHub - 08. Packs d'abonnement et badge certifié séparé
-- À exécuter après 07_abonnements_affiliations_localisations.sql.
USE campushub;

ALTER TABLE paiements_abonnement
  ADD COLUMN IF NOT EXISTS type_paiement ENUM('ABONNEMENT', 'CERTIFICATION') NOT NULL DEFAULT 'ABONNEMENT' AFTER plan_id;

ALTER TABLE abonnements_universite
  ALTER COLUMN certification_incluse SET DEFAULT 0;
UPDATE abonnements_universite SET certification_incluse = 0;

UPDATE plans_abonnement
SET nom = 'Essentiel', prix_acces = 20.00, prix_certification = 0.00,
    avantages = JSON_ARRAY(
      'Fiche universitaire complète', 'Campus, facultés et filières',
      'Demandes étudiantes', 'Publications', 'Support standard'
    )
WHERE id = (SELECT id FROM (SELECT MIN(id) AS id FROM plans_abonnement) AS premier_plan);

INSERT INTO compteurs_sequences (nom_sequence, derniere_valeur)
VALUES ('certifications_universite', 0)
ON DUPLICATE KEY UPDATE nom_sequence = VALUES(nom_sequence);

INSERT INTO plans_abonnement (id, code_plan, nom, prix_acces, prix_certification, duree_jours, avantages)
SELECT 0, '', 'Professionnel', 35.00, 0.00, 30,
  JSON_ARRAY('Tous les avantages Essentiel', 'Statistiques avancées',
    'Publications prioritaires', 'Gestion étendue des services', 'Support prioritaire')
WHERE NOT EXISTS (SELECT 1 FROM plans_abonnement WHERE nom = 'Professionnel');

INSERT INTO plans_abonnement (id, code_plan, nom, prix_acces, prix_certification, duree_jours, avantages)
SELECT 0, '', 'Excellence', 50.00, 0.00, 30,
  JSON_ARRAY('Tous les avantages Professionnel', 'Mise en avant premium',
    'Rapports complets', 'Accompagnement personnalisé', 'Support VIP')
WHERE NOT EXISTS (SELECT 1 FROM plans_abonnement WHERE nom = 'Excellence');

CREATE TABLE IF NOT EXISTS certifications_universite (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_certification VARCHAR(30) NOT NULL,
  utilisateur_id BIGINT UNSIGNED NOT NULL,
  universite_id BIGINT UNSIGNED NOT NULL,
  paiement_id BIGINT UNSIGNED NOT NULL,
  prix DECIMAL(10,2) NOT NULL DEFAULT 7.00,
  date_debut DATETIME NOT NULL,
  date_fin DATETIME NOT NULL,
  statut ENUM('ACTIF', 'EXPIRE', 'SUSPENDU') NOT NULL DEFAULT 'ACTIF',
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_certifications_code UNIQUE (code_certification),
  CONSTRAINT uq_certifications_paiement UNIQUE (paiement_id),
  CONSTRAINT fk_certifications_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_certifications_universite FOREIGN KEY (universite_id) REFERENCES universites(id) ON DELETE CASCADE,
  CONSTRAINT fk_certifications_paiement FOREIGN KEY (paiement_id) REFERENCES paiements_abonnement(id),
  INDEX idx_certifications_fin (statut, date_fin)
) ENGINE=InnoDB;

DELIMITER $$
DROP TRIGGER IF EXISTS trg_certifications_avant_insertion$$
CREATE TRIGGER trg_certifications_avant_insertion BEFORE INSERT ON certifications_universite FOR EACH ROW BEGIN
  UPDATE compteurs_sequences
  SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
  WHERE nom_sequence = 'certifications_universite';
  SET NEW.id = LAST_INSERT_ID();
  SET NEW.code_certification = CONCAT('CER', LPAD(NEW.id, 4, '0'), YEAR(CURRENT_TIMESTAMP));
END$$
DELIMITER ;

CREATE OR REPLACE VIEW vue_abonnements_universites AS
SELECT a.id, a.code_abonnement, a.utilisateur_id, a.universite_id,
  u.code_universite, u.nom AS nom_universite, ut.code_utilisateur,
  ut.nom_affichage, ut.email, p.code_plan, p.nom AS nom_plan, p.prix_total,
  a.date_debut, a.date_fin,
  CASE WHEN a.date_fin < CURRENT_TIMESTAMP THEN 'EXPIRE' ELSE a.statut END AS statut,
  GREATEST(DATEDIFF(a.date_fin, CURRENT_TIMESTAMP), 0) AS jours_restants,
  EXISTS(
    SELECT 1 FROM certifications_universite c
    WHERE c.universite_id = a.universite_id AND c.statut = 'ACTIF'
      AND c.date_fin > CURRENT_TIMESTAMP
  ) AS est_certifiee,
  (SELECT MAX(c.date_fin) FROM certifications_universite c
    WHERE c.universite_id = a.universite_id AND c.statut = 'ACTIF') AS certification_fin,
  a.renouvellement_automatique
FROM abonnements_universite a
JOIN utilisateurs ut ON ut.id = a.utilisateur_id
JOIN plans_abonnement p ON p.id = a.plan_id
LEFT JOIN universites u ON u.id = a.universite_id;
