-- ============================================================
-- CampusHub - 26. Abonnement annuel unique
-- A executer apres 25_gestion_etudiants_audit.sql
-- ============================================================

USE campushub;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Conserver un seul plan public et neutraliser les anciens packs.
SET @plan_annuel_id = (SELECT MIN(id) FROM plans_abonnement);

INSERT INTO plans_abonnement
  (id, code_plan, nom, prix_acces, prix_certification, duree_jours, avantages, est_actif)
SELECT 0, '', 'Abonnement annuel', 10.00, 0.00, 365,
  JSON_ARRAY(
    'Fiche publique de l’établissement',
    'Gestion des campus, formations et services',
    'Inscriptions et demandes étudiantes',
    'Offres, publications et réseau CampusHub',
    'Statistiques, rapports et support'
  ), 1
WHERE @plan_annuel_id IS NULL;

SET @plan_annuel_id = COALESCE(@plan_annuel_id, (SELECT MIN(id) FROM plans_abonnement));

UPDATE plans_abonnement
SET est_actif = CASE WHEN id = @plan_annuel_id THEN 1 ELSE 0 END;

UPDATE plans_abonnement
SET nom = 'Abonnement annuel',
    prix_acces = 10.00,
    prix_certification = 0.00,
    duree_jours = 365,
    avantages = JSON_ARRAY(
      'Fiche publique de l’établissement',
      'Gestion des campus, formations et services',
      'Inscriptions et demandes étudiantes',
      'Offres, publications et réseau CampusHub',
      'Statistiques, rapports et support'
    ),
    est_actif = 1
WHERE id = @plan_annuel_id;

SELECT 'Abonnement annuel unique de 10 USD active' AS message;
