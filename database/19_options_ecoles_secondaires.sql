-- ============================================================
-- CampusHub - 19. Options comparables des écoles secondaires
-- À exécuter après 18_documents_offres_et_republications.sql
-- ============================================================

USE campushub;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Une section commune permet aux gestionnaires scolaires de compléter ensuite
-- les options propres à leur établissement depuis leur espace CampusHub.
INSERT INTO facultes (id, code_faculte, universite_id, nom, slug, description)
SELECT 0, '', u.id, 'Sections secondaires', 'sections-secondaires',
       'Regroupement des options proposées au niveau secondaire.'
FROM universites u
WHERE u.categorie_etablissement = 'ECOLE_SECONDAIRE'
  AND NOT EXISTS (
    SELECT 1 FROM facultes f
    WHERE f.universite_id = u.id AND f.slug = 'sections-secondaires'
  );

-- Trois branches de démonstration rendent le filtrage et la comparaison
-- immédiatement testables sans modifier les options déjà créées par une école.
INSERT INTO filieres (
  id, code_filiere, universite_id, faculte_id, nom, slug, domaine,
  niveau_diplome, duree_annees, description, frais_minimum, frais_maximum, devise, est_active
)
SELECT 0, '', u.id, f.id, options_demo.nom, options_demo.slug, options_demo.domaine,
       'AUTRE', 1, options_demo.description,
       options_demo.frais_minimum, options_demo.frais_maximum, 'USD', 1
FROM universites u
JOIN facultes f ON f.universite_id = u.id AND f.slug = 'sections-secondaires'
CROSS JOIN (
  SELECT 'Scientifique' AS nom, 'scientifique' AS slug, 'Sciences' AS domaine,
         'Mathématiques, sciences physiques et sciences naturelles.' AS description,
         80.00 AS frais_minimum, 180.00 AS frais_maximum
  UNION ALL
  SELECT 'Commerciale et gestion', 'commerciale-et-gestion', 'Commerce et gestion',
         'Comptabilité, économie, gestion et entrepreneuriat.', 70.00, 160.00
  UNION ALL
  SELECT 'Pédagogie générale', 'pedagogie-generale', 'Pédagogie',
         'Formation générale et initiation aux sciences de l’éducation.', 60.00, 150.00
) AS options_demo
WHERE u.categorie_etablissement = 'ECOLE_SECONDAIRE'
  AND NOT EXISTS (
    SELECT 1 FROM filieres fi
    WHERE fi.universite_id = u.id
      AND fi.slug = options_demo.slug
      AND fi.niveau_diplome = 'AUTRE'
  );

-- Les options sont associées au site principal lorsqu’il existe.
INSERT IGNORE INTO campus_filieres (campus_id, filiere_id)
SELECT c.id, fi.id
FROM campus c
JOIN filieres fi ON fi.universite_id = c.universite_id
JOIN universites u ON u.id = c.universite_id
WHERE u.categorie_etablissement = 'ECOLE_SECONDAIRE'
  AND c.est_principal = 1
  AND fi.slug IN ('scientifique', 'commerciale-et-gestion', 'pedagogie-generale');

SELECT 'Options des écoles secondaires prêtes pour le comparateur' AS message;
