# Guide d’accès et d’exploitation du serveur CampusHub

Ce document explique comment accéder au serveur AWS, redéployer CampusHub,
consulter les données MySQL, lire les journaux et créer une sauvegarde.

## 1. Informations du serveur

| Élément | Valeur |
|---|---|
| Adresse IP | `13.63.171.109` |
| Adresse du site | `https://13-63-171-109.nip.io` |
| Utilisateur SSH | `ubuntu` |
| Clé SSH locale | `C:\Users\sagel\Downloads\sage-vps-key.pem` |
| Dossier du projet sur le serveur | `/opt/campushub` |
| Dossier Docker Compose | `/opt/campushub/deploy/aws-lightsail` |
| Nom du projet Docker Compose | `aws-lightsail` |

La clé privée `.pem` ne doit jamais être envoyée par e-mail, publiée sur GitHub
ou copiée dans le projet.

## 2. Se connecter au serveur depuis Windows

Ouvrir PowerShell puis exécuter :

```powershell
ssh -i "C:\Users\sagel\Downloads\sage-vps-key.pem" ubuntu@13.63.171.109
```

Après la connexion, ouvrir le dossier d’exploitation :

```bash
cd /opt/campushub/deploy/aws-lightsail
```

Pour quitter le serveur :

```bash
exit
```

### Si la connexion SSH expire

Le port `22` est limité à l’adresse IP publique autorisée dans le groupe de
sécurité AWS. Pour connaître l’adresse IP actuelle de l’ordinateur :

```powershell
Invoke-RestMethod https://api.ipify.org
```

Dans AWS, modifier ensuite la règle entrante SSH afin que sa source soit cette
adresse suivie de `/32`. Les ports HTTP `80` et HTTPS `443` peuvent rester
ouverts à `0.0.0.0/0`.

## 3. Vérifier si CampusHub fonctionne

Depuis PowerShell :

```powershell
Invoke-RestMethod https://13-63-171-109.nip.io/api/v1/sante
```

Depuis le serveur :

```bash
cd /opt/campushub/deploy/aws-lightsail
sudo docker compose -p aws-lightsail --env-file .env.runtime ps
```

Les services attendus sont :

- `app` : frontend React et backend Express ;
- `campushub-ia` : moteur local CampusHubIA ;
- `mysql` : base de données MySQL ;
- `caddy` : HTTPS et accès public.

Le service MySQL et CampusHubIA doivent normalement afficher l’état `healthy`.

## 4. Redéployer une nouvelle version

Le redéploiement se lance depuis l’ordinateur Windows, à la racine du projet :

```powershell
cd "C:\Users\sagel\Downloads\CampusHub\Projet Realisation"
```

Vérifier et enregistrer les modifications dans Git :

```powershell
git status
git add .
git commit -m "Description de la modification"
git push origin codex/finalisation-campushub
```

Lancer ensuite le déploiement :

```powershell
powershell -ExecutionPolicy Bypass -File ".\deploy\aws-ec2\update.ps1" `
  -KeyPath "C:\Users\sagel\Downloads\sage-vps-key.pem"
```

Important : le script déploie uniquement le dernier commit Git. Une
modification non validée avec `git commit` ne sera pas envoyée au serveur.

Le script réalise automatiquement les opérations suivantes :

1. création d’une sauvegarde MySQL ;
2. transfert du dernier commit vers le VPS ;
3. reconstruction de l’application et de CampusHubIA ;
4. application des migrations récentes ;
5. redémarrage des services ;
6. contrôle de l’API en HTTPS.

Le déploiement est terminé lorsque le message suivant apparaît :

```text
CampusHub déployé avec succès : https://13-63-171-109.nip.io
```

## 5. Consulter les données MySQL

Se connecter au serveur, puis exécuter :

```bash
cd /opt/campushub/deploy/aws-lightsail
sudo docker compose -p aws-lightsail --env-file .env.runtime exec mysql \
  sh -lc 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" campushub'
