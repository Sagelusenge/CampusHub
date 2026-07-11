# Architecture et débogage du backend

## Chemin d'une requête

Exemple : création d'une condition d'admission.

```text
POST /api/v1/catalogue/universites/:code/conditions-admission
  ↓ catalogue.routes.js
  ↓ authentification + rôle + validation Zod
  ↓ catalogue.controller.js / creerCondition
  ↓ catalogue.service.js / creerCondition
  ↓ trigger MySQL + table conditions_admission
  ↓ réponse JSON 201
```

## Rôle de chaque couche

### Route

Déclare l'URL, les middlewares et le controller. Elle ne contient aucune règle métier.

### Middleware

Vérifie le JWT, les rôles et le format des données. Les données validées sont accessibles dans `requete.validees`.

### Controller

Orchestre l'opération HTTP : il extrait les données, identifie l'utilisateur courant, appelle le service puis choisit le statut et le message de réponse.

### Service

Contient les requêtes SQL, transactions, contrôles de propriété et règles métier complexes. Il retourne des données ou lève une `ErreurApi`.

### Middleware d'erreurs

Transforme les erreurs provenant du controller, du service ou de MySQL en une réponse uniforme. En développement, une erreur interne contient aussi un détail technique ; ce détail est masqué en production.

## Méthode de débogage

1. Vérifier dans le terminal la méthode, l'URL et le statut HTTP affichés par Morgan.
2. Ouvrir la route correspondante dans `src/routes`.
3. Vérifier le schema Zod appliqué à la route.
4. Suivre le nom du controller appelé dans `src/controllers`.
5. Suivre ensuite la fonction de service dans `src/services`.
6. En cas d'erreur MySQL, vérifier le trigger ou la procédure dans `database`.

Cette organisation évite les controllers géants mêlant HTTP, SQL, hash de mot de passe, email et transactions dans une même fonction.
