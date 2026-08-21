# Déploiement AWS Lightsail

Cette configuration déploie CampusHub sur une instance Lightsail Linux avec :

- React et Express dans une image Node.js de production ;
- MySQL 8.4 et initialisation automatique des scripts `database/01` à `18` ;
- volumes persistants pour MySQL et les téléversements ;
- HTTPS automatique avec Caddy et un domaine `nip.io` lié à l’IP statique ;
- CampusHubIA dans un conteneur Python privé, sans API d’IA externe ;
- PWA installable, référencement dynamique et notifications Web Push ;
- jeton d’actualisation dans un cookie `HttpOnly`, `Secure` et `SameSite=Lax`.

## Déployer

Connecter d’abord AWS CLI, puis lancer depuis la racine du dépôt :

```powershell
aws configure
powershell -ExecutionPolicy Bypass -File .\deploy\aws-lightsail\deploy.ps1
```

Le script choisit le forfait Linux actif le moins cher disposant d’au moins 2 Go de RAM. Par défaut, il utilise `eu-west-3` et la branche `main` du dépôt public.

À la fin, il affiche trois comptes de démonstration et un mot de passe aléatoire commun. Le mot de passe n’est jamais écrit dans le dépôt ; conservez-le pour les instructions privées destinées aux juges.

Le déploiement génère automatiquement un jeton interne `CAMPUSHUB_IA_TOKEN`. Le service CampusHubIA n’expose aucun port public : seul le backend Express peut l’interroger sur le réseau Docker privé.

Les notifications reçues lorsque l’application est fermée nécessitent une paire de clés VAPID dans `.env.runtime` : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` et `VAPID_SUBJECT`. La clé privée ne doit jamais être ajoutée au dépôt. `PUBLIC_SITE_URL` est automatiquement construit à partir de `CAMPUSHUB_DOMAIN`.

La recherche Internet fonctionne sans clé avec les sources ouvertes prises en charge. Pour obtenir davantage de résultats, une clé Brave Search peut être placée dans `BRAVE_SEARCH_API_KEY`. Les liens sont toujours filtrés et affichés à l’utilisateur.

## Supprimer après le concours

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\aws-lightsail\destroy.ps1
```

Cette commande supprime l’instance et libère l’adresse IP afin d’arrêter leur facturation.