```

Le mot de passe est lu à l’intérieur du conteneur et n’est pas affiché dans la
commande. Une fois dans MySQL, les commandes suivantes sont utiles.

### Voir les tables

```sql
SHOW TABLES;
```

### Voir les utilisateurs récents

```sql
SELECT code_utilisateur, nom_affichage, email, role, statut_compte, date_creation
FROM utilisateurs
ORDER BY date_creation DESC
LIMIT 50;
```

### Voir les universités et écoles

```sql
SELECT code_universite, nom, categorie_etablissement, ville, province,
       statut_verification, inscriptions_ouvertes
FROM universites
ORDER BY date_creation DESC
LIMIT 50;
```

### Voir les formations

```sql
SELECT fi.code_filiere, fi.nom, fi.domaine, fi.niveau_diplome,
       fi.frais_minimum, fi.frais_maximum, u.nom AS etablissement
FROM filieres fi
JOIN universites u ON u.id = fi.universite_id
ORDER BY u.nom, fi.nom
LIMIT 100;
```

### Voir les essais et abonnements

```sql
SELECT code_abonnement, nom_universite, type_abonnement, statut,
       date_debut, date_fin, jours_restants
FROM vue_abonnements_universites
ORDER BY date_fin DESC
LIMIT 100;
```

### Voir le nombre d’enregistrements importants

```sql
SELECT 'Utilisateurs' AS element, COUNT(*) AS total FROM utilisateurs
UNION ALL
SELECT 'Établissements', COUNT(*) FROM universites
UNION ALL
SELECT 'Formations', COUNT(*) FROM filieres
UNION ALL
SELECT 'Publications', COUNT(*) FROM publications;
```

Pour quitter MySQL :

```sql
exit;
```

Ne jamais exécuter `DROP DATABASE`, `TRUNCATE`, ou une commande `DELETE` sans
condition et sans sauvegarde vérifiée.

## 6. Exécuter une requête rapide sans ouvrir MySQL

Exemple pour compter les utilisateurs :

```bash
cd /opt/campushub/deploy/aws-lightsail
sudo docker compose -p aws-lightsail --env-file .env.runtime exec -T mysql \
  sh -lc 'mysql -N -uroot -p"$MYSQL_ROOT_PASSWORD" campushub -e "SELECT COUNT(*) FROM utilisateurs;"'
```

## 7. Consulter les journaux

Toujours commencer par le dossier Docker Compose :

```bash
cd /opt/campushub/deploy/aws-lightsail
```

Backend et frontend :

```bash
sudo docker compose -p aws-lightsail --env-file .env.runtime logs --tail=200 -f app
```

CampusHubIA :

```bash
sudo docker compose -p aws-lightsail --env-file .env.runtime logs --tail=200 -f campushub-ia
```

MySQL :

```bash
sudo docker compose -p aws-lightsail --env-file .env.runtime logs --tail=200 -f mysql
```

Serveur HTTPS Caddy :

```bash
sudo docker compose -p aws-lightsail --env-file .env.runtime logs --tail=200 -f caddy
```

Utiliser `Ctrl + C` pour arrêter l’affichage en direct des journaux. Cette
action ne coupe pas le service.

## 8. Redémarrer un service

Redémarrer uniquement l’application :

```bash
cd /opt/campushub/deploy/aws-lightsail
sudo docker compose -p aws-lightsail --env-file .env.runtime restart app
```

Redémarrer CampusHubIA :

```bash
sudo docker compose -p aws-lightsail --env-file .env.runtime restart campushub-ia
```

Redémarrer tous les services sans supprimer les données :

```bash
sudo docker compose -p aws-lightsail --env-file .env.runtime restart
```

## 9. Sauvegarder la base de données

Chaque redéploiement crée déjà une sauvegarde automatique dans :

```text
/opt/campushub-backups
```

Voir les sauvegardes disponibles :

```bash
ls -lh /opt/campushub-backups
```

Créer manuellement une sauvegarde :

```bash
cd /opt/campushub/deploy/aws-lightsail
BACKUP="/opt/campushub-backups/campushub-manuel-$(date +%Y%m%d-%H%M%S).sql.gz"
sudo docker compose -p aws-lightsail --env-file .env.runtime exec -T mysql \
  sh -lc 'mysqldump --no-tablespaces --single-transaction --routines --triggers -uroot -p"$MYSQL_ROOT_PASSWORD" campushub' \
  | gzip > "$BACKUP"
