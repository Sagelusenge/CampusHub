#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git openssl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME:-$VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

rm -rf /opt/campushub
git clone --depth 1 --branch __BRANCH__ __REPOSITORY__ /opt/campushub
cd /opt/campushub/deploy/aws-lightsail

umask 077
cat > .env.runtime <<EOF
CAMPUSHUB_DOMAIN=__DOMAIN__
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 32)
MYSQL_APP_PASSWORD=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 48)
CAMPUSHUB_IA_TOKEN=$(openssl rand -hex 32)
EOF

docker compose --env-file .env.runtime up -d --build

for tentative in $(seq 1 60); do
  if docker compose --env-file .env.runtime exec -T mysql \
    mysql -ucampushub -p"$(grep '^MYSQL_APP_PASSWORD=' .env.runtime | cut -d= -f2-)" campushub \
    -Nse "SELECT COUNT(*) FROM utilisateurs" >/dev/null 2>&1; then
    break
  fi
  sleep 5
done

MYSQL_APP_PASSWORD=$(grep '^MYSQL_APP_PASSWORD=' .env.runtime | cut -d= -f2-)
docker compose --env-file .env.runtime exec -T mysql \
  mysql -ucampushub -p"$MYSQL_APP_PASSWORD" campushub <<'SQL'
UPDATE utilisateurs
SET mot_de_passe_hash = '__DEMO_PASSWORD_HASH__', statut_compte = 'ACTIF'
WHERE email IN ('etudiant@campushub.test', 'institution@campushub.test');

INSERT INTO utilisateurs
  (id, code_utilisateur, email, mot_de_passe_hash, role, statut_compte,
   statut_verification, nom_affichage, pays, ville, province, date_verification_email)
SELECT 0, '', 'visiteur@campushub.test', '__DEMO_PASSWORD_HASH__', 'VISITEUR', 'ACTIF',
       'NON_VERIFIE', 'Visiteur de démonstration', 'République démocratique du Congo',
       'Goma', 'Nord-Kivu', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM utilisateurs WHERE email = 'visiteur@campushub.test');
SQL

docker image prune -f
