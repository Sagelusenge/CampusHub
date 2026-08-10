-- ============================================================
-- CampusHub - 25. Gestion institutionnelle des étudiants et audit
-- À exécuter après 24_couvertures_etablissements.sql
-- ============================================================

USE campushub;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @ddl_statut_institution = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE()
   AND table_name = 'profils_etudiants' AND column_name = 'statut_institution') = 0,
  "ALTER TABLE profils_etudiants ADD COLUMN statut_institution ENUM('ACTIF','SUSPENDU','BLOQUE','RETIRE') NOT NULL DEFAULT 'ACTIF' AFTER est_visible",
  'SELECT 1'
);
PREPARE stmt_statut_institution FROM @ddl_statut_institution;
EXECUTE stmt_statut_institution;
DEALLOCATE PREPARE stmt_statut_institution;

SET @ddl_motif_statut = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE()
   AND table_name = 'profils_etudiants' AND column_name = 'motif_statut') = 0,
  'ALTER TABLE profils_etudiants ADD COLUMN motif_statut VARCHAR(1000) NULL AFTER statut_institution',
  'SELECT 1'
);
PREPARE stmt_motif_statut FROM @ddl_motif_statut;
EXECUTE stmt_motif_statut;
DEALLOCATE PREPARE stmt_motif_statut;

SET @ddl_date_fin_suspension = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE()
   AND table_name = 'profils_etudiants' AND column_name = 'date_fin_suspension') = 0,
  'ALTER TABLE profils_etudiants ADD COLUMN date_fin_suspension DATETIME NULL AFTER motif_statut',
  'SELECT 1'
);
PREPARE stmt_date_fin_suspension FROM @ddl_date_fin_suspension;
EXECUTE stmt_date_fin_suspension;
DEALLOCATE PREPARE stmt_date_fin_suspension;

SET @ddl_statut_modifie_par = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE()
   AND table_name = 'profils_etudiants' AND column_name = 'statut_modifie_par_id') = 0,
  'ALTER TABLE profils_etudiants ADD COLUMN statut_modifie_par_id BIGINT UNSIGNED NULL AFTER date_fin_suspension',
  'SELECT 1'
);
PREPARE stmt_statut_modifie_par FROM @ddl_statut_modifie_par;
EXECUTE stmt_statut_modifie_par;
DEALLOCATE PREPARE stmt_statut_modifie_par;

SET @ddl_date_statut = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE()
   AND table_name = 'profils_etudiants' AND column_name = 'date_statut') = 0,
  'ALTER TABLE profils_etudiants ADD COLUMN date_statut DATETIME NULL AFTER statut_modifie_par_id',
  'SELECT 1'
);
PREPARE stmt_date_statut FROM @ddl_date_statut;
EXECUTE stmt_date_statut;
DEALLOCATE PREPARE stmt_date_statut;

SET @ddl_fk_statut_modifie_par = IF(
  (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = DATABASE()
   AND table_name = 'profils_etudiants' AND constraint_name = 'fk_profils_statut_modifie_par') = 0,
  'ALTER TABLE profils_etudiants ADD CONSTRAINT fk_profils_statut_modifie_par FOREIGN KEY (statut_modifie_par_id) REFERENCES utilisateurs(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt_fk_statut_modifie_par FROM @ddl_fk_statut_modifie_par;
EXECUTE stmt_fk_statut_modifie_par;
DEALLOCATE PREPARE stmt_fk_statut_modifie_par;

SET @ddl_idx_statut_institution = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE()
   AND table_name = 'profils_etudiants' AND index_name = 'idx_profils_universite_statut') = 0,
  'ALTER TABLE profils_etudiants ADD INDEX idx_profils_universite_statut (universite_id, statut_institution, date_modification)',
  'SELECT 1'
);
PREPARE stmt_idx_statut_institution FROM @ddl_idx_statut_institution;
EXECUTE stmt_idx_statut_institution;
DEALLOCATE PREPARE stmt_idx_statut_institution;

SET @ddl_idx_audit_action = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE()
   AND table_name = 'journal_audit' AND index_name = 'idx_audit_action_date') = 0,
  'ALTER TABLE journal_audit ADD INDEX idx_audit_action_date (action, date_creation)',
  'SELECT 1'
);
PREPARE stmt_idx_audit_action FROM @ddl_idx_audit_action;
EXECUTE stmt_idx_audit_action;
DEALLOCATE PREPARE stmt_idx_audit_action;

UPDATE profils_etudiants
SET statut_institution = 'ACTIF'
WHERE statut_institution IS NULL;

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

CREATE OR REPLACE VIEW vue_profils_etudiants_publics AS
SELECT
  pe.id, pe.code_profil, ut.code_utilisateur, ut.nom_affichage,
  ut.url_photo_profil, ut.biographie, pe.titre_profil, pe.competences,
  pe.annee_diplomation, pe.matricule_etudiant,
  u.code_universite, u.nom AS nom_universite,
  fi.code_filiere, fi.nom AS nom_filiere,
  (SELECT COUNT(*) FROM publications p WHERE p.auteur_id = ut.id AND p.statut_publication = 'PUBLIEE') AS nombre_publications,
  (SELECT COUNT(*) FROM abonnements_utilisateurs a WHERE a.utilisateur_suivi_id = ut.id) AS nombre_abonnes,
  (SELECT COUNT(*) FROM abonnements_utilisateurs a WHERE a.abonne_id = ut.id) AS nombre_suivis,
  (SELECT COUNT(*) FROM mentions_jaime j JOIN publications p ON p.id = j.publication_id WHERE p.auteur_id = ut.id) AS nombre_jaime
FROM profils_etudiants pe
JOIN utilisateurs ut ON ut.id = pe.utilisateur_id
LEFT JOIN universites u ON u.id = pe.universite_id
LEFT JOIN filieres fi ON fi.id = pe.filiere_id
WHERE pe.est_visible = 1
  AND pe.statut_institution = 'ACTIF'
  AND ut.statut_compte = 'ACTIF';

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_statistiques_universite$$
CREATE PROCEDURE sp_statistiques_universite(IN p_universite_id BIGINT UNSIGNED)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM universites WHERE id = p_universite_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Université introuvable.';
  END IF;
  SELECT
    u.id,
    u.code_universite,
    u.nom,
    (SELECT COUNT(*) FROM facultes f WHERE f.universite_id = u.id) AS nombre_facultes,
    (SELECT COUNT(*) FROM filieres f WHERE f.universite_id = u.id AND f.est_active = 1) AS nombre_filieres,
    (SELECT COUNT(*) FROM profils_etudiants pe WHERE pe.universite_id = u.id AND pe.statut_institution = 'ACTIF') AS nombre_etudiants,
    (SELECT COUNT(*) FROM publications p WHERE p.universite_id = u.id AND p.statut_publication = 'PUBLIEE') AS nombre_publications,
    (SELECT COUNT(*) FROM abonnements_universites au WHERE au.universite_id = u.id) AS nombre_abonnes,
    (SELECT COUNT(*) FROM services_universitaires s WHERE s.universite_id = u.id AND s.est_disponible = 1) AS nombre_services
  FROM universites u
  WHERE u.id = p_universite_id;
END$$

DELIMITER ;

SELECT 'Gestion institutionnelle des étudiants et audit activés' AS message;
