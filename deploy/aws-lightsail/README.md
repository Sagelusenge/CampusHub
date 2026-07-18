# Déploiement AWS Lightsail

Cette configuration déploie CampusHub sur une instance Lightsail Linux avec :

- React et Express dans une image Node.js de production ;
- MySQL 8.4 et initialisation automatique des scripts `database/01` à `18` ;
- volumes persistants pour MySQL et les téléversements ;
- HTTPS automatique avec Caddy et un domaine `nip.io` lié à l’IP statique ;
- jeton d’actualisation dans un cookie `HttpOnly`, `Secure` et `SameSite=Lax`.

## Déployer

Connecter d’abord AWS CLI, puis lancer depuis la racine du dépôt :

```powershell
aws configure
powershell -ExecutionPolicy Bypass -File .\deploy\aws-lightsail\deploy.ps1
```

Le script choisit le forfait Linux actif le moins cher disposant d’au moins 2 Go de RAM. Par défaut, il utilise `eu-west-3` et la branche `main` du dépôt public.

À la fin, il affiche trois comptes de démonstration et un mot de passe aléatoire commun. Le mot de passe n’est jamais écrit dans le dépôt ; conservez-le pour les instructions privées destinées aux juges.

La clé OpenAI n’est pas incluse. Tant que `OPENAI_API_KEY` reste vide dans `.env.runtime` sur le serveur, CampusHub fonctionne en mode démonstration.

## Supprimer après le concours

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\aws-lightsail\destroy.ps1
```

Cette commande supprime l’instance et libère l’adresse IP afin d’arrêter leur facturation.
