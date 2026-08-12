-- ============================================================
-- CampusHub - 28. Essai institutionnel gratuit de 30 jours
-- À exécuter après 27_campushub_ia_locale.sql
-- ============================================================

USE campushub;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @ddl_essai_utilise = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'utilisateurs'
     AND column_name = 'essai_gratuit_utilise') = 0,
  'ALTER TABLE utilisateurs ADD COLUMN essai_gratuit_utilise TINYINT(1) NOT NULL DEFAULT 0 AFTER date_verification_email',
  'SELECT 1'
);
PREPARE stmt_essai_utilise FROM @ddl_essai_utilise;
EXECUTE stmt_essai_utilise;
DEALLOCATE PREPARE stmt_essai_utilise;

-- Un essai ne possède pas de paiement associé.
ALTER TABLE abonnements_universite
  MODIFY COLUMN paiement_id BIGINT UNSIGNED NULL;

SET @ddl_type_abonnement = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'abonnements_universite'
     AND column_name = 'type_abonnement') = 0,
  "ALTER TABLE abonnements_universite ADD COLUMN type_abonnement ENUM('ESSAI','PAYANT') NOT NULL DEFAULT 'PAYANT' AFTER paiement_id",
  'SELECT 1'
);
PREPARE stmt_type_abonnement FROM @ddl_type_abonnement;
EXECUTE stmt_type_abonnement;
DEALLOCATE PREPARE stmt_type_abonnement;

UPDATE abonnements_universite
SET type_abonnement = 'PAYANT'
WHERE paiement_id IS NOT NULL;

-- Accorder aussi l'essai aux comptes institutionnels déjà confirmés qui
-- n'ont encore bénéficié d'aucun abonnement. L'unicité est portée par le
-- marqueur du compte et non par l'adresse e-mail.
SET @plan_essai_id = (SELECT id FROM plans_abonnement WHERE est_actif = 1 ORDER BY id LIMIT 1);

INSERT INTO abonnements_universite
  (id, code_abonnement, utilisateur_id, universite_id, plan_id, paiement_id,
   type_abonnement, date_debut, date_fin, certification_incluse)
SELECT 0, '', ut.id, mu.universite_id, @plan_essai_id, NULL,
  'ESSAI', CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 DAY), 0
FROM utilisateurs ut
LEFT JOIN membres_universite mu
  ON mu.utilisateur_id = ut.id AND mu.est_proprietaire = 1
WHERE ut.role = 'UNIVERSITE'
  AND ut.date_verification_email IS NOT NULL
  AND ut.essai_gratuit_utilise = 0
  AND @plan_essai_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM abonnements_universite a WHERE a.utilisateur_id = ut.id
  );

UPDATE utilisateurs ut
SET ut.essai_gratuit_utilise = 1,
    ut.statut_compte = 'ACTIF'
WHERE ut.role = 'UNIVERSITE'
  AND EXISTS (
    SELECT 1 FROM abonnements_universite a
    WHERE a.utilisateur_id = ut.id AND a.type_abonnement = 'ESSAI'
  );

CREATE OR REPLACE VIEW vue_abonnements_universites AS
SELECT a.id, a.code_abonnement, a.utilisateur_id, a.universite_id,
  u.code_universite, u.nom AS nom_universite, ut.code_utilisateur,
  ut.nom_affichage, ut.email, p.code_plan, p.nom AS nom_plan, p.prix_total,
  a.type_abonnement, a.paiement_id, a.date_debut, a.date_fin,
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

SELECT 'Essai gratuit institutionnel de 30 jours activé' AS message;
