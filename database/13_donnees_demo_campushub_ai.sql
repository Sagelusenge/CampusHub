-- ============================================================
-- CampusHub - 13. Données fictives pour la démonstration IA
-- À exécuter après 12_campushub_ai_orientation.sql
-- Ces établissements sont explicitement fictifs : ne pas les
-- présenter comme des institutions réelles.
-- ============================================================

USE campushub;

START TRANSACTION;

INSERT INTO universites
  (id, code_universite, nom, sigle, slug, type_universite,
   categorie_etablissement, statut_verification, description,
   ville, province, pays, latitude, longitude, inscriptions_ouvertes,
   date_debut_inscription, date_fin_inscription)
SELECT 0, '', 'Institut Démonstration Numérique du Kivu', 'IDNK',
       'institut-demonstration-numerique-kivu', 'PRIVEE',
       'INSTITUT_SUPERIEUR', 'VERIFIEE',
       'Établissement fictif réservé aux démonstrations de CampusHub AI.',
       'Goma', 'Nord-Kivu', 'République démocratique du Congo',
       -1.674090, 29.228450, 1, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 90 DAY)
WHERE NOT EXISTS (
  SELECT 1 FROM universites WHERE slug = 'institut-demonstration-numerique-kivu'
);

SET @universite_numerique = (
  SELECT id FROM universites WHERE slug = 'institut-demonstration-numerique-kivu' LIMIT 1
);

INSERT INTO campus (id, code_campus, universite_id, nom, adresse, ville, province, latitude, longitude, est_principal)
SELECT 0, '', @universite_numerique, 'Campus Démonstration Goma', 'Quartier numérique — adresse fictive',
       'Goma', 'Nord-Kivu', -1.674090, 29.228450, 1
WHERE NOT EXISTS (SELECT 1 FROM campus WHERE universite_id = @universite_numerique AND nom = 'Campus Démonstration Goma');

SET @campus_numerique = (
  SELECT id FROM campus WHERE universite_id = @universite_numerique AND nom = 'Campus Démonstration Goma' LIMIT 1
);

INSERT INTO facultes (id, code_faculte, universite_id, nom, slug, description)
SELECT 0, '', @universite_numerique, 'Sciences numériques', 'sciences-numeriques',
       'Faculté fictive utilisée pour tester les recommandations vérifiables.'
WHERE NOT EXISTS (SELECT 1 FROM facultes WHERE universite_id = @universite_numerique AND slug = 'sciences-numeriques');

SET @faculte_numerique = (
  SELECT id FROM facultes WHERE universite_id = @universite_numerique AND slug = 'sciences-numeriques' LIMIT 1
);

INSERT INTO filieres
  (id, code_filiere, universite_id, faculte_id, nom, slug, domaine, niveau_diplome,
   duree_annees, description, frais_minimum, frais_maximum, devise, est_active)
SELECT 0, '', @universite_numerique, @faculte_numerique, 'Génie logiciel et intelligence artificielle',
       'genie-logiciel-intelligence-artificielle', 'Informatique', 'LICENCE', 3,
       'Parcours fictif orienté développement logiciel, données et IA responsable.', 480, 720, 'USD', 1
WHERE NOT EXISTS (
  SELECT 1 FROM filieres WHERE universite_id = @universite_numerique
    AND slug = 'genie-logiciel-intelligence-artificielle' AND niveau_diplome = 'LICENCE'
);

SET @filiere_ia = (
  SELECT id FROM filieres WHERE universite_id = @universite_numerique
    AND slug = 'genie-logiciel-intelligence-artificielle' AND niveau_diplome = 'LICENCE' LIMIT 1
);

INSERT INTO filieres
  (id, code_filiere, universite_id, faculte_id, nom, slug, domaine, niveau_diplome,
   duree_annees, description, frais_minimum, frais_maximum, devise, est_active)
SELECT 0, '', @universite_numerique, @faculte_numerique, 'Réseaux et cybersécurité',
       'reseaux-cybersecurite', 'Informatique', 'LICENCE', 3,
       'Parcours fictif en administration réseau, sécurité et infrastructures.', 420, 650, 'USD', 1
WHERE NOT EXISTS (
  SELECT 1 FROM filieres WHERE universite_id = @universite_numerique
    AND slug = 'reseaux-cybersecurite' AND niveau_diplome = 'LICENCE'
);

SET @filiere_cyber = (
  SELECT id FROM filieres WHERE universite_id = @universite_numerique
    AND slug = 'reseaux-cybersecurite' AND niveau_diplome = 'LICENCE' LIMIT 1
);

INSERT IGNORE INTO campus_filieres (campus_id, filiere_id)
VALUES (@campus_numerique, @filiere_ia), (@campus_numerique, @filiere_cyber);

INSERT INTO conditions_admission (id, code_condition, universite_id, titre, description, niveau_diplome)
SELECT 0, '', @universite_numerique, 'Admission en licence — démonstration',
       'Présenter un diplôme d’État, les relevés disponibles et une pièce d’identité. Condition fictive à confirmer.', 'LICENCE'
WHERE NOT EXISTS (
  SELECT 1 FROM conditions_admission WHERE universite_id = @universite_numerique
    AND titre = 'Admission en licence — démonstration'
);

