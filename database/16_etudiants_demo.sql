-- ============================================================
-- CampusHub - 16. Étudiants de démonstration par établissement
-- Ajoute des profils étudiants réels aux fiches fictives afin
-- que les compteurs de l'annuaire proviennent de la base.
-- Le script est idempotent et ne crée aucun doublon.
-- ============================================================

USE campushub;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_ajouter_etudiants_demo$$
CREATE PROCEDURE sp_ajouter_etudiants_demo(
  IN p_slug VARCHAR(190),
  IN p_nombre SMALLINT UNSIGNED
)
BEGIN
  DECLARE v_index SMALLINT UNSIGNED DEFAULT 1;
  DECLARE v_universite_id BIGINT UNSIGNED;
  DECLARE v_utilisateur_id BIGINT UNSIGNED;
  DECLARE v_email VARCHAR(190);
  DECLARE v_sigle VARCHAR(20);
  DECLARE v_ville VARCHAR(100);
  DECLARE v_province VARCHAR(100);

  SELECT id, sigle, ville, province
  INTO v_universite_id, v_sigle, v_ville, v_province
  FROM universites
  WHERE slug = p_slug AND statut_verification = 'VERIFIEE'
  LIMIT 1;

  IF v_universite_id IS NOT NULL THEN
    WHILE v_index <= p_nombre DO
      SET v_email = CONCAT('etudiant.', p_slug, '.', LPAD(v_index, 2, '0'), '@campushub.test');

      INSERT INTO utilisateurs (
        id, code_utilisateur, email, mot_de_passe_hash, role, statut_compte,
        statut_verification, nom_affichage, ville, province, date_verification_email
      )
      SELECT 0, '', v_email,
        '$2b$12$W9V.tWlcTKHoRyUA5pNGGOW1MuliEST.aET4mDjI.m52rK5eezJAi',
        'ETUDIANT', 'ACTIF', 'VERIFIE',
        CONCAT('Étudiant Démonstration ', LPAD(v_index, 2, '0'), ' — ', v_sigle),
        v_ville, v_province, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (SELECT 1 FROM utilisateurs WHERE email = v_email);

      SELECT id INTO v_utilisateur_id
      FROM utilisateurs WHERE email = v_email LIMIT 1;

      INSERT INTO profils_etudiants (
        id, code_profil, utilisateur_id, universite_id, filiere_id,
        matricule_etudiant, titre_profil, competences, est_visible
      )
      SELECT 0, '', v_utilisateur_id, v_universite_id, NULL,
        CONCAT('DEMO-', UPPER(v_sigle), '-', LPAD(v_index, 4, '0')),
        'Étudiant confirmé', JSON_ARRAY('Communication', 'Travail en équipe'), 1
      WHERE NOT EXISTS (
        SELECT 1 FROM profils_etudiants WHERE utilisateur_id = v_utilisateur_id
      );

      SET v_index = v_index + 1;
    END WHILE;
  END IF;
END$$

DELIMITER ;

START TRANSACTION;

-- Établissements déjà présents dans la démonstration initiale.
CALL sp_ajouter_etudiants_demo('institut-superieur-informatique-gestion', 6);
CALL sp_ajouter_etudiants_demo('institut-demonstration-numerique-kivu', 6);
CALL sp_ajouter_etudiants_demo('academie-demonstration-sante-gestion', 6);

-- 10 établissements supérieurs ajoutés au catalogue de démonstration.
CALL sp_ajouter_etudiants_demo('universite-demonstration-grands-lacs', 6);
CALL sp_ajouter_etudiants_demo('institut-superieur-demonstration-technologie', 6);
CALL sp_ajouter_etudiants_demo('universite-demonstration-kinshasa', 6);
CALL sp_ajouter_etudiants_demo('academie-demonstration-sante-kasai', 6);
CALL sp_ajouter_etudiants_demo('institut-demonstration-agronomie-katanga', 6);
CALL sp_ajouter_etudiants_demo('universite-demonstration-fleuve-congo', 6);
CALL sp_ajouter_etudiants_demo('institut-demonstration-gestion-bunia', 6);
CALL sp_ajouter_etudiants_demo('universite-demonstration-sciences-matadi', 6);
CALL sp_ajouter_etudiants_demo('institut-demonstration-pedagogique-kisangani', 6);
CALL sp_ajouter_etudiants_demo('universite-demonstration-equateur', 6);

-- 10 écoles secondaires ajoutées au catalogue de démonstration.
CALL sp_ajouter_etudiants_demo('complexe-scolaire-demonstration-amani', 4);
CALL sp_ajouter_etudiants_demo('lycee-demonstration-kivu', 4);
CALL sp_ajouter_etudiants_demo('college-demonstration-lumiere', 4);
CALL sp_ajouter_etudiants_demo('institut-technique-demonstration-salama', 4);
CALL sp_ajouter_etudiants_demo('ecole-secondaire-demonstration-umoja', 4);
CALL sp_ajouter_etudiants_demo('college-demonstration-fleuve', 4);
CALL sp_ajouter_etudiants_demo('lycee-demonstration-tshopo', 4);
CALL sp_ajouter_etudiants_demo('complexe-scolaire-demonstration-espoir', 4);
CALL sp_ajouter_etudiants_demo('institut-secondaire-demonstration-mbandaka', 4);
CALL sp_ajouter_etudiants_demo('college-demonstration-sud-ubangi', 4);

COMMIT;

DROP PROCEDURE IF EXISTS sp_ajouter_etudiants_demo;

SELECT u.nom, u.categorie_etablissement, COUNT(pe.id) AS nombre_etudiants
FROM universites u
LEFT JOIN profils_etudiants pe ON pe.universite_id = u.id
WHERE u.statut_verification = 'VERIFIEE'
GROUP BY u.id, u.nom, u.categorie_etablissement
ORDER BY u.nom;

