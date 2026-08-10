# Utilisation de la base CampusHub

## Prérequis

- MySQL Server 8.0 ou supérieur ;
- MySQL Workbench, recommandé pour commencer simplement.

## Création avec MySQL Workbench

1. Ouvrir MySQL Workbench et se connecter au serveur local.
2. Ouvrir les scripts avec **File > Open SQL Script**.
3. Exécuter, dans l'ordre, `01_structure.sql`, `02_automatismes.sql`, `03_procedures.sql` et `04_vues.sql`.
4. Exécuter ensuite `05_donnees_test.sql` si vous souhaitez des données fictives.
5. Exécuter `07_abonnements_affiliations_localisations.sql` pour les abonnements, affiliations et villes proposées.
6. Exécuter `08_packs_et_certification.sql` pour la compatibilité de l’historique des paiements.
7. Exécuter `09_messagerie_privee.sql` pour les conversations et messages privés.
8. Exécuter `10_recherche_et_contact.sql` pour la recherche personnalisée et les contacts.
9. Exécuter ensuite les scripts `11` à `26` dans l’ordre pour les cartes, stories, outils IA, comptes de démonstration, offres, réseau, inscriptions en ligne, partenaires, vérification e-mail, messagerie enrichie, couvertures, gestion des étudiants, audit et abonnement annuel unique.
10. Actualiser la liste **Schemas** : la base `campushub` doit apparaître.

## Création depuis le client MySQL

Après connexion avec `mysql -u root -p`, exécuter :

```sql
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/01_structure.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/02_automatismes.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/03_procedures.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/04_vues.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/05_donnees_test.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/07_abonnements_affiliations_localisations.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/08_packs_et_certification.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/09_messagerie_privee.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/10_recherche_et_contact.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/11_etablissements_cartes_et_stories.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/12_campushub_ai_orientation.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/13_donnees_demo_campushub_ai.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/14_copilote_institutionnel.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/15_etablissements_et_comptes_demo.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/16_etudiants_demo.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/17_offres_etablissements.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/18_documents_offres_et_republications.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/19_options_ecoles_secondaires.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/20_reseau_inscriptions_partenaires.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/21_verification_email.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/22_messagerie_avancee.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/23_medias_messagerie.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/24_couvertures_etablissements.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/25_gestion_etudiants_audit.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/26_abonnement_annuel_unique.sql;
```

Le script `13_donnees_demo_campushub_ai.sql` est facultatif. Il ajoute uniquement des établissements fictifs clairement nommés « Démonstration » pour tester le conseiller sans faire passer ces données pour des institutions réelles.

## Organisation fonctionnelle

- Comptes : `utilisateurs`, `profils_etudiants`, `jetons_actualisation`.
- Universités : `universites`, `campus`, `facultes`, `filieres`, `conditions_admission`.
- Vie académique : `publications`, `medias_publication`, `commentaires`.
- Interactions : `mentions_jaime`, `favoris_publications`, `abonnements_utilisateurs`, `abonnements_universites`.
- Administration : `signalements`, `notifications`, `journal_audit`.
- Abonnements : `plans_abonnement`, `paiements_abonnement`, `abonnements_universite`.
- Affiliations : `demandes_affiliation_etudiante`, `suggestions_localisation`.
- Offre commerciale : un abonnement institutionnel unique à 10 USD pour 365 jours.
- Messagerie : `conversations`, `participants_conversation`, `messages_prives`.
- Recherche personnalisée : `recherches_utilisateurs`.
- Contact public : `demandes_contact`.
- Réseau éphémère : `stories`, `vues_stories`.
- Orientation IA : `dossiers_orientation` et `vue_impact_orientation_ia`.
- Copilote institutionnel : `generations_copilote_institution` et `vue_usage_copilote_institution`.
- Offres d’établissement : `offres_etablissements` et `vue_offres_etablissements`.
- Confirmation e-mail : `codes_verification_email` (code haché, expiration, essais et utilisation).

Les fichiers médias ne sont pas enregistrés directement dans MySQL. La table `medias_publication` conserve leur URL et leurs informations techniques.

## Codes automatiques

Les clés internes numériques et les codes lisibles sont attribués par des triggers. Exemples :

- `ISIG00012026` pour la première université ISIG créée en 2026 ;
- `ETU00012026` pour le premier étudiant créé en 2026 ;
- `PUB00012026` pour la première publication créée en 2026.
- `OFF000012026` pour la première offre créée en 2026.

La table `compteurs_sequences` garantit que deux insertions simultanées ne reçoivent jamais le même numéro. Il ne faut pas modifier manuellement cette table.

## Automatismes disponibles

- 35 triggers : numérotation, validation, notifications et audit.
- 14 procédures : inscription, catalogue, publication, recherche, comparaison et modération.
- 8 vues : universités, filières, profils, fil d'actualité, statistiques, signalements, notifications et abonnements.

Le fichier `06_exemples_requetes.sql` montre comment appeler les procédures et interroger les vues.
