-- ============================================================
-- CampusHub - 30. Gestion administrative complète des comptes
-- À exécuter après 29_formules_annuelle_et_vie.sql
-- ============================================================

USE campushub;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE utilisateurs
  MODIFY COLUMN statut_compte
    ENUM('EN_ATTENTE', 'ACTIF', 'SUSPENDU', 'BLOQUE', 'SUPPRIME')
    NOT NULL DEFAULT 'EN_ATTENTE';

SELECT 'Gestion administrative des utilisateurs activée' AS message;
