# Frontend CampusHub

Application React/Vite reliée à l’API Express de CampusHub.

## Parcours disponibles

- accueil public avec recherche d’universités vérifiées ;
- annuaire, fiche détaillée et comparateur d’universités ;
- annuaire des talents et portfolios étudiants ;
- demande de partenariat universitaire ;
- connexion selon le rôle ;
- dashboard administrateur avec demandes, universités, utilisateurs, modération et audit ;
- dashboard institutionnel avec fiche, campus, facultés, filières, services, infrastructures, admissions et publications ;
- notifications et paramètres de compte.

Les espaces connectés utilisent une barre latérale persistante et une barre supérieure unique. Sur mobile, la barre latérale devient un menu coulissant.

## Démarrage

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Le frontend est disponible sur `http://127.0.0.1:5173`. Le backend doit fonctionner sur `http://127.0.0.1:4000`.

## Organisation

```text
src/
├── api/          # client HTTP et erreurs API
├── components/   # composants visuels réutilisables
├── context/      # session et authentification
├── pages/        # écrans associés aux routes
└── styles/       # design system responsive et animations
```
