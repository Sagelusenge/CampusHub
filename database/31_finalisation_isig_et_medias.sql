-- ============================================================
-- CampusHub - 31. Finalisation ISIG, médias et données de contact
-- À exécuter après 30_gestion_administrative_utilisateurs.sql
-- Script idempotent : il peut être rejoué lors d'un redéploiement.
-- ============================================================

USE campushub;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Colonnes nécessaires aux fiches détaillées.
SET @sql_telephone = IF(
  EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'utilisateurs' AND column_name = 'telephone'
  ),
  'SELECT 1',
  'ALTER TABLE utilisateurs ADD COLUMN telephone VARCHAR(40) NULL AFTER biographie'
);
PREPARE stmt FROM @sql_telephone;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_image_infrastructure = IF(
  EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'infrastructures' AND column_name = 'url_image'
  ),
  'SELECT 1',
  'ALTER TABLE infrastructures ADD COLUMN url_image VARCHAR(500) NULL AFTER description'
);
PREPARE stmt FROM @sql_image_infrastructure;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Conserver la fiche ISIG existante si elle est déjà présente.
SET @isig_id = (
  SELECT id FROM universites
  WHERE sigle = 'ISIG'
     OR code_universite = 'ISIG00012026'
     OR nom LIKE 'Institut Supérieur d''Informatique et de Gestion%'
  ORDER BY id LIMIT 1
);

INSERT INTO universites (
  id, code_universite, nom, sigle, slug, type_universite, statut_verification,
  description, site_web, email, telephone, annee_fondation, adresse, ville,
  province, pays, latitude, longitude, inscriptions_ouvertes
)
SELECT
  0, '', 'Institut Supérieur d’Informatique et de Gestion', 'ISIG', 'institut-superieur-informatique-gestion-goma',
  'PRIVEE', 'VERIFIEE',
  'Établissement privé d’enseignement supérieur fondé à Goma en 1992, spécialisé en gestion, informatique, santé et développement.',
  'https://isig.ac.cd/', 'info@isig.ac.cd', '+243859134765', 1992,
  'Commune de Karisimbi, quartier Murara, avenue Bunia n° 5', 'Goma', 'Nord-Kivu',
  'République démocratique du Congo', -1.675950, 29.230410, 1
WHERE @isig_id IS NULL;

SET @isig_id = COALESCE(@isig_id, @campushub_dernier_id);

UPDATE universites
SET nom = 'Institut Supérieur d’Informatique et de Gestion',
    sigle = 'ISIG',
    slug = 'institut-superieur-informatique-gestion-goma',
    type_universite = 'PRIVEE',
    statut_verification = 'VERIFIEE',
    description = 'Établissement privé d’enseignement supérieur fondé à Goma en 1992, spécialisé en gestion, informatique, santé et développement.',
    site_web = 'https://isig.ac.cd/',
    email = 'info@isig.ac.cd',
    telephone = '+243859134765',
    annee_fondation = 1992,
    adresse = 'Commune de Karisimbi, quartier Murara, avenue Bunia n° 5',
    ville = 'Goma', province = 'Nord-Kivu', pays = 'République démocratique du Congo',
    latitude = -1.675950, longitude = 29.230410,
    inscriptions_ouvertes = 1
WHERE id = @isig_id;

-- Gestionnaire principal. L’adresse officielle reçoit les notifications de l’établissement.
SET @isig_login = 'info@isig.ac.cd';
SET @isig_manager_id = (
  SELECT utilisateur_id FROM membres_universite
  WHERE universite_id = @isig_id
  ORDER BY est_proprietaire DESC, id LIMIT 1
);
SET @isig_manager_id = COALESCE(
  (SELECT id FROM utilisateurs WHERE email = @isig_login LIMIT 1),
  @isig_manager_id
);

INSERT INTO utilisateurs (
  id, code_utilisateur, email, mot_de_passe_hash, role, statut_compte,
  statut_verification, nom_affichage, ville, province, date_verification_email
)
SELECT 0, '', @isig_login,
  '$2b$12$1iH593YtqFKgICxM9pGXI.XRK4isxVwnpvCI5RMheeFCpuX58RwLy',
  'UNIVERSITE', 'ACTIF', 'VERIFIE', 'ISIG-Goma — Gestionnaire', 'Goma', 'Nord-Kivu', CURRENT_TIMESTAMP
WHERE @isig_manager_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM utilisateurs WHERE email = @isig_login);

SET @isig_manager_id = COALESCE(
  @isig_manager_id,
  (SELECT id FROM utilisateurs WHERE email = @isig_login LIMIT 1),
  @campushub_dernier_id
);

