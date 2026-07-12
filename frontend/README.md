# Frontend CampusHub

Application React/Vite reliée à l’API Express de CampusHub.

## Parcours disponibles

- accueil public avec recherche d’universités vérifiées ;
- demande de partenariat universitaire ;
- connexion selon le rôle ;
- validation des comptes et des fiches par l’administrateur ;
- création et suivi de la fiche dans l’espace institutionnel.

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
