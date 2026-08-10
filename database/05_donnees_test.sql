-- ============================================================
-- CampusHub - 05. Données de démonstration
-- À exécuter une seule fois après 04_vues.sql
-- Toutes les institutions et informations de ce fichier sont fictives.
-- ============================================================

USE campushub;

START TRANSACTION;

-- Les hash ci-dessous servent uniquement à remplir la base de démonstration.
-- Ils devront être remplacés par de vrais hash bcrypt/Argon2 lors du backend.
INSERT INTO utilisateurs (
  code_utilisateur, email, mot_de_passe_hash, role, statut_compte,
  statut_verification, nom_affichage, ville, province, date_verification_email
) VALUES (
  '', 'admin@campushub.test', '$2b$12$hash.de.demonstration.a.remplacer.avant.utilisation',
  'ADMINISTRATEUR', 'ACTIF', 'VERIFIE', 'Administration CampusHub', 'Goma', 'Nord-Kivu', CURRENT_TIMESTAMP
);
SET @administrateur_id = @campushub_dernier_id;

INSERT INTO utilisateurs (
  code_utilisateur, email, mot_de_passe_hash, role, statut_compte,
  statut_verification, nom_affichage, ville, province, date_verification_email
) VALUES (
  '', 'etudiant@campushub.test', '$2b$12$hash.de.demonstration.a.remplacer.avant.utilisation',
  'ETUDIANT', 'ACTIF', 'VERIFIE', 'Étudiant Démonstration', 'Goma', 'Nord-Kivu', CURRENT_TIMESTAMP
);
SET @etudiant_id = @campushub_dernier_id;

INSERT INTO utilisateurs (
  code_utilisateur, email, mot_de_passe_hash, role, statut_compte,
  statut_verification, nom_affichage, ville, province, date_verification_email
) VALUES (
  '', 'institution@campushub.test', '$2b$12$hash.de.demonstration.a.remplacer.avant.utilisation',
  'UNIVERSITE', 'ACTIF', 'VERIFIE', 'Compte institutionnel ISIG', 'Goma', 'Nord-Kivu', CURRENT_TIMESTAMP
);
SET @compte_universite_id = @campushub_dernier_id;

-- Le trigger produira un code comme ISIG00012026 selon l’année d’exécution.
INSERT INTO universites (
  code_universite, nom, sigle, slug, type_universite, statut_verification,
  description, ville, province, email, telephone, inscriptions_ouvertes
) VALUES (
  '', 'Institut Supérieur d’Informatique et de Gestion', 'ISIG',
  'institut-superieur-informatique-gestion', 'PRIVEE', 'VERIFIEE',
  'Institution fictive créée pour démontrer le fonctionnement de CampusHub.',
  'Goma', 'Nord-Kivu', 'contact@isig.test', '+243000000000', 1
);
SET @universite_id = @campushub_dernier_id;

INSERT INTO membres_universite (
  code_membre, universite_id, utilisateur_id, fonction, est_proprietaire
) VALUES ('', @universite_id, @compte_universite_id, 'Administrateur institutionnel', 1);

INSERT INTO campus (
  code_campus, universite_id, nom, adresse, ville, province, est_principal
) VALUES ('', @universite_id, 'Campus principal', 'Adresse de démonstration', 'Goma', 'Nord-Kivu', 1);
SET @campus_id = @campushub_dernier_id;

INSERT INTO facultes (
  code_faculte, universite_id, nom, slug, description
) VALUES (
  '', @universite_id, 'Faculté des Sciences et Technologies',
  'sciences-et-technologies', 'Faculté fictive destinée aux essais.'
);
SET @faculte_id = @campushub_dernier_id;

INSERT INTO filieres (
  code_filiere, universite_id, faculte_id, nom, slug, domaine,
  niveau_diplome, duree_annees, frais_minimum, frais_maximum, devise, description
) VALUES (
  '', @universite_id, @faculte_id, 'Informatique de Gestion',
  'informatique-de-gestion', 'Informatique', 'LICENCE', 3,
  450.00, 650.00, 'USD', 'Filière fictive de démonstration.'
);
SET @filiere_id = @campushub_dernier_id;

INSERT INTO campus_filieres (campus_id, filiere_id)
VALUES (@campus_id, @filiere_id);

INSERT INTO profils_etudiants (
  code_profil, utilisateur_id, universite_id, filiere_id, matricule_etudiant,
  titre_profil, competences, annee_diplomation
) VALUES (
  '', @etudiant_id, @universite_id, @filiere_id, 'DEMO-001',
  'Développeur web étudiant', JSON_ARRAY('JavaScript', 'MySQL', 'Design UI'), YEAR(CURRENT_DATE) + 1
);

INSERT INTO services_universitaires (code_service, universite_id, nom, description)
VALUES
  ('', @universite_id, 'Bibliothèque', 'Bibliothèque académique de démonstration.'),
  ('', @universite_id, 'Connexion Internet', 'Accès Internet disponible sur le campus.');

INSERT INTO infrastructures (code_infrastructure, universite_id, nom, categorie, quantite)
VALUES
  ('', @universite_id, 'Laboratoire informatique', 'LABORATOIRE', 2),
  ('', @universite_id, 'Bibliothèque centrale', 'BIBLIOTHEQUE', 1);

INSERT INTO conditions_admission (
  code_condition, universite_id, titre, description, niveau_diplome
) VALUES (
  '', @universite_id, 'Admission en première année',
  'Présenter les documents scolaires demandés par l’établissement.', 'LICENCE'
);

INSERT INTO publications (
  code_publication, auteur_id, universite_id, titre, contenu,
  type_publication, statut_publication, etiquettes
) VALUES (
  '', @etudiant_id, @universite_id, 'Application mobile de gestion académique',
  'Projet fictif réalisé pour présenter le portfolio étudiant de CampusHub.',
  'PROJET', 'PUBLIEE', JSON_ARRAY('mobile', 'gestion', 'étudiant')
);
SET @publication_id = @campushub_dernier_id;

INSERT INTO medias_publication (
  code_media, publication_id, type_media, url_media, url_miniature,
  type_mime, taille_octets, largeur_pixels, hauteur_pixels
) VALUES (
  '', @publication_id, 'IMAGE', 'https://exemple.test/projet-demo.jpg',
  'https://exemple.test/projet-demo-miniature.jpg', 'image/jpeg', 250000, 1200, 800
);

INSERT INTO mentions_jaime (utilisateur_id, publication_id)
VALUES (@compte_universite_id, @publication_id);

INSERT INTO commentaires (
  code_commentaire, publication_id, auteur_id, contenu
) VALUES (
  '', @publication_id, @compte_universite_id,
  'Excellent projet de démonstration. Continuez ainsi !'
);

INSERT INTO abonnements_universites (utilisateur_id, universite_id)
VALUES (@etudiant_id, @universite_id);

COMMIT;
select *from commentaires
SELECT code_universite, nom, sigle FROM universites WHERE id = @universite_id;
SELECT 'Données françaises de démonstration ajoutées avec succès' AS message;
