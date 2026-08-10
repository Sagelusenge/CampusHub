-- ============================================================
-- CampusHub - 03. Procédures métier
-- À exécuter après 02_automatismes.sql
-- ============================================================

USE campushub;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_inscrire_utilisateur$$
CREATE PROCEDURE sp_inscrire_utilisateur(
  IN p_email VARCHAR(190),
  IN p_mot_de_passe_hash VARCHAR(255),
  IN p_role VARCHAR(30),
  IN p_nom_affichage VARCHAR(120),
  IN p_ville VARCHAR(100),
  IN p_province VARCHAR(100)
)
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'L’adresse email est obligatoire.';
  END IF;
  IF p_mot_de_passe_hash IS NULL OR CHAR_LENGTH(p_mot_de_passe_hash) < 20 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Le mot de passe doit être transmis sous forme de hash sécurisé.';
  END IF;
  IF p_role NOT IN ('VISITEUR', 'ETUDIANT', 'UNIVERSITE', 'ENTREPRISE') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Le rôle demandé n’est pas autorisé à l’inscription.';
  END IF;

  INSERT INTO utilisateurs (
    code_utilisateur, email, mot_de_passe_hash, role, nom_affichage, ville, province
  ) VALUES ('', p_email, p_mot_de_passe_hash, p_role, p_nom_affichage, p_ville, p_province);

  SET v_id = @campushub_dernier_id;
  SELECT id, code_utilisateur, email, role, statut_compte, date_creation
  FROM utilisateurs WHERE id = v_id;
END$$

DROP PROCEDURE IF EXISTS sp_ajouter_universite$$
CREATE PROCEDURE sp_ajouter_universite(
  IN p_nom VARCHAR(180),
  IN p_sigle VARCHAR(20),
  IN p_slug VARCHAR(190),
  IN p_type_universite VARCHAR(20),
  IN p_description TEXT,
  IN p_ville VARCHAR(100),
  IN p_province VARCHAR(100),
  IN p_email VARCHAR(190),
  IN p_telephone VARCHAR(40)
)
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  IF p_nom IS NULL OR TRIM(p_nom) = '' OR p_slug IS NULL OR TRIM(p_slug) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Le nom et le slug de l’université sont obligatoires.';
  END IF;
  IF p_type_universite NOT IN ('PUBLIQUE', 'PRIVEE') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Le type doit être PUBLIQUE ou PRIVEE.';
  END IF;

  INSERT INTO universites (
    code_universite, nom, sigle, slug, type_universite, description,
    ville, province, email, telephone
  ) VALUES (
    '', p_nom, p_sigle, p_slug, p_type_universite, p_description,
    p_ville, p_province, LOWER(TRIM(p_email)), p_telephone
  );

  SET v_id = @campushub_dernier_id;
  SELECT id, code_universite, nom, sigle, statut_verification, date_creation
  FROM universites WHERE id = v_id;
END$$

