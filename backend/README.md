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
| GET | `/api/v1/orientation/configuration` | Connecté | État de GPT‑5.6 |
| POST | `/api/v1/orientation/recommandations` | Connecté | Créer un dossier d’orientation |
| POST | `/api/v1/orientation/analyser-bulletin` | Connecté | Analyser une image de bulletin |
| GET | `/api/v1/orientation/dossiers` | Connecté | Historique personnel |

Toutes les réponses utilisent la forme `{ succes, donnees }` ou `{ succes, erreur }`.

La liste complète des routes, rôles et opérations se trouve dans [docs/API.md](docs/API.md).

## Débogage

- `npm run check` vérifie la syntaxe de tous les fichiers JavaScript.
- `npm test` exécute les tests HTTP sans exiger MySQL.
- En développement, les requêtes sont affichées dans le terminal avec leur statut et leur durée.
- Les erreurs `500` affichent un message technique uniquement en développement.
- La logique SQL se trouve exclusivement dans `services`, ce qui permet de suivre facilement une requête depuis sa route.
- `npm run eval:orientation` exécute cinq scénarios métier contre le catalogue MySQL.
- `npm run db:demo-ai` installe les données fictives et idempotentes du conseiller.

## Activer GPT‑5.6

Ajoutez ces variables dans `.env` :

```dotenv
OPENAI_API_KEY=votre_cle_api
OPENAI_MODEL=gpt-5.6
```

Sans clé, l’API ne simule pas un appel OpenAI : elle annonce le mode `DEMONSTRATION` et utilise son moteur MySQL déterministe. L’analyse de bulletin reste désactivée jusqu’à la configuration de la clé.

### Responsabilité d'un controller

Un controller CampusHub n'est plus une simple fonction d'une ligne. Il doit maintenant :

1. indiquer la route HTTP concernée ;
2. extraire les paramètres, le body et l'utilisateur connecté ;
3. donner des noms métier aux données ;
4. appeler le service correspondant ;
5. choisir le statut HTTP et le message de succès.

Les requêtes SQL et transactions restent dans les services. Les `try/catch` ne sont pas répétés dans chaque controller : `gestionnaireAsync` transmet les erreurs au middleware global, qui les formate de manière uniforme.
