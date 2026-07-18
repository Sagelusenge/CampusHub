# API CampusHub v1

Préfixe de toutes les routes : `/api/v1`.

## Parcours conseillé

Le fichier [PARCOURS_API.md](PARCOURS_API.md) présente un scénario complet dans l'ordre des dépendances : activation des comptes, création de l'université, du campus, de la faculté et de la filière, puis profil étudiant, publication et modération.

## Fichier de requêtes prêt à exécuter

Le fichier [API.http](API.http) contient toutes les requêtes avec :

- la méthode HTTP (`GET`, `POST`, `PATCH` ou `DELETE`) ;
- l'URL complète ;
- les en-têtes nécessaires ;
- le body JSON correspondant à chaque création ou modification ;
- des variables pour les codes et les jetons JWT.

Dans VS Code, installez l'extension **REST Client**, ouvrez `API.http`, puis cliquez sur **Send Request** au-dessus de la requête souhaitée.

Une route marquée **Connecté** exige l'en-tête :

```http
Authorization: Bearer <jetonAcces>
```

## Authentification

| Méthode | Route | Accès | Action |
|---|---|---|---|
| POST | `/auth/inscription` | Public | Inscrire un visiteur, étudiant, établissement ou entreprise |
| POST | `/auth/connexion` | Public | Recevoir les jetons d'accès et d'actualisation |
| POST | `/auth/actualiser` | Public | Remplacer un jeton d'actualisation et renouveler l'accès |
| POST | `/auth/deconnexion` | Public | Révoquer le jeton d'actualisation |

## Utilisateurs et profils

| Méthode | Route | Accès | Action |
|---|---|---|---|
| GET | `/utilisateurs/moi` | Connecté | Lire son compte |
| PATCH | `/utilisateurs/moi` | Connecté | Modifier son compte |
| GET | `/utilisateurs` | Administrateur | Rechercher les comptes |
| GET | `/utilisateurs/:code` | Public | Lire un profil utilisateur public |
| PATCH | `/utilisateurs/:code/statut` | Administrateur | Activer, suspendre ou vérifier un compte |
| POST/DELETE | `/utilisateurs/:code/suivre` | Connecté | Suivre ou ne plus suivre un utilisateur |
| GET | `/profils` | Public | Rechercher les portfolios étudiants |
| GET | `/profils/:code` | Public | Lire un portfolio |
| GET | `/profils/moi` | Étudiant | Lire son portfolio complet |
| POST | `/profils` | Étudiant | Créer son portfolio |
| PATCH/DELETE | `/profils/moi` | Étudiant | Modifier ou masquer son portfolio |

## Universités

| Méthode | Route | Accès | Action |
|---|---|---|---|
| GET | `/universites` | Public | Recherche par ville, province, type, filière, frais et service |
| GET | `/universites/comparer?codes=...` | Public | Comparer deux ou trois établissements |
| GET | `/universites/:code` | Public | Fiche complète |
| GET | `/universites/:code/statistiques` | Public | Statistiques factuelles |
| GET | `/universites/moi` | Université | Retrouver la fiche gérée par le compte connecté |
| POST | `/universites` | Université/Admin | Créer une fiche et rattacher son propriétaire |
| PATCH | `/universites/:code` | Gestionnaire/Admin | Modifier la fiche |
| DELETE | `/universites/:code` | Administrateur | Supprimer la fiche et ses dépendances |

## Catalogue académique

Les écritures exigent un administrateur ou un compte membre de l'université concernée.

| Ressource | Lecture/création | Modification/suppression |
|---|---|---|
| Campus | `GET/POST /catalogue/universites/:code/campus` | `PATCH/DELETE /catalogue/campus/:code` |
| Facultés | `GET/POST /catalogue/universites/:code/facultes` | `PATCH/DELETE /catalogue/facultes/:code` |
| Filières | `GET/POST /catalogue/facultes/:code/filieres` | `PATCH/DELETE /catalogue/filieres/:code` |
| Services | `GET/POST /catalogue/universites/:code/services` | `PATCH/DELETE /catalogue/services/:code` |
| Infrastructures | `GET/POST /catalogue/universites/:code/infrastructures` | `PATCH/DELETE /catalogue/infrastructures/:code` |
| Conditions d'admission | `GET/POST /catalogue/universites/:code/conditions-admission` | `PATCH/DELETE /catalogue/conditions-admission/:code` |
| Membres | `GET/POST /catalogue/universites/:code/membres` | `DELETE /catalogue/membres/:code` |

