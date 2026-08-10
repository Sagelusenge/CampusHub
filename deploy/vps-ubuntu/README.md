# Héberger CampusHub sur un VPS Ubuntu

Ce guide fonctionne sur Ubuntu 22.04 ou 24.04 avec Docker. Il ne nécessite pas de dépôt GitHub : le projet est transféré directement depuis Windows par SSH/SCP.

## 1. Préparer le VPS

Dans le panneau du fournisseur, autoriser uniquement :

- TCP 22 depuis votre adresse IP pour SSH ;
- TCP 80 et 443 depuis Internet ;
- ne jamais ouvrir MySQL 3306 sur Internet.

Connectez-vous depuis PowerShell :

```powershell
ssh -i "C:\chemin\vers\votre-cle.pem" ubuntu@ADRESSE_IP
```

Puis installez Docker sur le VPS :

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl openssl ufw
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
sudo systemctl enable --now docker
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
exit
```

Reconnectez-vous pour que le groupe Docker soit pris en compte.

## 2. Transférer le projet sans GitHub

Depuis PowerShell, à la racine de `Projet Realisation` :

```powershell
$archive = "$env:TEMP\campushub.tar.gz"
tar --exclude=node_modules --exclude=dist --exclude=.git --exclude=.env --exclude=uploads -czf $archive .
scp -i "C:\chemin\vers\votre-cle.pem" $archive ubuntu@ADRESSE_IP:/tmp/campushub.tar.gz
ssh -i "C:\chemin\vers\votre-cle.pem" ubuntu@ADRESSE_IP
```

Sur le VPS :

```bash
sudo mkdir -p /opt/campushub
sudo tar -xzf /tmp/campushub.tar.gz -C /opt/campushub
sudo chown -R ubuntu:ubuntu /opt/campushub
cd /opt/campushub/deploy/aws-lightsail
```

## 3. Choisir l’adresse HTTPS

Avec un domaine, créez un enregistrement DNS `A` vers l’IP du VPS. Sans domaine, utilisez gratuitement `nip.io`. Exemple pour l’IP `203.0.113.10` :

```text
203-0-113-10.nip.io
```

## 4. Créer les secrets de production

Créez `/opt/campushub/deploy/aws-lightsail/.env.runtime` :

```bash
umask 077
nano .env.runtime
```

Contenu à adapter :

```dotenv
CAMPUSHUB_DOMAIN=VOTRE_DOMAINE_OU_IP.nip.io
MYSQL_ROOT_PASSWORD=GENEREZ_UN_SECRET_DIFFERENT
MYSQL_APP_PASSWORD=GENEREZ_UN_SECRET_DIFFERENT
JWT_SECRET=GENEREZ_UN_SECRET_DIFFERENT

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=votre-adresse@gmail.com
SMTP_PASSWORD=VOTRE_NOUVEAU_MOT_DE_PASSE_APPLICATION
SMTP_FROM=CampusHub <votre-adresse@gmail.com>
EMAIL_VERIFICATION_TTL_MINUTES=10
EMAIL_VERIFICATION_MAX_ATTEMPTS=5

OPENAI_API_KEY=
```

Générez les trois secrets séparément avec `openssl rand -hex 32` (et `openssl rand -hex 48` pour JWT). Ne copiez jamais les mots de passe locaux ou les clés dans le dépôt.

## 5. Premier démarrage

```bash
cd /opt/campushub/deploy/aws-lightsail
docker compose --env-file .env.runtime up -d --build
docker compose --env-file .env.runtime ps
docker compose --env-file .env.runtime logs -f --tail=100 app
```

Au premier démarrage seulement, MySQL exécute automatiquement les scripts `database/01` à `database/26`. Caddy obtient ensuite le certificat HTTPS. Vérifiez :

```bash
curl -fsS "https://$(grep '^CAMPUSHUB_DOMAIN=' .env.runtime | cut -d= -f2-)/api/v1/sante"
```

## 6. Publier une mise à jour

Avant toute mise à jour, sauvegardez la base :

```bash
cd /opt/campushub/deploy/aws-lightsail
source .env.runtime
docker compose --env-file .env.runtime exec -T mysql \
  mysqldump --single-transaction --routines --triggers -uroot -p"$MYSQL_ROOT_PASSWORD" campushub \
  | gzip > "$HOME/campushub-$(date +%Y%m%d-%H%M%S).sql.gz"
```

Transférez une nouvelle archive comme à l’étape 2, extrayez-la dans `/opt/campushub-next`, recopiez `.env.runtime`, puis :

```bash
cd /opt/campushub-next/deploy/aws-lightsail
cp /opt/campushub/deploy/aws-lightsail/.env.runtime .env.runtime
docker compose -p aws-lightsail --env-file .env.runtime build app
```

Pour cette version, appliquez les migrations 25 et 26 si la base existait déjà :

```bash
source .env.runtime
docker compose -p aws-lightsail --env-file .env.runtime exec -T mysql \
  mysql -uroot -p"$MYSQL_ROOT_PASSWORD" campushub \
  < /opt/campushub-next/database/25_gestion_etudiants_audit.sql
docker compose -p aws-lightsail --env-file .env.runtime exec -T mysql \
  mysql -uroot -p"$MYSQL_ROOT_PASSWORD" campushub \
  < /opt/campushub-next/database/26_abonnement_annuel_unique.sql
```

Remplacez ensuite l’ancien dossier et redémarrez :

```bash
cd /opt
mv campushub campushub-previous
mv campushub-next campushub
cd /opt/campushub/deploy/aws-lightsail
docker compose -p aws-lightsail --env-file .env.runtime up -d --remove-orphans --build
curl -fsS "https://$(grep '^CAMPUSHUB_DOMAIN=' .env.runtime | cut -d= -f2-)/api/v1/sante"
```

Gardez `campushub-previous` jusqu’à la validation visuelle, puis supprimez-le. Les volumes Docker conservent MySQL, les photos et les documents entre les versions.

## 7. Contrôles de sécurité avant la présentation

- révoquer tout mot de passe d’application Gmail déjà partagé et en générer un nouveau ;
- remplacer tous les secrets de développement ;
- vérifier que `.env.runtime` appartient à `ubuntu` avec les permissions `600` ;
- tester l’inscription, le code e-mail, les téléversements, la connexion et la déconnexion en HTTPS ;
- conserver une sauvegarde MySQL et une copie des volumes de téléversements ;
- consulter les erreurs avec `docker compose logs app` et l’audit depuis l’administration CampusHub.