DROP PROCEDURE IF EXISTS sp_ajouter_faculte$$
CREATE PROCEDURE sp_ajouter_faculte(
  IN p_universite_id BIGINT UNSIGNED,
  IN p_nom VARCHAR(160),
  IN p_slug VARCHAR(190),
  IN p_description TEXT
)
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  IF NOT EXISTS (SELECT 1 FROM universites WHERE id = p_universite_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Université introuvable.';
  END IF;
  INSERT INTO facultes (code_faculte, universite_id, nom, slug, description)
  VALUES ('', p_universite_id, p_nom, p_slug, p_description);
  SET v_id = @campushub_dernier_id;
  SELECT id, code_faculte, universite_id, nom, slug FROM facultes WHERE id = v_id;
END$$

DROP PROCEDURE IF EXISTS sp_ajouter_filiere$$
CREATE PROCEDURE sp_ajouter_filiere(
  IN p_universite_id BIGINT UNSIGNED,
  IN p_faculte_id BIGINT UNSIGNED,
  IN p_nom VARCHAR(180),
  IN p_slug VARCHAR(190),
  IN p_domaine VARCHAR(140),
  IN p_niveau_diplome VARCHAR(20),
  IN p_duree_annees TINYINT UNSIGNED,
  IN p_frais_minimum DECIMAL(12, 2),
  IN p_frais_maximum DECIMAL(12, 2),
  IN p_devise CHAR(3),
  IN p_description TEXT
)
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  IF p_niveau_diplome NOT IN ('CERTIFICAT', 'LICENCE', 'MASTER', 'DOCTORAT', 'AUTRE') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Niveau de diplôme invalide.';
  END IF;
  INSERT INTO filieres (
    code_filiere, universite_id, faculte_id, nom, slug, domaine, niveau_diplome,
    duree_annees, frais_minimum, frais_maximum, devise, description
  ) VALUES (
    '', p_universite_id, p_faculte_id, p_nom, p_slug, p_domaine, p_niveau_diplome,
    p_duree_annees, p_frais_minimum, p_frais_maximum, UPPER(COALESCE(p_devise, 'USD')), p_description
  );
  SET v_id = @campushub_dernier_id;
  SELECT id, code_filiere, universite_id, faculte_id, nom, niveau_diplome
  FROM filieres WHERE id = v_id;
END$$

DROP PROCEDURE IF EXISTS sp_creer_profil_etudiant$$
CREATE PROCEDURE sp_creer_profil_etudiant(
  IN p_utilisateur_id BIGINT UNSIGNED,
  IN p_universite_id BIGINT UNSIGNED,
  IN p_filiere_id BIGINT UNSIGNED,
  IN p_matricule VARCHAR(80),
  IN p_titre_profil VARCHAR(180),
  IN p_competences JSON,
  IN p_annee_diplomation SMALLINT UNSIGNED
)
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  INSERT INTO profils_etudiants (
    code_profil, utilisateur_id, universite_id, filiere_id, matricule_etudiant,
    titre_profil, competences, annee_diplomation
  ) VALUES (
    '', p_utilisateur_id, p_universite_id, p_filiere_id, p_matricule,
    p_titre_profil, p_competences, p_annee_diplomation
  );
  SET v_id = @campushub_dernier_id;
  SELECT id, code_profil, utilisateur_id, universite_id, filiere_id
  FROM profils_etudiants WHERE id = v_id;
END$$

DROP PROCEDURE IF EXISTS sp_creer_publication$$
CREATE PROCEDURE sp_creer_publication(
  IN p_auteur_id BIGINT UNSIGNED,
  IN p_universite_id BIGINT UNSIGNED,
  IN p_titre VARCHAR(220),
  IN p_contenu TEXT,
  IN p_type_publication VARCHAR(20),
  IN p_etiquettes JSON,
  IN p_publier_immediatement TINYINT
)
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  IF NOT EXISTS (SELECT 1 FROM utilisateurs WHERE id = p_auteur_id AND statut_compte <> 'SUPPRIME') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Auteur introuvable ou compte supprimé.';
  END IF;
  INSERT INTO publications (
    code_publication, auteur_id, universite_id, titre, contenu,
    type_publication, statut_publication, etiquettes
  ) VALUES (
    '', p_auteur_id, p_universite_id, p_titre, p_contenu,
    p_type_publication, IF(p_publier_immediatement = 1, 'PUBLIEE', 'BROUILLON'), p_etiquettes
  );
  SET v_id = @campushub_dernier_id;
  SELECT id, code_publication, titre, statut_publication, date_publication
  FROM publications WHERE id = v_id;
END$$

DROP PROCEDURE IF EXISTS sp_basculer_mention_jaime$$
CREATE PROCEDURE sp_basculer_mention_jaime(
  IN p_utilisateur_id BIGINT UNSIGNED,
  IN p_publication_id BIGINT UNSIGNED
)
BEGIN
  IF EXISTS (
    SELECT 1 FROM mentions_jaime
    WHERE utilisateur_id = p_utilisateur_id AND publication_id = p_publication_id
  ) THEN
    DELETE FROM mentions_jaime
    WHERE utilisateur_id = p_utilisateur_id AND publication_id = p_publication_id;
    SELECT 'MENTION_RETIRÉE' AS action_effectuee;
  ELSE
    INSERT INTO mentions_jaime (utilisateur_id, publication_id)
    VALUES (p_utilisateur_id, p_publication_id);
    SELECT 'MENTION_AJOUTÉE' AS action_effectuee;
  END IF;
END$$

DROP PROCEDURE IF EXISTS sp_suivre_universite$$
CREATE PROCEDURE sp_suivre_universite(
  IN p_utilisateur_id BIGINT UNSIGNED,
  IN p_universite_id BIGINT UNSIGNED
)
BEGIN
  INSERT IGNORE INTO abonnements_universites (utilisateur_id, universite_id)
  VALUES (p_utilisateur_id, p_universite_id);
  SELECT IF(ROW_COUNT() = 1, 'ABONNEMENT_AJOUTÉ', 'DÉJÀ_ABONNÉ') AS resultat;
END$$

DROP PROCEDURE IF EXISTS sp_signaler_publication$$
CREATE PROCEDURE sp_signaler_publication(
  IN p_auteur_signalement_id BIGINT UNSIGNED,
  IN p_publication_id BIGINT UNSIGNED,
  IN p_motif VARCHAR(180),
  IN p_details TEXT
)
BEGIN
  DECLARE v_id BIGINT UNSIGNED;
  IF NOT EXISTS (SELECT 1 FROM publications WHERE id = p_publication_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Publication introuvable.';
  END IF;
  INSERT INTO signalements (
    code_signalement, auteur_signalement_id, publication_id, motif, details
  ) VALUES ('', p_auteur_signalement_id, p_publication_id, p_motif, p_details);
  SET v_id = @campushub_dernier_id;
  SELECT id, code_signalement, statut_signalement, date_creation
  FROM signalements WHERE id = v_id;
END$$

DROP PROCEDURE IF EXISTS sp_traiter_signalement$$
CREATE PROCEDURE sp_traiter_signalement(
  IN p_signalement_id BIGINT UNSIGNED,
  IN p_moderateur_id BIGINT UNSIGNED,
  IN p_nouveau_statut VARCHAR(20),
  IN p_resolution TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM utilisateurs
    WHERE id = p_moderateur_id AND role = 'ADMINISTRATEUR' AND statut_compte = 'ACTIF'
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seul un administrateur actif peut traiter un signalement.';
  END IF;
  IF p_nouveau_statut NOT IN ('EN_EXAMEN', 'RESOLU', 'REJETE') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Statut de signalement invalide.';
  END IF;
  UPDATE signalements
  SET moderateur_id = p_moderateur_id,
      statut_signalement = p_nouveau_statut,
      resolution = p_resolution,
      date_examen = IF(p_nouveau_statut IN ('RESOLU', 'REJETE'), CURRENT_TIMESTAMP, date_examen)
  WHERE id = p_signalement_id;
  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Signalement introuvable.';
  END IF;
  SELECT id, code_signalement, statut_signalement, resolution, date_examen
  FROM signalements WHERE id = p_signalement_id;
END$$

DROP PROCEDURE IF EXISTS sp_rechercher_universites$$
CREATE PROCEDURE sp_rechercher_universites(
  IN p_ville VARCHAR(100),
  IN p_province VARCHAR(100),
  IN p_type_universite VARCHAR(20),
  IN p_nom_filiere VARCHAR(180),
  IN p_frais_maximum DECIMAL(12, 2),
  IN p_service VARCHAR(140)
)
BEGIN
  SELECT
    u.id,
    u.code_universite,
    u.nom,
    u.sigle,
    u.type_universite,
    u.statut_verification,
    u.ville,
    u.province,
    u.inscriptions_ouvertes,
    (SELECT COUNT(*) FROM filieres f WHERE f.universite_id = u.id AND f.est_active = 1) AS nombre_filieres,
    (SELECT COUNT(*) FROM profils_etudiants pe WHERE pe.universite_id = u.id AND pe.statut_institution = 'ACTIF') AS nombre_etudiants
  FROM universites u
  WHERE (p_ville IS NULL OR p_ville = '' OR u.ville = p_ville)
    AND (p_province IS NULL OR p_province = '' OR u.province = p_province)
    AND (p_type_universite IS NULL OR p_type_universite = '' OR u.type_universite = p_type_universite)
    AND (
      p_nom_filiere IS NULL OR p_nom_filiere = '' OR EXISTS (
        SELECT 1 FROM filieres f
        WHERE f.universite_id = u.id AND f.est_active = 1
          AND f.nom LIKE CONCAT('%', p_nom_filiere, '%')
      )
    )
    AND (
      p_frais_maximum IS NULL OR EXISTS (
        SELECT 1 FROM filieres f
        WHERE f.universite_id = u.id AND f.est_active = 1
          AND COALESCE(f.frais_minimum, 0) <= p_frais_maximum
      )
    )
    AND (
      p_service IS NULL OR p_service = '' OR EXISTS (
        SELECT 1 FROM services_universitaires su
        WHERE su.universite_id = u.id AND su.est_disponible = 1
          AND su.nom LIKE CONCAT('%', p_service, '%')
      )
    )
  ORDER BY (u.statut_verification = 'VERIFIEE') DESC, u.nom;
END$$

DROP PROCEDURE IF EXISTS sp_comparer_universites$$
CREATE PROCEDURE sp_comparer_universites(IN p_codes_universites VARCHAR(500))
BEGIN
  SELECT
    u.code_universite,
    u.nom,
    u.type_universite,
    u.ville,
    u.province,
    u.inscriptions_ouvertes,
    (SELECT COUNT(*) FROM filieres f WHERE f.universite_id = u.id AND f.est_active = 1) AS nombre_filieres,
    (SELECT MIN(f.frais_minimum) FROM filieres f WHERE f.universite_id = u.id AND f.est_active = 1) AS frais_minimum,
    (SELECT MAX(f.frais_maximum) FROM filieres f WHERE f.universite_id = u.id AND f.est_active = 1) AS frais_maximum,
    (SELECT COUNT(*) FROM services_universitaires s WHERE s.universite_id = u.id AND s.est_disponible = 1) AS nombre_services,
    (SELECT COUNT(*) FROM infrastructures i WHERE i.universite_id = u.id) AS nombre_infrastructures,
    (SELECT COUNT(*) FROM profils_etudiants pe WHERE pe.universite_id = u.id AND pe.statut_institution = 'ACTIF') AS nombre_etudiants
  FROM universites u
  WHERE FIND_IN_SET(u.code_universite, REPLACE(p_codes_universites, ' ', '')) > 0
  ORDER BY u.nom;
END$$

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

DROP PROCEDURE IF EXISTS sp_marquer_notifications_lues$$
CREATE PROCEDURE sp_marquer_notifications_lues(IN p_utilisateur_id BIGINT UNSIGNED)
BEGIN
  UPDATE notifications
  SET date_lecture = CURRENT_TIMESTAMP
  WHERE destinataire_id = p_utilisateur_id AND date_lecture IS NULL;
  SELECT ROW_COUNT() AS nombre_notifications_marquees_lues;
END$$

DELIMITER ;

SELECT 'Procédures métier CampusHub créées avec succès' AS message;