ls -lh "$BACKUP"
```

Télécharger une sauvegarde sur Windows :

```powershell
scp -i "C:\Users\sagel\Downloads\sage-vps-key.pem" `
  ubuntu@13.63.171.109:/opt/campushub-backups/NOM_DU_FICHIER.sql.gz `
  "$HOME\Downloads\"
```

Une restauration remplace des données. Elle doit être effectuée uniquement
après avoir créé une nouvelle sauvegarde et vérifié précisément le fichier à
restaurer.

## 10. Vérifier CampusHubIA

État du conteneur :

```bash
cd /opt/campushub/deploy/aws-lightsail
sudo docker compose -p aws-lightsail --env-file .env.runtime exec -T campushub-ia \
  python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:5000/health').read().decode())"
```

Compter les questions-réponses du corpus :

```bash
sudo docker compose -p aws-lightsail --env-file .env.runtime exec -T campushub-ia \
  sh -lc "grep -c '^Q:' /app/data/campushub_qa_2000.txt"
```

Le résultat attendu pour le corpus actuel est `2000`.

## 11. Vérifier la configuration sans afficher les secrets

```bash
cd /opt/campushub/deploy/aws-lightsail
for variable in MYSQL_ROOT_PASSWORD MYSQL_APP_PASSWORD JWT_SECRET SMTP_HOST \
  SMTP_USER SMTP_PASSWORD CAMPUSHUB_IA_TOKEN; do
  if grep -q "^${variable}=." .env.runtime; then
    echo "${variable}=CONFIGURÉE"
  else
    echo "${variable}=MANQUANTE"
  fi
done
```

Pour modifier une variable :

```bash
sudo nano /opt/campushub/deploy/aws-lightsail/.env.runtime
```

Après une modification des variables du backend, recréer le conteneur :

```bash
cd /opt/campushub/deploy/aws-lightsail
sudo docker compose -p aws-lightsail --env-file .env.runtime up -d --force-recreate app
```

Ne jamais afficher publiquement le contenu complet de `.env.runtime`.

## 12. Diagnostic rapide

Espace disque :

```bash
df -h
sudo docker system df
```

Mémoire :

```bash
free -h
```

État Docker :

```bash
sudo systemctl status docker --no-pager
```

Si le site ne répond plus :

1. vérifier `docker compose ps` ;
2. consulter les journaux de `app`, `mysql` et `caddy` ;
3. tester `/api/v1/sante` ;
4. redémarrer uniquement le service en erreur ;
5. redéployer si le problème vient du code.

## 13. Revenir à une version précédente du code

Depuis Windows, consulter les commits :

```powershell
git log --oneline -10
```

Créer un commit qui annule le commit problématique :

```powershell
git revert IDENTIFIANT_DU_COMMIT
git push origin codex/finalisation-campushub
powershell -ExecutionPolicy Bypass -File ".\deploy\aws-ec2\update.ps1" `
  -KeyPath "C:\Users\sagel\Downloads\sage-vps-key.pem"
```

`git revert` est préférable à `git reset --hard`, car il conserve un historique
clair et ne supprime pas silencieusement les modifications.

## 14. Commandes dangereuses à éviter

Ne pas exécuter ces commandes pour un simple redémarrage ou redéploiement :

```text
docker compose down -v
docker volume rm ...
docker system prune --volumes
DROP DATABASE campushub;
TRUNCATE TABLE ...;
rm -rf /opt/campushub
```

Elles peuvent supprimer définitivement MySQL, les fichiers chargés par les
utilisateurs ou l’installation du projet.
