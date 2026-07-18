# Mettre à jour CampusHub sur EC2

Le serveur EC2 est déjà installé. Pour publier une nouvelle version :

1. valider les changements dans Git ;
2. ouvrir PowerShell à la racine du projet ;
3. exécuter :

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\aws-ec2\update.ps1
```

Le script transfère uniquement le dernier commit, sauvegarde MySQL, reconstruit
l’application, conserve les volumes et les secrets du serveur, puis vérifie
`/api/v1/sante` en HTTPS.

Si l’adresse IP Internet de l’ordinateur change, la règle SSH du groupe de
sécurité AWS doit être mise à jour avant le prochain déploiement.

