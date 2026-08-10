-- ============================================================
-- CampusHub - 15. Établissements et comptes de démonstration
-- 10 établissements supérieurs + 10 écoles secondaires.
-- Toutes les fiches ci-dessous sont fictives et vérifiées afin
-- de permettre une démonstration complète de l'annuaire.
-- Le script est idempotent : il peut être exécuté plusieurs fois.
-- ============================================================

USE campushub;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_ajouter_etablissement_demo$$
CREATE PROCEDURE sp_ajouter_etablissement_demo(
  IN p_email VARCHAR(190),
  IN p_nom VARCHAR(180),
  IN p_sigle VARCHAR(20),
  IN p_slug VARCHAR(190),
  IN p_type VARCHAR(20),
  IN p_categorie VARCHAR(30),
  IN p_ville VARCHAR(100),
  IN p_province VARCHAR(100),
  IN p_description TEXT,
  IN p_couverture VARCHAR(500)
)
BEGIN
  DECLARE v_utilisateur_id BIGINT UNSIGNED;
  DECLARE v_universite_id BIGINT UNSIGNED;

  INSERT INTO utilisateurs (
    id, code_utilisateur, email, mot_de_passe_hash, role, statut_compte,
    statut_verification, nom_affichage, ville, province, date_verification_email
  )
  SELECT 0, '', p_email,
    '$2b$12$W9V.tWlcTKHoRyUA5pNGGOW1MuliEST.aET4mDjI.m52rK5eezJAi',
    'UNIVERSITE', 'ACTIF', 'VERIFIE', p_nom, p_ville, p_province, CURRENT_TIMESTAMP
  WHERE NOT EXISTS (SELECT 1 FROM utilisateurs WHERE email = p_email);

  SELECT id INTO v_utilisateur_id FROM utilisateurs WHERE email = p_email LIMIT 1;

  INSERT INTO universites (
    id, code_universite, nom, sigle, slug, type_universite,
    categorie_etablissement, statut_verification, description,
    url_couverture, email, ville, province, pays, inscriptions_ouvertes,
    date_debut_inscription, date_fin_inscription
  )
  SELECT 0, '', p_nom, p_sigle, p_slug, p_type, p_categorie, 'VERIFIEE',
    p_description, p_couverture, p_email, p_ville, p_province,
    'République démocratique du Congo', 1, CURRENT_DATE,
    DATE_ADD(CURRENT_DATE, INTERVAL 90 DAY)
  WHERE NOT EXISTS (SELECT 1 FROM universites WHERE slug = p_slug);

  SELECT id INTO v_universite_id FROM universites WHERE slug = p_slug LIMIT 1;

  INSERT INTO membres_universite (
    id, code_membre, universite_id, utilisateur_id, fonction, est_proprietaire
  )
  SELECT 0, '', v_universite_id, v_utilisateur_id, 'Gestionnaire principal', 1
  WHERE NOT EXISTS (
    SELECT 1 FROM membres_universite
    WHERE universite_id = v_universite_id AND utilisateur_id = v_utilisateur_id
  );

  INSERT INTO campus (
    id, code_campus, universite_id, nom, adresse, ville, province,
    latitude, longitude, est_principal
  )
  SELECT 0, '', v_universite_id, CONCAT('Campus principal — ', p_ville),
    'Adresse fictive de démonstration', p_ville, p_province, NULL, NULL, 1
  WHERE NOT EXISTS (
    SELECT 1 FROM campus WHERE universite_id = v_universite_id AND est_principal = 1
  );
END$$

DELIMITER ;

START TRANSACTION;

