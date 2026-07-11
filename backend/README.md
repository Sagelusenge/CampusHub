# Backend CampusHub

API REST construite avec Express et MySQL. Le code suit volontairement un chemin simple :

```text
requête HTTP
  → route
  → middleware de validation/authentification
  → controller
  → service
  → MySQL
```

## Structure

```text
backend/
├── src/
│   ├── config/          # Variables d'environnement et connexion MySQL
│   ├── controllers/     # Reçoit la requête et construit la réponse
│   ├── middlewares/     # Validation, sécurité, authentification et erreurs
│   ├── routes/          # Déclaration des URL de l'API
│   ├── schemas/         # Règles de validation Zod
│   ├── services/        # Logique métier et requêtes SQL
│   ├── utils/           # Petits outils réutilisables
│   ├── app.js           # Configuration Express
│   └── server.js        # Démarrage et arrêt du serveur
├── tests/
├── .env.example
└── package.json
```

## Installation

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run dev
```

Avant le démarrage, exécutez les scripts du dossier `database` et adaptez les accès MySQL dans `.env`.

## Routes initiales

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/api/v1/sante` | Public | État de l'API et de MySQL |
| POST | `/api/v1/auth/inscription` | Public | Créer un compte |
| POST | `/api/v1/auth/connexion` | Public | Obtenir un jeton JWT |
| GET | `/api/v1/universites` | Public | Rechercher les universités |
| GET | `/api/v1/universites/:code` | Public | Fiche détaillée |
| POST | `/api/v1/universites` | ADMINISTRATEUR/UNIVERSITE | Créer une université |

Toutes les réponses utilisent la forme `{ succes, donnees }` ou `{ succes, erreur }`.
