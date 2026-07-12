# CampusHub

Plateforme universitaire d'orientation, de découverte et de valorisation des talents étudiants.

## Organisation actuelle

```text
CampusHub/
├── backend/    # API REST Express.js
├── database/   # Structure MySQL, triggers, procédures et vues
└── frontend/   # Interface React/Vite responsive
```

## Base de données

Les scripts MySQL sont numérotés dans leur ordre d'exécution. Consultez le [guide de la base](database/README.md) avant leur première utilisation.

## Backend

Le backend utilise Express, MySQL2, JWT et Zod. Son organisation suit le chemin :

```text
route → middleware → controller → service → MySQL
```

Consultez le [guide du backend](backend/README.md) pour l'installation, la configuration et les premières routes.

## Démarrage rapide du backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run dev
```

L'API est ensuite disponible par défaut sur `http://localhost:4000/api/v1`.

## Démarrage rapide du frontend

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

L’interface est ensuite disponible sur `http://127.0.0.1:5173`.
