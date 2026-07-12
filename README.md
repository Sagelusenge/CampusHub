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

## Parcours métier ajoutés

- localisation guidée `pays → province/État → ville`, avec la RDC par défaut ;
- signalement au manager lorsqu’une ville manque dans la liste ;
- inscription étudiant, demande d’affiliation et confirmation par l’université ;
- trois packs institutionnels mensuels : Essentiel 20 USD, Professionnel 35 USD et Excellence 50 USD ;
- badge CampusHub certifié commandable séparément à 7 USD pour 30 jours ;
- activation après validation du paiement, badge certifié et compte à rebours ;
- téléversement local des images et preuves dans `backend/uploads` ;
- slug/identifiant URL universitaire généré automatiquement à partir du nom ;
- indicateur rouge affiché sur la cloche uniquement en présence de notifications non lues.

Le parcours API correspondant est décrit dans [PARCOURS_ABONNEMENT_AFFILIATION.md](backend/docs/PARCOURS_ABONNEMENT_AFFILIATION.md).
