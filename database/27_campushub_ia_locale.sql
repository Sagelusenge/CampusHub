-- CampusHub - 27. Remplacement des fournisseurs externes par CampusHubIA local
USE campushub;

ALTER TABLE dossiers_orientation
  MODIFY modele_ia VARCHAR(80) NOT NULL DEFAULT 'campushub-ia-local-v1',
  MODIFY mode_execution ENUM('GPT_5_6', 'DEMONSTRATION', 'CAMPUSHUB_IA', 'MOTEUR_REGLES') NOT NULL DEFAULT 'CAMPUSHUB_IA';
UPDATE dossiers_orientation
SET mode_execution = CASE
  WHEN mode_execution = 'GPT_5_6' THEN 'CAMPUSHUB_IA'
  WHEN mode_execution = 'DEMONSTRATION' THEN 'MOTEUR_REGLES'
  ELSE mode_execution
END,
modele_ia = 'campushub-ia-local-v1';
ALTER TABLE dossiers_orientation
  MODIFY mode_execution ENUM('CAMPUSHUB_IA', 'MOTEUR_REGLES') NOT NULL DEFAULT 'CAMPUSHUB_IA';

ALTER TABLE generations_copilote_institution
  MODIFY mode_execution ENUM('GPT_5_6', 'DEMONSTRATION', 'CAMPUSHUB_IA', 'MOTEUR_REGLES') NOT NULL DEFAULT 'CAMPUSHUB_IA';
UPDATE generations_copilote_institution
SET mode_execution = CASE
  WHEN mode_execution = 'GPT_5_6' THEN 'CAMPUSHUB_IA'
  WHEN mode_execution = 'DEMONSTRATION' THEN 'MOTEUR_REGLES'
  ELSE mode_execution
END,
modele_ia = 'campushub-ia-local-v1';
ALTER TABLE generations_copilote_institution
  MODIFY mode_execution ENUM('CAMPUSHUB_IA', 'MOTEUR_REGLES') NOT NULL DEFAULT 'CAMPUSHUB_IA';

SELECT 'CampusHubIA local activé' AS message;
