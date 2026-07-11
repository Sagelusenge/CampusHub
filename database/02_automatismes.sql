-- ============================================================
-- CampusHub - 02. Fonctions et triggers
-- À exécuter après 01_structure.sql
-- ============================================================

USE campushub;

DELIMITER $$

DROP FUNCTION IF EXISTS fn_normaliser_code$$
CREATE FUNCTION fn_normaliser_code(p_texte VARCHAR(255))
RETURNS VARCHAR(20)
DETERMINISTIC
NO SQL
BEGIN
  DECLARE v_resultat VARCHAR(255);
  SET v_resultat = UPPER(COALESCE(p_texte, ''));
  SET v_resultat = REPLACE(v_resultat, 'À', 'A');
  SET v_resultat = REPLACE(v_resultat, 'Â', 'A');
  SET v_resultat = REPLACE(v_resultat, 'Ä', 'A');
  SET v_resultat = REPLACE(v_resultat, 'Ç', 'C');
  SET v_resultat = REPLACE(v_resultat, 'É', 'E');
  SET v_resultat = REPLACE(v_resultat, 'È', 'E');
  SET v_resultat = REPLACE(v_resultat, 'Ê', 'E');
  SET v_resultat = REPLACE(v_resultat, 'Ë', 'E');
  SET v_resultat = REPLACE(v_resultat, 'Î', 'I');
  SET v_resultat = REPLACE(v_resultat, 'Ï', 'I');
  SET v_resultat = REPLACE(v_resultat, 'Ô', 'O');
  SET v_resultat = REPLACE(v_resultat, 'Ö', 'O');
  SET v_resultat = REPLACE(v_resultat, 'Ù', 'U');
  SET v_resultat = REPLACE(v_resultat, 'Û', 'U');
  SET v_resultat = REPLACE(v_resultat, 'Ü', 'U');
  RETURN LEFT(REGEXP_REPLACE(v_resultat, '[^A-Z0-9]', ''), 20);
END$$