Association d'une filière à un campus :

```text
POST   /catalogue/campus/:codeCampus/filieres/:codeFiliere
DELETE /catalogue/campus/:codeCampus/filieres/:codeFiliere
```

## Publications et médias

| Méthode | Route | Accès | Action |
|---|---|---|---|
| GET | `/publications` | Public | Filtrer le fil académique |
| GET | `/publications/:code` | Public | Publication, médias, commentaires et compteurs |
| POST | `/publications` | Connecté | Créer un brouillon ou publier |
| PATCH/DELETE | `/publications/:code` | Auteur/Admin | Modifier ou retirer |
| POST | `/publications/:code/medias` | Auteur/Admin | Ajouter une référence image, vidéo ou document |
| DELETE | `/publications/medias/:codeMedia` | Auteur/Admin | Supprimer un média |
| POST | `/publications/:code/commentaires` | Connecté | Commenter ou répondre |
| PATCH/DELETE | `/publications/commentaires/:codeCommentaire` | Auteur/Admin | Modifier ou supprimer un commentaire |

## Offres des établissements

Les universités, instituts supérieurs et écoles secondaires utilisent les mêmes contrôles d’accès de gestionnaire, mais choisissent un type et un public adaptés à leur établissement.

| Méthode | Route | Accès | Action |
|---|---|---|---|
| GET | `/offres` | Public | Rechercher les offres actives et non expirées |
| GET | `/offres/:code` | Public | Lire une offre active |
| GET | `/offres/moi` | Gestionnaire | Lire les brouillons et offres de son établissement |
| POST | `/offres` | Gestionnaire/Admin | Créer un brouillon ou publier une offre |
| PATCH | `/offres/:code` | Gestionnaire/Admin | Modifier, publier ou clôturer une offre |
| DELETE | `/offres/:code` | Gestionnaire/Admin | Retirer une offre du catalogue |

## Interactions

| Méthode | Route | Action |
|---|---|---|
| POST | `/interactions/publications/:code/jaime` | Ajouter ou retirer J'aime |
| GET | `/interactions/favoris` | Lire ses favoris |
| POST/DELETE | `/interactions/publications/:code/favori` | Ajouter ou retirer un favori |
| GET | `/interactions/universites-suivies` | Lire ses abonnements universitaires |
| POST/DELETE | `/interactions/universites/:code/suivre` | Suivre ou ne plus suivre une université |

## Modération, notifications et administration

| Méthode | Route | Accès | Action |
|---|---|---|---|
| POST | `/moderation/signalements` | Connecté | Signaler une publication |
| GET | `/moderation/signalements` | Administrateur | Lire les signalements |
| PATCH | `/moderation/signalements/:code` | Administrateur | Examiner, résoudre ou rejeter |
| GET | `/notifications` | Connecté | Lire ses notifications paginées |
| PATCH | `/notifications/tout-lire` | Connecté | Tout marquer comme lu |
| PATCH | `/notifications/:code/lire` | Connecté | Marquer une notification comme lue |
| DELETE | `/notifications/:code` | Connecté | Supprimer une notification |
| GET | `/administration/tableau-de-bord` | Administrateur | Indicateurs et état des compteurs |
| GET | `/administration/audit` | Administrateur | Journal d'audit paginé |
| PATCH | `/administration/universites/:code/verification` | Administrateur | Vérifier ou rejeter une université |

## Pagination et erreurs

Les listes paginées acceptent généralement `page` et `limite`. La réponse contient :

```json
{
  "succes": true,
  "donnees": [],
  "meta": { "page": 1, "limite": 20, "total": 0, "pages": 0 }
}
```

Une erreur suit toujours la forme :

```json
{
  "succes": false,
  "erreur": { "message": "Description lisible" }
}
```