-- Comptes universitaires et instituts supérieurs fictifs.
CALL sp_ajouter_etablissement_demo(
  'universite01@campushub.test', 'Université Démonstration des Grands Lacs', 'UDGL',
  'universite-demonstration-grands-lacs', 'PRIVEE', 'UNIVERSITE', 'Goma', 'Nord-Kivu',
  'Université fictive consacrée aux sciences, à la technologie et à l’entrepreneuriat.', '/images/campus-goma.webp'
);
CALL sp_ajouter_etablissement_demo(
  'universite02@campushub.test', 'Institut Supérieur Démonstration de Technologie', 'ISDT',
  'institut-superieur-demonstration-technologie', 'PRIVEE', 'INSTITUT_SUPERIEUR', 'Bukavu', 'Sud-Kivu',
  'Institut fictif proposant des parcours techniques et numériques.', '/images/campus-technologie.webp'
);
CALL sp_ajouter_etablissement_demo(
  'universite03@campushub.test', 'Université Démonstration de Kinshasa', 'UDK',
  'universite-demonstration-kinshasa', 'PUBLIQUE', 'UNIVERSITE', 'Kinshasa', 'Kinshasa',
  'Université publique fictive dédiée à la démonstration de CampusHub.', '/images/campus-jardin.webp'
);
CALL sp_ajouter_etablissement_demo(
  'universite04@campushub.test', 'Académie Démonstration de Santé du Kasaï', 'ADSK',
  'academie-demonstration-sante-kasai', 'PRIVEE', 'INSTITUT_SUPERIEUR', 'Kananga', 'Kasaï-Central',
  'Académie fictive de santé communautaire et de gestion hospitalière.', '/images/campus-goma.webp'
);
CALL sp_ajouter_etablissement_demo(
  'universite05@campushub.test', 'Institut Démonstration d’Agronomie du Katanga', 'IDAK',
  'institut-demonstration-agronomie-katanga', 'PUBLIQUE', 'INSTITUT_SUPERIEUR', 'Lubumbashi', 'Haut-Katanga',
  'Institut fictif axé sur l’agronomie durable et les sciences environnementales.', '/images/campus-jardin.webp'
);
CALL sp_ajouter_etablissement_demo(
  'universite06@campushub.test', 'Université Démonstration du Fleuve Congo', 'UDFC',
  'universite-demonstration-fleuve-congo', 'PRIVEE', 'UNIVERSITE', 'Mbandaka', 'Équateur',
  'Université fictive offrant des formations pluridisciplinaires.', '/images/campus-technologie.webp'
);
CALL sp_ajouter_etablissement_demo(
  'universite07@campushub.test', 'Institut Démonstration de Gestion de Bunia', 'IDGB',
  'institut-demonstration-gestion-bunia', 'PRIVEE', 'INSTITUT_SUPERIEUR', 'Bunia', 'Ituri',
  'Institut fictif spécialisé en gestion, finance et entrepreneuriat.', '/images/campus-goma.webp'
);
CALL sp_ajouter_etablissement_demo(
  'universite08@campushub.test', 'Université Démonstration des Sciences de Matadi', 'UDSM',
  'universite-demonstration-sciences-matadi', 'PUBLIQUE', 'UNIVERSITE', 'Matadi', 'Kongo-Central',
  'Université fictive de sciences appliquées et d’ingénierie.', '/images/campus-technologie.webp'
);
CALL sp_ajouter_etablissement_demo(
  'universite09@campushub.test', 'Institut Démonstration Pédagogique de Kisangani', 'IDPK',
  'institut-demonstration-pedagogique-kisangani', 'PUBLIQUE', 'INSTITUT_SUPERIEUR', 'Kisangani', 'Tshopo',
  'Institut fictif consacré aux métiers de l’enseignement et de la pédagogie.', '/images/campus-jardin.webp'
);
CALL sp_ajouter_etablissement_demo(
  'universite10@campushub.test', 'Université Démonstration de l’Équateur', 'UDEQ',
  'universite-demonstration-equateur', 'PRIVEE', 'UNIVERSITE', 'Gemena', 'Sud-Ubangi',
  'Université fictive présentant les fonctions de gestion institutionnelle de CampusHub.', '/images/campus-goma.webp'
);

