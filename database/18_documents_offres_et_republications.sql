-- ============================================================
-- CampusHub - 18. Documents PDF et republications traçables
-- À exécuter après 17_offres_etablissements.sql
-- ============================================================

USE campushub;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @ddl_offre_url_document = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE()
   AND table_name = 'offres_etablissements' AND column_name = 'url_document') = 0,
  'ALTER TABLE offres_etablissements ADD COLUMN url_document VARCHAR(500) NULL AFTER url_image',
  'SELECT 1'
);
PREPARE stmt_offre_url_document FROM @ddl_offre_url_document;
EXECUTE stmt_offre_url_document;
DEALLOCATE PREPARE stmt_offre_url_document;

SET @ddl_offre_nom_document = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE()
   AND table_name = 'offres_etablissements' AND column_name = 'nom_document') = 0,
  'ALTER TABLE offres_etablissements ADD COLUMN nom_document VARCHAR(255) NULL AFTER url_document',
  'SELECT 1'
);
PREPARE stmt_offre_nom_document FROM @ddl_offre_nom_document;
EXECUTE stmt_offre_nom_document;
DEALLOCATE PREPARE stmt_offre_nom_document;

SET @ddl_publication_source = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE()
   AND table_name = 'publications' AND column_name = 'publication_source_id') = 0,
  'ALTER TABLE publications ADD COLUMN publication_source_id BIGINT UNSIGNED NULL AFTER universite_id, ADD CONSTRAINT fk_publications_source FOREIGN KEY (publication_source_id) REFERENCES publications(id) ON DELETE SET NULL, ADD INDEX idx_publications_source (publication_source_id)',
  'SELECT 1'
);
PREPARE stmt_publication_source FROM @ddl_publication_source;
EXECUTE stmt_publication_source;
DEALLOCATE PREPARE stmt_publication_source;

SET @ddl_offre_source = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE()
   AND table_name = 'publications' AND column_name = 'offre_source_id') = 0,
  'ALTER TABLE publications ADD COLUMN offre_source_id BIGINT UNSIGNED NULL AFTER publication_source_id, ADD CONSTRAINT fk_publications_offre_source FOREIGN KEY (offre_source_id) REFERENCES offres_etablissements(id) ON DELETE SET NULL, ADD INDEX idx_publications_offre_source (offre_source_id)',
  'SELECT 1'
);
PREPARE stmt_offre_source FROM @ddl_offre_source;
EXECUTE stmt_offre_source;
DEALLOCATE PREPARE stmt_offre_source;

CREATE OR REPLACE VIEW vue_offres_etablissements AS
SELECT
  o.id, o.code_offre, o.titre, o.type_offre, o.public_cible, o.description,
  o.conditions, o.modalite, o.ville, o.province, o.url_candidature,
  o.email_contact, o.url_image, o.url_document, o.nom_document,
  o.date_debut, o.date_limite, o.statut,
  o.date_publication, o.date_creation, o.date_modification,
  u.id AS universite_id, u.code_universite, u.nom AS nom_etablissement,
  u.sigle, u.slug, u.categorie_etablissement, u.type_universite,
  u.url_logo, u.statut_verification,
  a.code_utilisateur AS code_auteur, a.nom_affichage AS nom_auteur,
  CASE WHEN o.date_limite IS NOT NULL AND o.date_limite < CURRENT_DATE THEN 1 ELSE 0 END AS est_expiree
FROM offres_etablissements o
JOIN universites u ON u.id = o.universite_id
JOIN utilisateurs a ON a.id = o.auteur_id;

CREATE OR REPLACE VIEW vue_fil_actualite AS
SELECT
  p.id, p.code_publication, p.titre, p.contenu, p.type_publication,
  p.etiquettes, p.date_publication, p.publication_source_id, p.offre_source_id,
  a.id AS auteur_id, a.code_utilisateur AS code_auteur,
  a.nom_affichage AS nom_auteur, a.url_photo_profil AS photo_auteur,
  u.code_universite, u.nom AS nom_universite,
  ps.code_publication AS code_publication_source,
  ps.titre AS titre_publication_source,
  os.code_offre AS code_offre_source,
  os.titre AS titre_offre_source,
  os.url_image AS image_offre_source,
  ous.nom AS nom_etablissement_source,
  (SELECT COUNT(*) FROM medias_publication m WHERE m.publication_id = p.id) AS nombre_medias,
  (SELECT COUNT(*) FROM mentions_jaime j WHERE j.publication_id = p.id) AS nombre_jaime,
  (SELECT COUNT(*) FROM commentaires c WHERE c.publication_id = p.id) AS nombre_commentaires,
  (SELECT COUNT(*) FROM favoris_publications f WHERE f.publication_id = p.id) AS nombre_favoris
FROM publications p
JOIN utilisateurs a ON a.id = p.auteur_id
LEFT JOIN universites u ON u.id = p.universite_id
LEFT JOIN publications ps ON ps.id = p.publication_source_id
LEFT JOIN offres_etablissements os ON os.id = p.offre_source_id
LEFT JOIN universites ous ON ous.id = os.universite_id
WHERE p.statut_publication = 'PUBLIEE';

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
WHERE pe.est_visible = 1 AND ut.statut_compte = 'ACTIF';

SELECT 'Documents PDF et republications activés' AS message;
