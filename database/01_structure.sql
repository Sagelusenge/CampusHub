-- ============================================================
-- CampusHub - 01. Structure de la base de données
-- MySQL 8.0+
-- Les noms des tables et colonnes sont en français.
-- ============================================================

CREATE DATABASE IF NOT EXISTS campushub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE campushub;

-- Les triggers utilisent cette table pour produire des identifiants
-- numériques sûrs même lorsque plusieurs utilisateurs insèrent en même temps.
CREATE TABLE compteurs_sequences (
  nom_sequence VARCHAR(80) PRIMARY KEY,
  derniere_valeur BIGINT UNSIGNED NOT NULL DEFAULT 0,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO compteurs_sequences (nom_sequence, derniere_valeur) VALUES
  ('utilisateurs', 0), ('jetons_actualisation', 0), ('universites', 0),
  ('membres_universite', 0), ('campus', 0), ('facultes', 0),
  ('filieres', 0), ('profils_etudiants', 0), ('services_universitaires', 0),
  ('infrastructures', 0), ('conditions_admission', 0), ('publications', 0),
  ('medias_publication', 0), ('commentaires', 0), ('signalements', 0),
  ('notifications', 0), ('journal_audit', 0)
ON DUPLICATE KEY UPDATE nom_sequence = VALUES(nom_sequence);

-- ------------------------------------------------------------
-- 1. Comptes et profils
-- ------------------------------------------------------------

CREATE TABLE utilisateurs (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_utilisateur VARCHAR(30) NOT NULL,
  email VARCHAR(190) NOT NULL,
  mot_de_passe_hash VARCHAR(255) NOT NULL,
  role ENUM('VISITEUR', 'ETUDIANT', 'UNIVERSITE', 'ENTREPRISE', 'ADMINISTRATEUR') NOT NULL DEFAULT 'VISITEUR',
  statut_compte ENUM('EN_ATTENTE', 'ACTIF', 'SUSPENDU', 'SUPPRIME') NOT NULL DEFAULT 'EN_ATTENTE',
  statut_verification ENUM('NON_VERIFIE', 'EN_ATTENTE', 'VERIFIE', 'REJETE') NOT NULL DEFAULT 'NON_VERIFIE',
  nom_affichage VARCHAR(120) NOT NULL,
  url_photo_profil VARCHAR(500) NULL,
  biographie TEXT NULL,
  ville VARCHAR(100) NULL,
  province VARCHAR(100) NULL,
  date_verification_email DATETIME NULL,
  date_derniere_connexion DATETIME NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_utilisateurs_code UNIQUE (code_utilisateur),
  CONSTRAINT uq_utilisateurs_email UNIQUE (email),
  INDEX idx_utilisateurs_role_statut (role, statut_compte),
  INDEX idx_utilisateurs_localisation (province, ville)
) ENGINE=InnoDB;

CREATE TABLE jetons_actualisation (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_jeton VARCHAR(30) NOT NULL,
  utilisateur_id BIGINT UNSIGNED NOT NULL,
  jeton_hash VARCHAR(255) NOT NULL,
  date_expiration DATETIME NOT NULL,
  date_revocation DATETIME NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_jetons_code UNIQUE (code_jeton),
  CONSTRAINT uq_jetons_hash UNIQUE (jeton_hash),
  CONSTRAINT fk_jetons_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  INDEX idx_jetons_utilisateur_expiration (utilisateur_id, date_expiration)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. Universités et catalogue académique
-- ------------------------------------------------------------

CREATE TABLE universites (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_universite VARCHAR(30) NOT NULL,
  nom VARCHAR(180) NOT NULL,
  sigle VARCHAR(20) NULL,
  slug VARCHAR(190) NOT NULL,
  type_universite ENUM('PUBLIQUE', 'PRIVEE') NOT NULL,
  statut_verification ENUM('NON_VERIFIEE', 'EN_ATTENTE', 'VERIFIEE', 'REJETEE') NOT NULL DEFAULT 'EN_ATTENTE',
  description TEXT NULL,
  url_logo VARCHAR(500) NULL,
  url_couverture VARCHAR(500) NULL,
  site_web VARCHAR(500) NULL,
  email VARCHAR(190) NULL,
  telephone VARCHAR(40) NULL,
  annee_fondation SMALLINT UNSIGNED NULL,
  adresse VARCHAR(255) NULL,
  ville VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  pays VARCHAR(100) NOT NULL DEFAULT 'République démocratique du Congo',
  latitude DECIMAL(9, 6) NULL,
  longitude DECIMAL(9, 6) NULL,
  inscriptions_ouvertes TINYINT(1) NOT NULL DEFAULT 0,
  date_debut_inscription DATE NULL,
  date_fin_inscription DATE NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_universites_code UNIQUE (code_universite),
  CONSTRAINT uq_universites_slug UNIQUE (slug),
  CONSTRAINT chk_universites_dates CHECK (
    date_debut_inscription IS NULL OR date_fin_inscription IS NULL OR date_debut_inscription <= date_fin_inscription
  ),
  INDEX idx_universites_localisation_type (province, ville, type_universite),
  INDEX idx_universites_verification (statut_verification)
) ENGINE=InnoDB;

CREATE TABLE membres_universite (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_membre VARCHAR(30) NOT NULL,
  universite_id BIGINT UNSIGNED NOT NULL,
  utilisateur_id BIGINT UNSIGNED NOT NULL,
  fonction VARCHAR(120) NULL,
  est_proprietaire TINYINT(1) NOT NULL DEFAULT 0,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_membres_code UNIQUE (code_membre),
  CONSTRAINT uq_membres_universite_utilisateur UNIQUE (universite_id, utilisateur_id),
  CONSTRAINT fk_membres_universite FOREIGN KEY (universite_id) REFERENCES universites(id) ON DELETE CASCADE,
  CONSTRAINT fk_membres_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE campus (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_campus VARCHAR(30) NOT NULL,
  universite_id BIGINT UNSIGNED NOT NULL,
  nom VARCHAR(150) NOT NULL,
  adresse VARCHAR(255) NULL,
  ville VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  latitude DECIMAL(9, 6) NULL,
  longitude DECIMAL(9, 6) NULL,
  est_principal TINYINT(1) NOT NULL DEFAULT 0,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_campus_code UNIQUE (code_campus),
  CONSTRAINT fk_campus_universite FOREIGN KEY (universite_id) REFERENCES universites(id) ON DELETE CASCADE,
  INDEX idx_campus_universite (universite_id)
) ENGINE=InnoDB;

CREATE TABLE facultes (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_faculte VARCHAR(30) NOT NULL,
  universite_id BIGINT UNSIGNED NOT NULL,
  nom VARCHAR(160) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  description TEXT NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_facultes_code UNIQUE (code_faculte),
  CONSTRAINT uq_facultes_universite_slug UNIQUE (universite_id, slug),
  CONSTRAINT fk_facultes_universite FOREIGN KEY (universite_id) REFERENCES universites(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE filieres (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_filiere VARCHAR(30) NOT NULL,
  universite_id BIGINT UNSIGNED NOT NULL,
  faculte_id BIGINT UNSIGNED NOT NULL,
  nom VARCHAR(180) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  domaine VARCHAR(140) NOT NULL,
  niveau_diplome ENUM('CERTIFICAT', 'LICENCE', 'MASTER', 'DOCTORAT', 'AUTRE') NOT NULL,
  duree_annees TINYINT UNSIGNED NULL,
  description TEXT NULL,
  frais_minimum DECIMAL(12, 2) NULL,
  frais_maximum DECIMAL(12, 2) NULL,
  devise CHAR(3) NOT NULL DEFAULT 'USD',
  est_active TINYINT(1) NOT NULL DEFAULT 1,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_filieres_code UNIQUE (code_filiere),
  CONSTRAINT uq_filieres_universite_slug_niveau UNIQUE (universite_id, slug, niveau_diplome),
  CONSTRAINT fk_filieres_universite FOREIGN KEY (universite_id) REFERENCES universites(id) ON DELETE CASCADE,
  CONSTRAINT fk_filieres_faculte FOREIGN KEY (faculte_id) REFERENCES facultes(id) ON DELETE CASCADE,
  CONSTRAINT chk_filieres_frais CHECK (
    frais_minimum IS NULL OR frais_maximum IS NULL OR frais_minimum <= frais_maximum
  ),
  INDEX idx_filieres_domaine_niveau (domaine, niveau_diplome),
  INDEX idx_filieres_frais (frais_minimum, frais_maximum)
) ENGINE=InnoDB;

CREATE TABLE campus_filieres (
  campus_id BIGINT UNSIGNED NOT NULL,
  filiere_id BIGINT UNSIGNED NOT NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (campus_id, filiere_id),
  CONSTRAINT fk_campus_filieres_campus FOREIGN KEY (campus_id) REFERENCES campus(id) ON DELETE CASCADE,
  CONSTRAINT fk_campus_filieres_filiere FOREIGN KEY (filiere_id) REFERENCES filieres(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE profils_etudiants (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_profil VARCHAR(30) NOT NULL,
  utilisateur_id BIGINT UNSIGNED NOT NULL,
  universite_id BIGINT UNSIGNED NULL,
  filiere_id BIGINT UNSIGNED NULL,
  matricule_etudiant VARCHAR(80) NULL,
  titre_profil VARCHAR(180) NULL,
  competences JSON NULL,
  annee_diplomation SMALLINT UNSIGNED NULL,
  est_visible TINYINT(1) NOT NULL DEFAULT 1,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_profils_code UNIQUE (code_profil),
  CONSTRAINT uq_profils_utilisateur UNIQUE (utilisateur_id),
  CONSTRAINT fk_profils_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_profils_universite FOREIGN KEY (universite_id) REFERENCES universites(id) ON DELETE SET NULL,
  CONSTRAINT fk_profils_filiere FOREIGN KEY (filiere_id) REFERENCES filieres(id) ON DELETE SET NULL,
  INDEX idx_profils_etudes (universite_id, filiere_id)
) ENGINE=InnoDB;

CREATE TABLE services_universitaires (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_service VARCHAR(30) NOT NULL,
  universite_id BIGINT UNSIGNED NOT NULL,
  nom VARCHAR(140) NOT NULL,
  description TEXT NULL,
  est_disponible TINYINT(1) NOT NULL DEFAULT 1,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_services_code UNIQUE (code_service),
  CONSTRAINT uq_services_universite_nom UNIQUE (universite_id, nom),
  CONSTRAINT fk_services_universite FOREIGN KEY (universite_id) REFERENCES universites(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE infrastructures (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_infrastructure VARCHAR(30) NOT NULL,
  universite_id BIGINT UNSIGNED NOT NULL,
  nom VARCHAR(140) NOT NULL,
  categorie VARCHAR(100) NOT NULL,
  description TEXT NULL,
  quantite SMALLINT UNSIGNED NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_infrastructures_code UNIQUE (code_infrastructure),
  CONSTRAINT fk_infrastructures_universite FOREIGN KEY (universite_id) REFERENCES universites(id) ON DELETE CASCADE,
  INDEX idx_infrastructures_categorie (universite_id, categorie)
) ENGINE=InnoDB;

CREATE TABLE conditions_admission (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_condition VARCHAR(30) NOT NULL,
  universite_id BIGINT UNSIGNED NOT NULL,
  titre VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  niveau_diplome ENUM('CERTIFICAT', 'LICENCE', 'MASTER', 'DOCTORAT', 'AUTRE') NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_conditions_code UNIQUE (code_condition),
  CONSTRAINT fk_conditions_universite FOREIGN KEY (universite_id) REFERENCES universites(id) ON DELETE CASCADE,
  INDEX idx_conditions_niveau (universite_id, niveau_diplome)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3. Publications, médias et interactions
-- ------------------------------------------------------------

CREATE TABLE publications (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_publication VARCHAR(30) NOT NULL,
  auteur_id BIGINT UNSIGNED NOT NULL,
  universite_id BIGINT UNSIGNED NULL,
  titre VARCHAR(220) NULL,
  contenu TEXT NOT NULL,
  type_publication ENUM('PROJET', 'ARTICLE', 'RECHERCHE', 'ANNONCE', 'STAGE', 'AUTRE') NOT NULL DEFAULT 'PROJET',
  statut_publication ENUM('BROUILLON', 'PUBLIEE', 'ARCHIVEE', 'RETIREE') NOT NULL DEFAULT 'BROUILLON',
  etiquettes JSON NULL,
  date_publication DATETIME NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_publications_code UNIQUE (code_publication),
  CONSTRAINT fk_publications_auteur FOREIGN KEY (auteur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_publications_universite FOREIGN KEY (universite_id) REFERENCES universites(id) ON DELETE SET NULL,
  INDEX idx_publications_statut_date (statut_publication, date_publication DESC),
  INDEX idx_publications_auteur_date (auteur_id, date_creation DESC),
  INDEX idx_publications_universite (universite_id)
) ENGINE=InnoDB;

CREATE TABLE medias_publication (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_media VARCHAR(30) NOT NULL,
  publication_id BIGINT UNSIGNED NOT NULL,
  type_media ENUM('IMAGE', 'VIDEO', 'DOCUMENT') NOT NULL,
  url_media VARCHAR(500) NOT NULL,
  url_miniature VARCHAR(500) NULL,
  identifiant_stockage VARCHAR(255) NULL,
  type_mime VARCHAR(100) NULL,
  taille_octets BIGINT UNSIGNED NULL,
  largeur_pixels INT UNSIGNED NULL,
  hauteur_pixels INT UNSIGNED NULL,
  duree_secondes SMALLINT UNSIGNED NULL,
  ordre_affichage SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_medias_code UNIQUE (code_media),
  CONSTRAINT fk_medias_publication FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE,
  INDEX idx_medias_publication_ordre (publication_id, ordre_affichage)
) ENGINE=InnoDB;

CREATE TABLE commentaires (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_commentaire VARCHAR(30) NOT NULL,
  publication_id BIGINT UNSIGNED NOT NULL,
  auteur_id BIGINT UNSIGNED NOT NULL,
  commentaire_parent_id BIGINT UNSIGNED NULL,
  contenu TEXT NOT NULL,
  est_modifie TINYINT(1) NOT NULL DEFAULT 0,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_commentaires_code UNIQUE (code_commentaire),
  CONSTRAINT fk_commentaires_publication FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE,
  CONSTRAINT fk_commentaires_auteur FOREIGN KEY (auteur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_commentaires_parent FOREIGN KEY (commentaire_parent_id) REFERENCES commentaires(id) ON DELETE CASCADE,
  INDEX idx_commentaires_publication_date (publication_id, date_creation)
) ENGINE=InnoDB;

CREATE TABLE mentions_jaime (
  utilisateur_id BIGINT UNSIGNED NOT NULL,
  publication_id BIGINT UNSIGNED NOT NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (utilisateur_id, publication_id),
  CONSTRAINT fk_mentions_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_mentions_publication FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE,
  INDEX idx_mentions_publication (publication_id)
) ENGINE=InnoDB;

CREATE TABLE favoris_publications (
  utilisateur_id BIGINT UNSIGNED NOT NULL,
  publication_id BIGINT UNSIGNED NOT NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (utilisateur_id, publication_id),
  CONSTRAINT fk_favoris_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_favoris_publication FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE,
  INDEX idx_favoris_publication (publication_id)
) ENGINE=InnoDB;

CREATE TABLE abonnements_utilisateurs (
  abonne_id BIGINT UNSIGNED NOT NULL,
  utilisateur_suivi_id BIGINT UNSIGNED NOT NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (abonne_id, utilisateur_suivi_id),
  CONSTRAINT fk_abonnements_abonne FOREIGN KEY (abonne_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_abonnements_suivi FOREIGN KEY (utilisateur_suivi_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT chk_abonnements_differents CHECK (abonne_id <> utilisateur_suivi_id),
  INDEX idx_abonnements_utilisateur_suivi (utilisateur_suivi_id)
) ENGINE=InnoDB;

CREATE TABLE abonnements_universites (
  utilisateur_id BIGINT UNSIGNED NOT NULL,
  universite_id BIGINT UNSIGNED NOT NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (utilisateur_id, universite_id),
  CONSTRAINT fk_abonnements_univ_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_abonnements_univ_universite FOREIGN KEY (universite_id) REFERENCES universites(id) ON DELETE CASCADE,
  INDEX idx_abonnements_universite (universite_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4. Modération, notifications et audit
-- ------------------------------------------------------------

CREATE TABLE signalements (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_signalement VARCHAR(30) NOT NULL,
  auteur_signalement_id BIGINT UNSIGNED NOT NULL,
  moderateur_id BIGINT UNSIGNED NULL,
  publication_id BIGINT UNSIGNED NULL,
  motif VARCHAR(180) NOT NULL,
  details TEXT NULL,
  statut_signalement ENUM('OUVERT', 'EN_EXAMEN', 'RESOLU', 'REJETE') NOT NULL DEFAULT 'OUVERT',
  resolution TEXT NULL,
  date_examen DATETIME NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_signalements_code UNIQUE (code_signalement),
  CONSTRAINT fk_signalements_auteur FOREIGN KEY (auteur_signalement_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_signalements_moderateur FOREIGN KEY (moderateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  CONSTRAINT fk_signalements_publication FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE,
  INDEX idx_signalements_statut_date (statut_signalement, date_creation)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_notification VARCHAR(30) NOT NULL,
  destinataire_id BIGINT UNSIGNED NOT NULL,
  acteur_id BIGINT UNSIGNED NULL,
  type_notification ENUM('ABONNEMENT', 'JAIME', 'COMMENTAIRE', 'ANNONCE', 'MODERATION', 'SYSTEME') NOT NULL,
  titre VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  url_action VARCHAR(500) NULL,
  date_lecture DATETIME NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_notifications_code UNIQUE (code_notification),
  CONSTRAINT fk_notifications_destinataire FOREIGN KEY (destinataire_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_acteur FOREIGN KEY (acteur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  INDEX idx_notifications_destinataire (destinataire_id, date_lecture, date_creation DESC)
) ENGINE=InnoDB;

CREATE TABLE journal_audit (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  code_audit VARCHAR(30) NOT NULL,
  utilisateur_id BIGINT UNSIGNED NULL,
  action VARCHAR(120) NOT NULL,
  type_entite VARCHAR(80) NOT NULL,
  identifiant_entite BIGINT UNSIGNED NULL,
  anciennes_valeurs JSON NULL,
  nouvelles_valeurs JSON NULL,
  adresse_ip VARCHAR(45) NULL,
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_audit_code UNIQUE (code_audit),
  CONSTRAINT fk_audit_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  INDEX idx_audit_entite (type_entite, identifiant_entite),
  INDEX idx_audit_utilisateur_date (utilisateur_id, date_creation DESC)
) ENGINE=InnoDB;

SELECT 'Structure française CampusHub créée avec succès' AS message;
