# Utilisation de la base CampusHub

## Prérequis

- MySQL Server 8.0 ou supérieur ;
- MySQL Workbench, recommandé pour commencer simplement.

## Création avec MySQL Workbench

1. Ouvrir MySQL Workbench et se connecter au serveur local.
2. Ouvrir les scripts avec **File > Open SQL Script**.
3. Exécuter, dans l'ordre, `01_structure.sql`, `02_automatismes.sql`, `03_procedures.sql` et `04_vues.sql`.
4. Exécuter ensuite `05_donnees_test.sql` si vous souhaitez des données fictives.
5. Actualiser la liste **Schemas** : la base `campushub` doit apparaître.

## Création depuis le client MySQL

Après connexion avec `mysql -u root -p`, exécuter :

```sql
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/01_structure.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/02_automatismes.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/03_procedures.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/04_vues.sql;
SOURCE C:/Users/sagel/Downloads/CampusHub/Projet Realisation/database/05_donnees_test.sql;
```

## Organisation fonctionnelle

- Comptes : `utilisateurs`, `profils_etudiants`, `jetons_actualisation`.
- Universités : `universites`, `campus`, `facultes`, `filieres`, `conditions_admission`.
- Vie académique : `publications`, `medias_publication`, `commentaires`.
- Interactions : `mentions_jaime`, `favoris_publications`, `abonnements_utilisateurs`, `abonnements_universites`.
- Administration : `signalements`, `notifications`, `journal_audit`.

Les fichiers médias ne sont pas enregistrés directement dans MySQL. La table `medias_publication` conserve leur URL et leurs informations techniques.

## Codes automatiques

Les clés internes numériques et les codes lisibles sont attribués par des triggers. Exemples :

- `ISIG00012026` pour la première université ISIG créée en 2026 ;
- `ETU00012026` pour le premier étudiant créé en 2026 ;
- `PUB00012026` pour la première publication créée en 2026.

La table `compteurs_sequences` garantit que deux insertions simultanées ne reçoivent jamais le même numéro. Il ne faut pas modifier manuellement cette table.

## Automatismes disponibles

- 23 triggers : numérotation, validation, notifications et audit.
- 14 procédures : inscription, catalogue, publication, recherche, comparaison et modération.
- 7 vues : universités, filières, profils, fil d'actualité, statistiques, signalements et notifications.

Le fichier `06_exemples_requetes.sql` montre comment appeler les procédures et interroger les vues.
