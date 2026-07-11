-- ============================================================
-- CampusHub - Exemples d'utilisation
-- Ce fichier sert de documentation et ne doit pas être exécuté en bloc.
-- ============================================================

USE campushub;

-- 1. Consulter les universités avec leurs statistiques.
SELECT * FROM vue_universites_resume;

-- 2. Consulter le catalogue des filières.
SELECT *
FROM vue_catalogue_filieres
WHERE ville = 'Goma' AND domaine LIKE '%Informatique%';

-- 3. Rechercher des universités.
-- Ordre : ville, province, type, filière, frais maximum, service.
CALL sp_rechercher_universites(
  'Goma', 'Nord-Kivu', NULL, 'Informatique', 700.00, 'Bibliothèque'
);

-- 4. Comparer plusieurs universités à partir de leurs codes.
CALL sp_comparer_universites('ISIG00012026,ULPGL00022026');

-- 5. Afficher les statistiques d'une université à partir de son ID interne.
CALL sp_statistiques_universite(1);

-- 6. Ajouter une université. Le code et le sigle seront calculés si le sigle est NULL.
-- CALL sp_ajouter_universite(
--   'Université Libre des Pays des Grands Lacs',
--   NULL,
--   'universite-libre-pays-grands-lacs',
--   'PRIVEE',
--   'Description de l’établissement.',
--   'Goma',
--   'Nord-Kivu',
--   'contact@universite.cd',
--   '+243000000000'
-- );

-- 7. Lire le fil académique.
SELECT * FROM vue_fil_actualite ORDER BY date_publication DESC;

-- 8. Consulter les signalements à traiter.
SELECT * FROM vue_signalements_a_traiter ORDER BY date_creation;

-- 9. Consulter les notifications non lues d'un utilisateur.
SELECT *
FROM vue_notifications_non_lues
WHERE destinataire_id = 1
ORDER BY date_creation DESC;

-- 10. Marquer toutes les notifications d'un utilisateur comme lues.
-- CALL sp_marquer_notifications_lues(1);
