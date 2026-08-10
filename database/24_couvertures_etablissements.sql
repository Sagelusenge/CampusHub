-- Couvertures de démonstration pour les fiches qui n'ont pas encore chargé leur propre image.
-- Une couverture envoyée depuis « Fiche publique » remplace immédiatement cette valeur.
USE campushub;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

UPDATE universites
SET url_couverture = CASE
  WHEN categorie_etablissement = 'ECOLE_SECONDAIRE' THEN '/images/campus-jardin.webp'
  WHEN categorie_etablissement = 'INSTITUT_SUPERIEUR' THEN '/images/campus-technologie.webp'
  ELSE '/images/campus-goma.webp'
END
WHERE url_couverture IS NULL OR TRIM(url_couverture) = '';