UPDATE utilisateurs
SET email = @isig_login,
    mot_de_passe_hash = '$2b$12$1iH593YtqFKgICxM9pGXI.XRK4isxVwnpvCI5RMheeFCpuX58RwLy',
    role = 'UNIVERSITE', statut_compte = 'ACTIF', statut_verification = 'VERIFIE',
    nom_affichage = 'ISIG-Goma — Gestionnaire', ville = 'Goma', province = 'Nord-Kivu',
    date_verification_email = COALESCE(date_verification_email, CURRENT_TIMESTAMP)
WHERE id = @isig_manager_id;

INSERT INTO membres_universite (
  id, code_membre, universite_id, utilisateur_id, fonction, est_proprietaire
)
SELECT 0, '', @isig_id, @isig_manager_id, 'Gestionnaire principal', 1
WHERE NOT EXISTS (
  SELECT 1 FROM membres_universite
  WHERE universite_id = @isig_id AND utilisateur_id = @isig_manager_id
);

UPDATE membres_universite SET est_proprietaire = 0
WHERE universite_id = @isig_id AND utilisateur_id <> @isig_manager_id;
UPDATE membres_universite
SET fonction = 'Gestionnaire principal', est_proprietaire = 1
WHERE universite_id = @isig_id AND utilisateur_id = @isig_manager_id;

-- Campus principal.
INSERT INTO campus (
  id, code_campus, universite_id, nom, adresse, ville, province, latitude, longitude, est_principal
)
SELECT 0, '', @isig_id, 'Campus principal ISIG-Goma',
  'Commune de Karisimbi, quartier Murara, avenue Bunia n° 5', 'Goma', 'Nord-Kivu',
  -1.675950, 29.230410, 1
WHERE NOT EXISTS (SELECT 1 FROM campus WHERE universite_id = @isig_id AND est_principal = 1);

UPDATE campus
SET nom = 'Campus principal ISIG-Goma',
    adresse = 'Commune de Karisimbi, quartier Murara, avenue Bunia n° 5',
    ville = 'Goma', province = 'Nord-Kivu', latitude = -1.675950, longitude = 29.230410,
    est_principal = 1
WHERE universite_id = @isig_id AND est_principal = 1;

-- Facultés officielles.
INSERT INTO facultes (id, code_faculte, universite_id, nom, slug, description)
SELECT 0, '', @isig_id, 'Sciences économiques et de gestion', 'sciences-economiques-gestion',
       'Formations en gestion, finance, marketing, entrepreneuriat et administration.'
WHERE NOT EXISTS (SELECT 1 FROM facultes WHERE universite_id = @isig_id AND slug = 'sciences-economiques-gestion');
SET @fac_gestion = (SELECT id FROM facultes WHERE universite_id = @isig_id AND slug = 'sciences-economiques-gestion' LIMIT 1);

INSERT INTO facultes (id, code_faculte, universite_id, nom, slug, description)
SELECT 0, '', @isig_id, 'Sciences et technologies', 'sciences-technologies',
       'Formations en informatique, intelligence artificielle, génie logiciel et télécommunications.'
WHERE NOT EXISTS (SELECT 1 FROM facultes WHERE universite_id = @isig_id AND slug = 'sciences-technologies');
SET @fac_tech = (SELECT id FROM facultes WHERE universite_id = @isig_id AND slug = 'sciences-technologies' LIMIT 1);

INSERT INTO facultes (id, code_faculte, universite_id, nom, slug, description)
SELECT 0, '', @isig_id, 'Sciences de la santé', 'sciences-sante',
       'Formations en santé publique et management des organisations sanitaires.'
WHERE NOT EXISTS (SELECT 1 FROM facultes WHERE universite_id = @isig_id AND slug = 'sciences-sante');
SET @fac_sante = (SELECT id FROM facultes WHERE universite_id = @isig_id AND slug = 'sciences-sante' LIMIT 1);

INSERT INTO facultes (id, code_faculte, universite_id, nom, slug, description)
SELECT 0, '', @isig_id, 'Sciences humaines et développement', 'sciences-humaines-developpement',
       'Formations en développement local, genre et action humanitaire.'
WHERE NOT EXISTS (SELECT 1 FROM facultes WHERE universite_id = @isig_id AND slug = 'sciences-humaines-developpement');
SET @fac_dev = (SELECT id FROM facultes WHERE universite_id = @isig_id AND slug = 'sciences-humaines-developpement' LIMIT 1);

