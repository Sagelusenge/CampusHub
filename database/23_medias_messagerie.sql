-- ============================================================
-- CampusHub - 23. Médias enrichis dans la messagerie
-- À exécuter après 22_messagerie_avancee.sql.
-- ============================================================

USE campushub;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE messages_prives
  MODIFY COLUMN type_media ENUM('IMAGE', 'VIDEO', 'DOCUMENT', 'FICHIER') NULL,
  ADD COLUMN nom_media VARCHAR(255) NULL AFTER type_media,
  ADD COLUMN type_mime VARCHAR(120) NULL AFTER nom_media,
  ADD COLUMN taille_octets BIGINT UNSIGNED NULL AFTER type_mime;

SELECT 'Photos, vidéos et documents de messagerie prêts' AS message;