DROP FUNCTION IF EXISTS fn_initiales$$
CREATE FUNCTION fn_initiales(p_texte VARCHAR(255))
RETURNS VARCHAR(6)
DETERMINISTIC
NO SQL
BEGIN
  DECLARE v_texte VARCHAR(255);
  DECLARE v_mot VARCHAR(80);
  DECLARE v_initiales VARCHAR(20) DEFAULT '';
  DECLARE v_position INT DEFAULT 0;

  SET v_texte = TRIM(REGEXP_REPLACE(REPLACE(REPLACE(COALESCE(p_texte, ''), '''', ' '), '-', ' '), '[[:space:]]+', ' '));

  WHILE CHAR_LENGTH(v_texte) > 0 AND CHAR_LENGTH(v_initiales) < 6 DO
    SET v_position = LOCATE(' ', v_texte);
    IF v_position = 0 THEN
      SET v_mot = v_texte;
      SET v_texte = '';
    ELSE
      SET v_mot = LEFT(v_texte, v_position - 1);
      SET v_texte = TRIM(SUBSTRING(v_texte, v_position + 1));
    END IF;

    IF LOWER(v_mot) NOT IN ('de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'et', 'en', 'a', 'au', 'aux') THEN
      SET v_initiales = CONCAT(v_initiales, LEFT(v_mot, 1));
    END IF;
  END WHILE;

  SET v_initiales = fn_normaliser_code(v_initiales);
  RETURN IF(v_initiales = '', 'CH', v_initiales);
END$$

-- ------------------------------------------------------------
-- Numérotation des comptes
-- ------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_utilisateurs_avant_insertion$$
CREATE TRIGGER trg_utilisateurs_avant_insertion
BEFORE INSERT ON utilisateurs
FOR EACH ROW
BEGIN
  DECLARE v_prefixe VARCHAR(6);
  UPDATE compteurs_sequences
    SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
    WHERE nom_sequence = 'utilisateurs';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.email = LOWER(TRIM(NEW.email));
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET v_prefixe = CASE NEW.role
    WHEN 'ETUDIANT' THEN 'ETU'
    WHEN 'UNIVERSITE' THEN 'UNI'
    WHEN 'ENTREPRISE' THEN 'ENT'
    WHEN 'ADMINISTRATEUR' THEN 'ADM'
    ELSE 'VIS'
  END;
  SET NEW.code_utilisateur = CONCAT(v_prefixe, LPAD(NEW.id, 4, '0'), YEAR(NEW.date_creation));
END$$

DROP TRIGGER IF EXISTS trg_jetons_avant_insertion$$
CREATE TRIGGER trg_jetons_avant_insertion
BEFORE INSERT ON jetons_actualisation
FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences
    SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
    WHERE nom_sequence = 'jetons_actualisation';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET NEW.code_jeton = CONCAT('JET', LPAD(NEW.id, 4, '0'), YEAR(NEW.date_creation));
END$$

-- ------------------------------------------------------------
-- Numérotation et cohérence du catalogue universitaire
-- ------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_universites_avant_insertion$$
CREATE TRIGGER trg_universites_avant_insertion
BEFORE INSERT ON universites
FOR EACH ROW
BEGIN
  DECLARE v_prefixe VARCHAR(6);
  UPDATE compteurs_sequences
    SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
    WHERE nom_sequence = 'universites';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET NEW.slug = LOWER(TRIM(NEW.slug));
  SET v_prefixe = IF(
    CHAR_LENGTH(fn_normaliser_code(NEW.sigle)) > 0,
    LEFT(fn_normaliser_code(NEW.sigle), 6),
    fn_initiales(NEW.nom)
  );
  SET NEW.sigle = COALESCE(NULLIF(TRIM(NEW.sigle), ''), v_prefixe);
  SET NEW.code_universite = CONCAT(v_prefixe, LPAD(NEW.id, 4, '0'), YEAR(NEW.date_creation));
END$$

DROP TRIGGER IF EXISTS trg_membres_avant_insertion$$
CREATE TRIGGER trg_membres_avant_insertion
BEFORE INSERT ON membres_universite
FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences
    SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
    WHERE nom_sequence = 'membres_universite';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET NEW.code_membre = CONCAT('MUN', LPAD(NEW.id, 4, '0'), YEAR(NEW.date_creation));
END$$

DROP TRIGGER IF EXISTS trg_campus_avant_insertion$$
CREATE TRIGGER trg_campus_avant_insertion
BEFORE INSERT ON campus
FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences
    SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
    WHERE nom_sequence = 'campus';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET NEW.code_campus = CONCAT('CAM', LPAD(NEW.id, 4, '0'), YEAR(NEW.date_creation));
END$$

DROP TRIGGER IF EXISTS trg_facultes_avant_insertion$$
CREATE TRIGGER trg_facultes_avant_insertion
BEFORE INSERT ON facultes
FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences
    SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
    WHERE nom_sequence = 'facultes';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET NEW.slug = LOWER(TRIM(NEW.slug));
  SET NEW.code_faculte = CONCAT(fn_initiales(NEW.nom), LPAD(NEW.id, 4, '0'), YEAR(NEW.date_creation));
END$$

DROP TRIGGER IF EXISTS trg_filieres_avant_insertion$$
CREATE TRIGGER trg_filieres_avant_insertion
BEFORE INSERT ON filieres
FOR EACH ROW
BEGIN
  DECLARE v_universite_faculte BIGINT UNSIGNED;
  SET v_universite_faculte = (SELECT universite_id FROM facultes WHERE id = NEW.faculte_id LIMIT 1);
  IF v_universite_faculte IS NULL OR v_universite_faculte <> NEW.universite_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La faculté sélectionnée n’appartient pas à cette université.';
  END IF;
  IF NEW.frais_minimum IS NOT NULL AND NEW.frais_maximum IS NOT NULL AND NEW.frais_minimum > NEW.frais_maximum THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Les frais minimum ne peuvent pas dépasser les frais maximum.';
  END IF;
  UPDATE compteurs_sequences
    SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
    WHERE nom_sequence = 'filieres';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET NEW.slug = LOWER(TRIM(NEW.slug));
  SET NEW.code_filiere = CONCAT(fn_initiales(NEW.nom), LPAD(NEW.id, 4, '0'), YEAR(NEW.date_creation));
END$$

DROP TRIGGER IF EXISTS trg_profils_avant_insertion$$
CREATE TRIGGER trg_profils_avant_insertion
BEFORE INSERT ON profils_etudiants
FOR EACH ROW
BEGIN
  DECLARE v_role VARCHAR(30);
  DECLARE v_universite_filiere BIGINT UNSIGNED;
  SET v_role = (SELECT role FROM utilisateurs WHERE id = NEW.utilisateur_id LIMIT 1);
  IF v_role IS NULL OR v_role <> 'ETUDIANT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un profil étudiant doit appartenir à un utilisateur ayant le rôle ETUDIANT.';
  END IF;
  IF NEW.filiere_id IS NOT NULL THEN
    SET v_universite_filiere = (SELECT universite_id FROM filieres WHERE id = NEW.filiere_id LIMIT 1);
    IF v_universite_filiere IS NULL OR NEW.universite_id IS NULL OR v_universite_filiere <> NEW.universite_id THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La filière du profil n’appartient pas à l’université sélectionnée.';
    END IF;
  END IF;
  UPDATE compteurs_sequences
    SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
    WHERE nom_sequence = 'profils_etudiants';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET NEW.code_profil = CONCAT('PET', LPAD(NEW.id, 4, '0'), YEAR(NEW.date_creation));
END$$

DROP TRIGGER IF EXISTS trg_services_avant_insertion$$
CREATE TRIGGER trg_services_avant_insertion
BEFORE INSERT ON services_universitaires
FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
    WHERE nom_sequence = 'services_universitaires';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET NEW.code_service = CONCAT('SER', LPAD(NEW.id, 4, '0'), YEAR(NEW.date_creation));
END$$

DROP TRIGGER IF EXISTS trg_infrastructures_avant_insertion$$
CREATE TRIGGER trg_infrastructures_avant_insertion
BEFORE INSERT ON infrastructures
FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
    WHERE nom_sequence = 'infrastructures';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET NEW.code_infrastructure = CONCAT('INF', LPAD(NEW.id, 4, '0'), YEAR(NEW.date_creation));
END$$

DROP TRIGGER IF EXISTS trg_conditions_avant_insertion$$
CREATE TRIGGER trg_conditions_avant_insertion
BEFORE INSERT ON conditions_admission
FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
    WHERE nom_sequence = 'conditions_admission';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET NEW.code_condition = CONCAT('CDA', LPAD(NEW.id, 4, '0'), YEAR(NEW.date_creation));
END$$

-- ------------------------------------------------------------
-- Publications, médias et commentaires
-- ------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_publications_avant_insertion$$
CREATE TRIGGER trg_publications_avant_insertion
BEFORE INSERT ON publications
FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
    WHERE nom_sequence = 'publications';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  IF NEW.statut_publication = 'PUBLIEE' AND NEW.date_publication IS NULL THEN
    SET NEW.date_publication = CURRENT_TIMESTAMP;
  END IF;
  SET NEW.code_publication = CONCAT('PUB', LPAD(NEW.id, 4, '0'), YEAR(NEW.date_creation));
END$$

DROP TRIGGER IF EXISTS trg_publications_avant_modification$$
CREATE TRIGGER trg_publications_avant_modification
BEFORE UPDATE ON publications
FOR EACH ROW
BEGIN
  IF NEW.statut_publication = 'PUBLIEE' AND OLD.statut_publication <> 'PUBLIEE' AND NEW.date_publication IS NULL THEN
    SET NEW.date_publication = CURRENT_TIMESTAMP;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_medias_avant_insertion$$
CREATE TRIGGER trg_medias_avant_insertion
BEFORE INSERT ON medias_publication
FOR EACH ROW
BEGIN
  IF NEW.type_media = 'VIDEO' THEN
    IF NEW.taille_octets IS NOT NULL AND NEW.taille_octets > 52428800 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Une vidéo ne peut pas dépasser 50 Mo.';
    END IF;
    IF NEW.duree_secondes IS NOT NULL AND NEW.duree_secondes > 90 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Une vidéo ne peut pas dépasser 90 secondes.';
    END IF;
    IF NEW.hauteur_pixels IS NOT NULL AND NEW.hauteur_pixels > 720 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La hauteur finale d’une vidéo ne peut pas dépasser 720 pixels.';
    END IF;
  END IF;
  UPDATE compteurs_sequences SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
    WHERE nom_sequence = 'medias_publication';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET NEW.code_media = CONCAT('MED', LPAD(NEW.id, 4, '0'), YEAR(NEW.date_creation));
END$$

DROP TRIGGER IF EXISTS trg_commentaires_avant_insertion$$
CREATE TRIGGER trg_commentaires_avant_insertion
BEFORE INSERT ON commentaires
FOR EACH ROW
BEGIN
  DECLARE v_publication_parent BIGINT UNSIGNED;
  IF NEW.commentaire_parent_id IS NOT NULL THEN
    SET v_publication_parent = (
      SELECT publication_id FROM commentaires WHERE id = NEW.commentaire_parent_id LIMIT 1
    );
    IF v_publication_parent IS NULL OR v_publication_parent <> NEW.publication_id THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Le commentaire parent doit appartenir à la même publication.';
    END IF;
  END IF;
  UPDATE compteurs_sequences SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
    WHERE nom_sequence = 'commentaires';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET NEW.code_commentaire = CONCAT('COM', LPAD(NEW.id, 4, '0'), YEAR(NEW.date_creation));
END$$

-- ------------------------------------------------------------
-- Modération, notifications et audit
-- ------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_signalements_avant_insertion$$
CREATE TRIGGER trg_signalements_avant_insertion
BEFORE INSERT ON signalements
FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
    WHERE nom_sequence = 'signalements';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET NEW.code_signalement = CONCAT('SIG', LPAD(NEW.id, 4, '0'), YEAR(NEW.date_creation));
END$$

DROP TRIGGER IF EXISTS trg_notifications_avant_insertion$$
CREATE TRIGGER trg_notifications_avant_insertion
BEFORE INSERT ON notifications
FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
    WHERE nom_sequence = 'notifications';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET NEW.code_notification = CONCAT('NOT', LPAD(NEW.id, 4, '0'), YEAR(NEW.date_creation));
END$$

DROP TRIGGER IF EXISTS trg_audit_avant_insertion$$
CREATE TRIGGER trg_audit_avant_insertion
BEFORE INSERT ON journal_audit
FOR EACH ROW
BEGIN
  UPDATE compteurs_sequences SET derniere_valeur = LAST_INSERT_ID(derniere_valeur + 1)
    WHERE nom_sequence = 'journal_audit';
  SET NEW.id = LAST_INSERT_ID();
  SET @campushub_dernier_id = NEW.id;
  SET NEW.date_creation = COALESCE(NEW.date_creation, CURRENT_TIMESTAMP);
  SET NEW.code_audit = CONCAT('AUD', LPAD(NEW.id, 4, '0'), YEAR(NEW.date_creation));
END$$

-- Notifications automatiques lors des interactions sociales.
DROP TRIGGER IF EXISTS trg_jaime_apres_insertion$$
CREATE TRIGGER trg_jaime_apres_insertion
AFTER INSERT ON mentions_jaime
FOR EACH ROW
BEGIN
  DECLARE v_auteur BIGINT UNSIGNED;
  SET v_auteur = (SELECT auteur_id FROM publications WHERE id = NEW.publication_id LIMIT 1);
  IF v_auteur IS NOT NULL AND v_auteur <> NEW.utilisateur_id THEN
    INSERT INTO notifications (
      code_notification, destinataire_id, acteur_id, type_notification, titre, message, url_action
    ) VALUES (
      '', v_auteur, NEW.utilisateur_id, 'JAIME', 'Nouvelle mention J’aime',
      'Un utilisateur a aimé votre publication.', CONCAT('/publications/', NEW.publication_id)
    );
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_commentaires_apres_insertion$$
CREATE TRIGGER trg_commentaires_apres_insertion
AFTER INSERT ON commentaires
FOR EACH ROW
BEGIN
  DECLARE v_auteur BIGINT UNSIGNED;
  SET v_auteur = (SELECT auteur_id FROM publications WHERE id = NEW.publication_id LIMIT 1);
  IF v_auteur IS NOT NULL AND v_auteur <> NEW.auteur_id THEN
    INSERT INTO notifications (
      code_notification, destinataire_id, acteur_id, type_notification, titre, message, url_action
    ) VALUES (
      '', v_auteur, NEW.auteur_id, 'COMMENTAIRE', 'Nouveau commentaire',
      'Un utilisateur a commenté votre publication.', CONCAT('/publications/', NEW.publication_id)
    );
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_abonnements_utilisateurs_apres_insertion$$
CREATE TRIGGER trg_abonnements_utilisateurs_apres_insertion
AFTER INSERT ON abonnements_utilisateurs
FOR EACH ROW
BEGIN
  INSERT INTO notifications (
    code_notification, destinataire_id, acteur_id, type_notification, titre, message, url_action
  ) VALUES (
    '', NEW.utilisateur_suivi_id, NEW.abonne_id, 'ABONNEMENT', 'Nouvel abonnement',
    'Un utilisateur suit maintenant votre profil.', CONCAT('/profils/', NEW.abonne_id)
  );
END$$

-- Journalisation des décisions administratives importantes.
DROP TRIGGER IF EXISTS trg_universites_apres_modification$$
CREATE TRIGGER trg_universites_apres_modification
AFTER UPDATE ON universites
FOR EACH ROW
BEGIN
  IF NOT (OLD.statut_verification <=> NEW.statut_verification) THEN
    INSERT INTO journal_audit (
      code_audit, action, type_entite, identifiant_entite, anciennes_valeurs, nouvelles_valeurs
    ) VALUES (
      '', 'MODIFICATION_STATUT_VERIFICATION', 'UNIVERSITE', NEW.id,
      JSON_OBJECT('statut_verification', OLD.statut_verification),
      JSON_OBJECT('statut_verification', NEW.statut_verification)
    );
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_signalements_apres_modification$$
CREATE TRIGGER trg_signalements_apres_modification
AFTER UPDATE ON signalements
FOR EACH ROW
BEGIN
  IF NOT (OLD.statut_signalement <=> NEW.statut_signalement) THEN
    INSERT INTO journal_audit (
      code_audit, utilisateur_id, action, type_entite, identifiant_entite, anciennes_valeurs, nouvelles_valeurs
    ) VALUES (
      '', NEW.moderateur_id, 'MODIFICATION_STATUT_SIGNALEMENT', 'SIGNALEMENT', NEW.id,
      JSON_OBJECT('statut_signalement', OLD.statut_signalement),
      JSON_OBJECT('statut_signalement', NEW.statut_signalement, 'resolution', NEW.resolution)
    );
  END IF;
END$$

DELIMITER ;

SELECT 'Fonctions et triggers CampusHub créés avec succès' AS message;