DROP PROCEDURE IF EXISTS sp_importer_filiere_isig;
DELIMITER $$
CREATE PROCEDURE sp_importer_filiere_isig(
  IN p_faculte BIGINT UNSIGNED, IN p_nom VARCHAR(180), IN p_slug VARCHAR(190),
  IN p_domaine VARCHAR(140), IN p_niveau VARCHAR(20), IN p_duree TINYINT UNSIGNED
)
BEGIN
  INSERT INTO filieres (
    id, code_filiere, universite_id, faculte_id, nom, slug, domaine,
    niveau_diplome, duree_annees, devise, est_active, description
  )
  SELECT 0, '', @isig_id, p_faculte, p_nom, p_slug, p_domaine,
         p_niveau, p_duree, 'USD', 1,
         CONCAT('Programme ', LOWER(p_niveau), ' présenté par l’ISIG-Goma.')
  WHERE NOT EXISTS (
    SELECT 1 FROM filieres
    WHERE universite_id = @isig_id AND slug = p_slug AND niveau_diplome = p_niveau
  );
END$$
DELIMITER ;

CALL sp_importer_filiere_isig(@fac_gestion, 'Banque, microfinance et assurance', 'banque-microfinance-assurance', 'Économie et gestion', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_gestion, 'Marketing', 'marketing', 'Économie et gestion', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_gestion, 'Fiscalité, douane et accises', 'fiscalite-douane-accises', 'Économie et gestion', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_gestion, 'Entrepreneuriat et gestion des PME', 'entrepreneuriat-gestion-pme', 'Économie et gestion', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_gestion, 'Logistique et transport', 'logistique-transport', 'Économie et gestion', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_gestion, 'Gestion des ressources humaines', 'gestion-ressources-humaines', 'Économie et gestion', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_gestion, 'Informatique appliquée à la gestion des entreprises (LIAGE)', 'informatique-appliquee-gestion-entreprises-liage', 'Informatique de gestion', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_gestion, 'Comptabilité et finance', 'comptabilite-finance', 'Économie et gestion', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_tech, 'Systèmes informatiques', 'systemes-informatiques', 'Informatique', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_tech, 'Intelligence artificielle', 'intelligence-artificielle', 'Informatique', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_tech, 'Génie logiciel', 'genie-logiciel', 'Informatique', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_tech, 'Réseaux et télécommunications', 'reseaux-telecommunications', 'Informatique', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_sante, 'Gestion des organisations de santé', 'gestion-organisations-sante', 'Sciences de la santé', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_sante, 'Management des services de santé', 'management-services-sante', 'Sciences de la santé', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_sante, 'Santé publique', 'sante-publique', 'Sciences de la santé', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_sante, 'Épidémiologie', 'epidemiologie', 'Sciences de la santé', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_sante, 'Santé, environnement et développement durable', 'sante-environnement-developpement-durable', 'Sciences de la santé', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_dev, 'Gestion du développement local', 'gestion-developpement-local', 'Développement', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_dev, 'Genre et développement durable', 'genre-developpement-durable', 'Développement', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_dev, 'Développement et actions humanitaires', 'developpement-actions-humanitaires', 'Développement', 'LICENCE', 3);
CALL sp_importer_filiere_isig(@fac_gestion, 'Comptabilité, contrôle et audit', 'comptabilite-controle-audit', 'Économie et gestion', 'MASTER', 2);
CALL sp_importer_filiere_isig(@fac_gestion, 'Ingénierie et management des systèmes d’information', 'ingenierie-management-systemes-information', 'Informatique de gestion', 'MASTER', 2);
CALL sp_importer_filiere_isig(@fac_tech, 'Intelligence artificielle', 'intelligence-artificielle', 'Informatique', 'MASTER', 2);
CALL sp_importer_filiere_isig(@fac_sante, 'Santé publique', 'sante-publique', 'Sciences de la santé', 'MASTER', 2);
CALL sp_importer_filiere_isig(@fac_dev, 'Gestion du développement', 'gestion-developpement', 'Développement', 'MASTER', 2);

DROP PROCEDURE IF EXISTS sp_importer_filiere_isig;

SET @liage_id = (
  SELECT id FROM filieres
  WHERE universite_id = @isig_id AND slug = 'informatique-appliquee-gestion-entreprises-liage'
    AND niveau_diplome = 'LICENCE' LIMIT 1
);