INSERT INTO universites
  (id, code_universite, nom, sigle, slug, type_universite,
   categorie_etablissement, statut_verification, description,
   ville, province, pays, latitude, longitude, inscriptions_ouvertes,
   date_debut_inscription, date_fin_inscription)
SELECT 0, '', 'Académie Démonstration Santé et Gestion', 'ADSG',
       'academie-demonstration-sante-gestion', 'PRIVEE',
       'UNIVERSITE', 'VERIFIEE',
       'Établissement fictif réservé aux démonstrations de CampusHub AI.',
       'Bukavu', 'Sud-Kivu', 'République démocratique du Congo',
       -2.503120, 28.860830, 1, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 75 DAY)
WHERE NOT EXISTS (
  SELECT 1 FROM universites WHERE slug = 'academie-demonstration-sante-gestion'
);

SET @universite_sante = (
  SELECT id FROM universites WHERE slug = 'academie-demonstration-sante-gestion' LIMIT 1
);

INSERT INTO campus (id, code_campus, universite_id, nom, adresse, ville, province, latitude, longitude, est_principal)
SELECT 0, '', @universite_sante, 'Campus Démonstration Bukavu', 'Avenue académique — adresse fictive',
       'Bukavu', 'Sud-Kivu', -2.503120, 28.860830, 1
WHERE NOT EXISTS (SELECT 1 FROM campus WHERE universite_id = @universite_sante AND nom = 'Campus Démonstration Bukavu');

SET @campus_sante = (
  SELECT id FROM campus WHERE universite_id = @universite_sante AND nom = 'Campus Démonstration Bukavu' LIMIT 1
);

INSERT INTO facultes (id, code_faculte, universite_id, nom, slug, description)
SELECT 0, '', @universite_sante, 'Santé communautaire', 'sante-communautaire',
       'Faculté fictive destinée à la démonstration CampusHub.'
WHERE NOT EXISTS (SELECT 1 FROM facultes WHERE universite_id = @universite_sante AND slug = 'sante-communautaire');

SET @faculte_sante = (
  SELECT id FROM facultes WHERE universite_id = @universite_sante AND slug = 'sante-communautaire' LIMIT 1
);

INSERT INTO facultes (id, code_faculte, universite_id, nom, slug, description)
SELECT 0, '', @universite_sante, 'Économie et gestion', 'economie-gestion',
       'Faculté fictive destinée à la démonstration CampusHub.'
WHERE NOT EXISTS (SELECT 1 FROM facultes WHERE universite_id = @universite_sante AND slug = 'economie-gestion');

SET @faculte_gestion = (
  SELECT id FROM facultes WHERE universite_id = @universite_sante AND slug = 'economie-gestion' LIMIT 1
);

INSERT INTO filieres
  (id, code_filiere, universite_id, faculte_id, nom, slug, domaine, niveau_diplome,
   duree_annees, description, frais_minimum, frais_maximum, devise, est_active)
SELECT 0, '', @universite_sante, @faculte_sante, 'Santé publique et communautaire',
       'sante-publique-communautaire', 'Santé', 'LICENCE', 3,
       'Parcours fictif consacré à la prévention et aux programmes communautaires.', 380, 580, 'USD', 1
WHERE NOT EXISTS (
  SELECT 1 FROM filieres WHERE universite_id = @universite_sante
    AND slug = 'sante-publique-communautaire' AND niveau_diplome = 'LICENCE'
);

SET @filiere_sante = (
  SELECT id FROM filieres WHERE universite_id = @universite_sante
    AND slug = 'sante-publique-communautaire' AND niveau_diplome = 'LICENCE' LIMIT 1
);

INSERT INTO filieres
  (id, code_filiere, universite_id, faculte_id, nom, slug, domaine, niveau_diplome,
   duree_annees, description, frais_minimum, frais_maximum, devise, est_active)
SELECT 0, '', @universite_sante, @faculte_gestion, 'Gestion des organisations',
       'gestion-organisations', 'Gestion', 'LICENCE', 3,
       'Parcours fictif en entrepreneuriat, finance et gestion de projet.', 330, 520, 'USD', 1
WHERE NOT EXISTS (
  SELECT 1 FROM filieres WHERE universite_id = @universite_sante
    AND slug = 'gestion-organisations' AND niveau_diplome = 'LICENCE'
);

SET @filiere_gestion = (
  SELECT id FROM filieres WHERE universite_id = @universite_sante
    AND slug = 'gestion-organisations' AND niveau_diplome = 'LICENCE' LIMIT 1
);

INSERT IGNORE INTO campus_filieres (campus_id, filiere_id)
VALUES (@campus_sante, @filiere_sante), (@campus_sante, @filiere_gestion);

INSERT INTO conditions_admission (id, code_condition, universite_id, titre, description, niveau_diplome)
SELECT 0, '', @universite_sante, 'Admission en licence — démonstration',
       'Présenter un diplôme d’État et un dossier scolaire. Les exigences propres à la santé doivent être confirmées.', 'LICENCE'
WHERE NOT EXISTS (
  SELECT 1 FROM conditions_admission WHERE universite_id = @universite_sante
    AND titre = 'Admission en licence — démonstration'
);

COMMIT;

SELECT 'Données fictives CampusHub AI installées avec succès' AS message;