-- Comptes d'écoles secondaires fictives.
CALL sp_ajouter_etablissement_demo(
  'secondaire01@campushub.test', 'Complexe Scolaire Démonstration Amani', 'CSDA',
  'complexe-scolaire-demonstration-amani', 'PRIVEE', 'ECOLE_SECONDAIRE', 'Goma', 'Nord-Kivu',
  'École secondaire fictive proposant des humanités scientifiques et littéraires.', '/images/campus-jardin.webp'
);
CALL sp_ajouter_etablissement_demo(
  'secondaire02@campushub.test', 'Lycée Démonstration du Kivu', 'LDK',
  'lycee-demonstration-kivu', 'PUBLIQUE', 'ECOLE_SECONDAIRE', 'Bukavu', 'Sud-Kivu',
  'Lycée fictif réservé aux scénarios de démonstration.', '/images/campus-goma.webp'
);
CALL sp_ajouter_etablissement_demo(
  'secondaire03@campushub.test', 'Collège Démonstration Lumière', 'CDL',
  'college-demonstration-lumiere', 'PRIVEE', 'ECOLE_SECONDAIRE', 'Kinshasa', 'Kinshasa',
  'Collège fictif axé sur les sciences, les langues et le numérique.', '/images/campus-technologie.webp'
);
CALL sp_ajouter_etablissement_demo(
  'secondaire04@campushub.test', 'Institut Technique Démonstration Salama', 'ITDS',
  'institut-technique-demonstration-salama', 'PUBLIQUE', 'ECOLE_SECONDAIRE', 'Lubumbashi', 'Haut-Katanga',
  'École technique fictive dédiée à l’électricité, la mécanique et l’informatique.', '/images/campus-jardin.webp'
);
CALL sp_ajouter_etablissement_demo(
  'secondaire05@campushub.test', 'École Secondaire Démonstration Umoja', 'ESDU',
  'ecole-secondaire-demonstration-umoja', 'PRIVEE', 'ECOLE_SECONDAIRE', 'Bunia', 'Ituri',
  'École fictive présentant le parcours d’inscription secondaire.', '/images/campus-goma.webp'
);
CALL sp_ajouter_etablissement_demo(
  'secondaire06@campushub.test', 'Collège Démonstration du Fleuve', 'CDF',
  'college-demonstration-fleuve', 'PUBLIQUE', 'ECOLE_SECONDAIRE', 'Matadi', 'Kongo-Central',
  'Collège fictif proposant des options générales et commerciales.', '/images/campus-technologie.webp'
);
CALL sp_ajouter_etablissement_demo(
  'secondaire07@campushub.test', 'Lycée Démonstration de la Tshopo', 'LDT',
  'lycee-demonstration-tshopo', 'PRIVEE', 'ECOLE_SECONDAIRE', 'Kisangani', 'Tshopo',
  'Lycée fictif destiné aux démonstrations de recherche et de filtrage.', '/images/campus-jardin.webp'
);
CALL sp_ajouter_etablissement_demo(
  'secondaire08@campushub.test', 'Complexe Scolaire Démonstration Espoir', 'CSDE',
  'complexe-scolaire-demonstration-espoir', 'PRIVEE', 'ECOLE_SECONDAIRE', 'Kananga', 'Kasaï-Central',
  'Complexe scolaire fictif proposant plusieurs options secondaires.', '/images/campus-goma.webp'
);
CALL sp_ajouter_etablissement_demo(
  'secondaire09@campushub.test', 'Institut Secondaire Démonstration Mbandaka', 'ISDM',
  'institut-secondaire-demonstration-mbandaka', 'PUBLIQUE', 'ECOLE_SECONDAIRE', 'Mbandaka', 'Équateur',
  'Institut secondaire fictif utilisé pour la présentation de CampusHub.', '/images/campus-technologie.webp'
);
CALL sp_ajouter_etablissement_demo(
  'secondaire10@campushub.test', 'Collège Démonstration du Sud-Ubangi', 'CDSU',
  'college-demonstration-sud-ubangi', 'PRIVEE', 'ECOLE_SECONDAIRE', 'Gemena', 'Sud-Ubangi',
  'Collège fictif permettant de tester l’annuaire national.', '/images/campus-jardin.webp'
);

-- Garantit également l'accès au compte administrateur de démonstration.
INSERT INTO utilisateurs (
  id, code_utilisateur, email, mot_de_passe_hash, role, statut_compte,
  statut_verification, nom_affichage, ville, province, date_verification_email
)
SELECT 0, '', 'admin@campushub.test',
  '$2b$12$fjXn8YO6ZbIR2T9nVwzMYOZrBw0VHTi1pvZTSHMn9.G5D5cd5naYi',
  'ADMINISTRATEUR', 'ACTIF', 'VERIFIE', 'Administration CampusHub',
  'Goma', 'Nord-Kivu', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM utilisateurs WHERE email = 'admin@campushub.test');

UPDATE utilisateurs
SET mot_de_passe_hash = '$2b$12$fjXn8YO6ZbIR2T9nVwzMYOZrBw0VHTi1pvZTSHMn9.G5D5cd5naYi',
    statut_compte = 'ACTIF', statut_verification = 'VERIFIE'
WHERE email = 'admin@campushub.test';

COMMIT;

DROP PROCEDURE IF EXISTS sp_ajouter_etablissement_demo;

SELECT categorie_etablissement, COUNT(*) AS nombre
FROM universites
WHERE slug LIKE '%demonstration%'
GROUP BY categorie_etablissement;