-- Import contrôlé des dix étudiants fournis par l'établissement.
DROP PROCEDURE IF EXISTS sp_importer_etudiant_isig;
DELIMITER $$
CREATE PROCEDURE sp_importer_etudiant_isig(
  IN p_nom VARCHAR(120), IN p_email VARCHAR(190), IN p_telephone VARCHAR(40), IN p_matricule VARCHAR(80)
)
BEGIN
  DECLARE v_utilisateur_id BIGINT UNSIGNED;
  SET v_utilisateur_id = (SELECT id FROM utilisateurs WHERE email = LOWER(p_email) AND role = 'ETUDIANT' LIMIT 1);
  IF v_utilisateur_id IS NULL THEN
    INSERT INTO utilisateurs (
      id, code_utilisateur, email, mot_de_passe_hash, role, statut_compte,
      statut_verification, nom_affichage, telephone, ville, province, date_verification_email
    ) VALUES (
      0, '', LOWER(p_email), '$2b$12$/pXwwdgiigA7K../pKX28Oj5P58wg/zCnc.xb7vdjwKVU/xy7NGda',
      'ETUDIANT', 'ACTIF', 'VERIFIE', p_nom, p_telephone, 'Goma', 'Nord-Kivu', CURRENT_TIMESTAMP
    );
    SET v_utilisateur_id = @campushub_dernier_id;
  ELSE
    UPDATE utilisateurs SET nom_affichage = p_nom, telephone = p_telephone,
      statut_compte = 'ACTIF', statut_verification = 'VERIFIE',
      date_verification_email = COALESCE(date_verification_email, CURRENT_TIMESTAMP)
    WHERE id = v_utilisateur_id;
  END IF;

  INSERT INTO profils_etudiants (
    id, code_profil, utilisateur_id, universite_id, filiere_id, matricule_etudiant,
    titre_profil, competences, est_visible, statut_institution
  )
  SELECT 0, '', v_utilisateur_id, @isig_id, @liage_id, p_matricule,
         'Étudiant en troisième licence LIAGE', JSON_ARRAY('Informatique de gestion'), 1, 'ACTIF'
  WHERE NOT EXISTS (SELECT 1 FROM profils_etudiants WHERE utilisateur_id = v_utilisateur_id);

  UPDATE profils_etudiants
  SET universite_id = @isig_id, filiere_id = @liage_id, matricule_etudiant = p_matricule,
      titre_profil = 'Étudiant en troisième licence LIAGE', est_visible = 1, statut_institution = 'ACTIF'
  WHERE utilisateur_id = v_utilisateur_id;
END$$
DELIMITER ;

CALL sp_importer_etudiant_isig('AGANZE BUJIRIRI THIBAUT', 'thibauttbcbujiriri@gmail.com', '+243979823604', '24LIAGELJ1071151');
CALL sp_importer_etudiant_isig('FURAHA AWULE SENYA', 'awulefuraha@gmail.com', '+243833941037', '24LIAGELJ1071152');
CALL sp_importer_etudiant_isig('KATATI MILABYO EDOUARD', 'milabyeo@gmail.com', '+243815732605', '24LIAGELJ1071153');
CALL sp_importer_etudiant_isig('NGABO BASILWANGO DAVID', 'davdnbj76@gmail.com', '+256978341163', '24LIAGELJ1071154');
CALL sp_importer_etudiant_isig('SUMAILI BIRIKUNGUBA DANIEL', 'birikungubad@gmail.com', '+243980902825', '24LIAGELJ1071155');
CALL sp_importer_etudiant_isig('ITANGISHAKA BANZIRA FISTON', 'itangishakafiston80@gmail.com', '+243970783150', '24LIAGELJ1071156');
CALL sp_importer_etudiant_isig('KAYUMBA MUSEBULA JONATHAN', 'jmusebula@gmail.com', '+243995161495', '24LIAGELJ1071157');
CALL sp_importer_etudiant_isig('KITSA LUSENGE SAGE', 'sagelusenge+isig@gmail.com', '+243980208012', '24LIAGELJ1071158');
CALL sp_importer_etudiant_isig('MERVEILLE ISABU SAFI', 'merveilleisabusafi@gmail.com', '+243823391118', '24LIAGELJ1071159');
CALL sp_importer_etudiant_isig('MESHE MUNIHIRE BERTHOLLET', 'bertholleltmunihire@gmail.com', '+243822262471', '24LIAGELJ1071160');

DROP PROCEDURE IF EXISTS sp_importer_etudiant_isig;

-- Nom public simplifié du modèle IA.
SET @sql_modele_orientation = IF(
  EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'conversations_orientation'
  ),
  "UPDATE conversations_orientation SET modele_ia = 'campushubai' WHERE modele_ia <> 'campushubai'",
  'SELECT 1'
);
PREPARE stmt FROM @sql_modele_orientation;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_modele_copilote = IF(
  EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'generations_copilote'
  ),
  "UPDATE generations_copilote SET modele_ia = 'campushubai' WHERE modele_ia <> 'campushubai'",
  'SELECT 1'
);
PREPARE stmt FROM @sql_modele_copilote;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT
  (SELECT code_universite FROM universites WHERE id = @isig_id) AS code_universite,
  @isig_login AS login_gestionnaire,
  (SELECT COUNT(*) FROM filieres WHERE universite_id = @isig_id AND est_active = 1) AS filieres_actives,
  (SELECT COUNT(*) FROM profils_etudiants WHERE universite_id = @isig_id AND statut_institution = 'ACTIF') AS etudiants_actifs;
