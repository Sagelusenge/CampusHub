-- ============================================================
-- CampusHub - 29. Formules annuelle et à vie
-- À exécuter après 28_essai_gratuit_30_jours.sql
-- ============================================================

USE campushub;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @ddl_plan_vie = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'plans_abonnement'
     AND column_name = 'est_a_vie') = 0,
  'ALTER TABLE plans_abonnement ADD COLUMN est_a_vie TINYINT(1) NOT NULL DEFAULT 0 AFTER duree_jours',
  'SELECT 1'
);
PREPARE stmt_plan_vie FROM @ddl_plan_vie;
EXECUTE stmt_plan_vie;
DEALLOCATE PREPARE stmt_plan_vie;

SET @plan_annuel_id = (
  SELECT id FROM plans_abonnement WHERE est_a_vie = 0 ORDER BY id LIMIT 1
);

INSERT INTO plans_abonnement
  (id, code_plan, nom, prix_acces, prix_certification, duree_jours, est_a_vie, avantages, est_actif)
SELECT 0, '', 'Accès annuel', 20.00, 0.00, 365, 0,
  JSON_ARRAY(
    'Accès complet et illimité pendant 12 mois',
    'Fiche publique et carte de l’établissement',
    'Campus, formations, services et inscriptions',
    'Offres, publications et réseau CampusHub',
    'Rapports professionnels et support'
  ), 1
WHERE @plan_annuel_id IS NULL;

SET @plan_annuel_id = COALESCE(@plan_annuel_id, (
  SELECT id FROM plans_abonnement WHERE est_a_vie = 0 ORDER BY id LIMIT 1
));

UPDATE plans_abonnement
SET nom = 'Accès annuel', prix_acces = 20.00, prix_certification = 0.00,
    duree_jours = 365, est_a_vie = 0,
    avantages = JSON_ARRAY(
      'Accès complet et illimité pendant 12 mois',
      'Fiche publique et carte de l’établissement',
      'Campus, formations, services et inscriptions',
      'Offres, publications et réseau CampusHub',
      'Rapports professionnels et support'
    ), est_actif = 1
WHERE id = @plan_annuel_id;

SET @plan_vie_id = (
  SELECT id FROM plans_abonnement WHERE est_a_vie = 1 ORDER BY id LIMIT 1
);

INSERT INTO plans_abonnement
  (id, code_plan, nom, prix_acces, prix_certification, duree_jours, est_a_vie, avantages, est_actif)
SELECT 0, '', 'Accès à vie', 200.00, 0.00, 365, 1,
  JSON_ARRAY(
    'Paiement unique sans renouvellement annuel',
    'Accès permanent à toutes les fonctions institutionnelles',
    'Fiche publique, carte, campus et formations',
    'Inscriptions, offres, publications et réseau',
    'Rapports professionnels et support prioritaire'
  ), 1
WHERE @plan_vie_id IS NULL;

SET @plan_vie_id = COALESCE(@plan_vie_id, (
  SELECT id FROM plans_abonnement WHERE est_a_vie = 1 ORDER BY id LIMIT 1
));

UPDATE plans_abonnement
SET nom = 'Accès à vie', prix_acces = 200.00, prix_certification = 0.00,
    duree_jours = 365, est_a_vie = 1,
    avantages = JSON_ARRAY(
      'Paiement unique sans renouvellement annuel',
      'Accès permanent à toutes les fonctions institutionnelles',
      'Fiche publique, carte, campus et formations',
      'Inscriptions, offres, publications et réseau',
      'Rapports professionnels et support prioritaire'
    ), est_actif = 1
WHERE id = @plan_vie_id;

UPDATE plans_abonnement
SET est_actif = CASE WHEN id IN (@plan_annuel_id, @plan_vie_id) THEN 1 ELSE 0 END;

CREATE OR REPLACE VIEW vue_abonnements_universites AS
SELECT a.id, a.code_abonnement, a.utilisateur_id, a.universite_id,
  u.code_universite, u.nom AS nom_universite, ut.code_utilisateur,
  ut.nom_affichage, ut.email, p.code_plan, p.nom AS nom_plan, p.prix_total,
  p.est_a_vie, a.type_abonnement, a.paiement_id, a.date_debut, a.date_fin,
  CASE WHEN p.est_a_vie = 0 AND a.date_fin < CURRENT_TIMESTAMP THEN 'EXPIRE' ELSE a.statut END AS statut,
  CASE WHEN p.est_a_vie = 1 THEN 999999 ELSE GREATEST(DATEDIFF(a.date_fin, CURRENT_TIMESTAMP), 0) END AS jours_restants,
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

SELECT 'Formules CampusHub 20 USD par an et 200 USD à vie activées' AS message;
