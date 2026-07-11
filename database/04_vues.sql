-- ============================================================
-- CampusHub - 04. Vues de consultation
-- À exécuter après 03_procedures.sql
-- ============================================================

USE campushub;

CREATE OR REPLACE VIEW vue_universites_resume AS
SELECT
  u.id,
  u.code_universite,
  u.nom,
  u.sigle,
  u.slug,
  u.type_universite,
  u.statut_verification,
  u.ville,
  u.province,
  u.pays,
  u.inscriptions_ouvertes,
  u.date_debut_inscription,
  u.date_fin_inscription,
  (SELECT COUNT(*) FROM campus c WHERE c.universite_id = u.id) AS nombre_campus,
  (SELECT COUNT(*) FROM facultes fa WHERE fa.universite_id = u.id) AS nombre_facultes,
  (SELECT COUNT(*) FROM filieres fi WHERE fi.universite_id = u.id AND fi.est_active = 1) AS nombre_filieres,
  (SELECT COUNT(*) FROM profils_etudiants pe WHERE pe.universite_id = u.id) AS nombre_etudiants,
  (SELECT COUNT(*) FROM abonnements_universites au WHERE au.universite_id = u.id) AS nombre_abonnes,
  (SELECT MIN(fi.frais_minimum) FROM filieres fi WHERE fi.universite_id = u.id AND fi.est_active = 1) AS frais_minimum,
  (SELECT MAX(fi.frais_maximum) FROM filieres fi WHERE fi.universite_id = u.id AND fi.est_active = 1) AS frais_maximum
FROM universites u;

CREATE OR REPLACE VIEW vue_catalogue_filieres AS
SELECT
  fi.id,
  fi.code_filiere,
  fi.nom AS nom_filiere,
  fi.domaine,
  fi.niveau_diplome,
  fi.duree_annees,
  fi.frais_minimum,
  fi.frais_maximum,
  fi.devise,
  fi.est_active,
  fa.code_faculte,
  fa.nom AS nom_faculte,
  u.id AS universite_id,
  u.code_universite,
  u.nom AS nom_universite,
  u.sigle AS sigle_universite,
  u.type_universite,
  u.ville,
  u.province,
  u.statut_verification
FROM filieres fi
JOIN facultes fa ON fa.id = fi.faculte_id
JOIN universites u ON u.id = fi.universite_id;

CREATE OR REPLACE VIEW vue_profils_etudiants_publics AS
SELECT
  pe.id,
  pe.code_profil,
  ut.code_utilisateur,
  ut.nom_affichage,
  ut.url_photo_profil,
  ut.biographie,
  pe.titre_profil,
  pe.competences,
  pe.annee_diplomation,
  pe.matricule_etudiant,
  u.code_universite,
  u.nom AS nom_universite,
  fi.code_filiere,
  fi.nom AS nom_filiere,
  (SELECT COUNT(*) FROM publications p WHERE p.auteur_id = ut.id AND p.statut_publication = 'PUBLIEE') AS nombre_publications,
  (SELECT COUNT(*) FROM abonnements_utilisateurs a WHERE a.utilisateur_suivi_id = ut.id) AS nombre_abonnes
FROM profils_etudiants pe
JOIN utilisateurs ut ON ut.id = pe.utilisateur_id
LEFT JOIN universites u ON u.id = pe.universite_id
LEFT JOIN filieres fi ON fi.id = pe.filiere_id
WHERE pe.est_visible = 1
  AND ut.statut_compte = 'ACTIF';

CREATE OR REPLACE VIEW vue_fil_actualite AS
SELECT
  p.id,
  p.code_publication,
  p.titre,
  p.contenu,
  p.type_publication,
  p.etiquettes,
  p.date_publication,
  a.id AS auteur_id,
  a.code_utilisateur AS code_auteur,
  a.nom_affichage AS nom_auteur,
  a.url_photo_profil AS photo_auteur,
  u.code_universite,
  u.nom AS nom_universite,
  (SELECT COUNT(*) FROM medias_publication m WHERE m.publication_id = p.id) AS nombre_medias,
  (SELECT COUNT(*) FROM mentions_jaime j WHERE j.publication_id = p.id) AS nombre_jaime,
  (SELECT COUNT(*) FROM commentaires c WHERE c.publication_id = p.id) AS nombre_commentaires,
  (SELECT COUNT(*) FROM favoris_publications f WHERE f.publication_id = p.id) AS nombre_favoris
FROM publications p
JOIN utilisateurs a ON a.id = p.auteur_id
LEFT JOIN universites u ON u.id = p.universite_id
WHERE p.statut_publication = 'PUBLIEE';

CREATE OR REPLACE VIEW vue_signalements_a_traiter AS
SELECT
  s.id,
  s.code_signalement,
  s.motif,
  s.details,
  s.statut_signalement,
  s.date_creation,
  s.date_examen,
  declarant.code_utilisateur AS code_declarant,
  declarant.nom_affichage AS nom_declarant,
  moderateur.code_utilisateur AS code_moderateur,
  moderateur.nom_affichage AS nom_moderateur,
  p.code_publication,
  p.titre AS titre_publication,
  auteur.nom_affichage AS auteur_publication
FROM signalements s
JOIN utilisateurs declarant ON declarant.id = s.auteur_signalement_id
LEFT JOIN utilisateurs moderateur ON moderateur.id = s.moderateur_id
LEFT JOIN publications p ON p.id = s.publication_id
LEFT JOIN utilisateurs auteur ON auteur.id = p.auteur_id
WHERE s.statut_signalement IN ('OUVERT', 'EN_EXAMEN');

CREATE OR REPLACE VIEW vue_statistiques_universites AS
SELECT
  u.id,
  u.code_universite,
  u.nom,
  u.ville,
  u.province,
  (SELECT COUNT(*) FROM facultes f WHERE f.universite_id = u.id) AS total_facultes,
  (SELECT COUNT(*) FROM filieres f WHERE f.universite_id = u.id AND f.est_active = 1) AS total_filieres,
  (SELECT COUNT(*) FROM profils_etudiants pe WHERE pe.universite_id = u.id) AS total_etudiants,
  (SELECT COUNT(*) FROM publications p WHERE p.universite_id = u.id AND p.statut_publication = 'PUBLIEE') AS total_publications,
  (SELECT COUNT(*) FROM abonnements_universites au WHERE au.universite_id = u.id) AS total_abonnes,
  (SELECT COUNT(*) FROM services_universitaires s WHERE s.universite_id = u.id AND s.est_disponible = 1) AS total_services,
  (SELECT COUNT(*) FROM infrastructures i WHERE i.universite_id = u.id) AS total_infrastructures
FROM universites u;

CREATE OR REPLACE VIEW vue_notifications_non_lues AS
SELECT
  n.id,
  n.code_notification,
  n.destinataire_id,
  n.type_notification,
  n.titre,
  n.message,
  n.url_action,
  n.date_creation,
  acteur.code_utilisateur AS code_acteur,
  acteur.nom_affichage AS nom_acteur
FROM notifications n
LEFT JOIN utilisateurs acteur ON acteur.id = n.acteur_id
WHERE n.date_lecture IS NULL;

SELECT 'Vues CampusHub créées avec succès' AS message;
