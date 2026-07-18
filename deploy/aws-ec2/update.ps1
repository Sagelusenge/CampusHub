param(
  [string]$Server = '13.63.171.109',
  [string]$KeyPath = "$HOME\Downloads\campushub-production.pem",
  [string]$RemoteDirectory = '/opt/campushub'
)

$ErrorActionPreference = 'Stop'

function Assert-LastExitCode {
  param([string]$Message)
  if ($LASTEXITCODE -ne 0) { throw $Message }
}

if (-not (Test-Path -LiteralPath $KeyPath -PathType Leaf)) {
  throw "Clé SSH introuvable : $KeyPath"
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'Git est requis pour préparer la version à déployer.'
}
if (-not (Get-Command ssh -ErrorAction SilentlyContinue) -or
    -not (Get-Command scp -ErrorAction SilentlyContinue)) {
  throw 'Les clients OpenSSH ssh et scp sont requis.'
}
if ($RemoteDirectory -ne '/opt/campushub') {
  throw 'Par sécurité, ce script déploie uniquement dans /opt/campushub.'
}

$racineProjet = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$statut = & git -C $racineProjet status --porcelain
Assert-LastExitCode 'Impossible de lire l’état Git du projet.'
if ($statut) {
  Write-Warning 'Les modifications non validées ne seront pas déployées. Seul le dernier commit Git sera envoyé.'
}

$identifiant = Get-Date -Format 'yyyyMMdd-HHmmss'
$archiveLocale = Join-Path $env:TEMP "campushub-$identifiant.tar"
$archiveDistant = "/tmp/campushub-$identifiant.tar"
$scriptLocal = Join-Path $env:TEMP "campushub-deploy-$identifiant.sh"
$scriptDistantPath = "/tmp/campushub-deploy-$identifiant.sh"

try {
  & git -C $racineProjet archive --format=tar --output=$archiveLocale HEAD
  Assert-LastExitCode 'Impossible de créer l’archive Git de CampusHub.'

  & scp -i $KeyPath -o StrictHostKeyChecking=accept-new `
    $archiveLocale "ubuntu@${Server}:$archiveDistant"
  Assert-LastExitCode 'Impossible de transférer CampusHub vers le serveur.'

  $scriptDistant = @'
set -euo pipefail
REMOTE_DIRECTORY='__REMOTE_DIRECTORY__'
ARCHIVE='__ARCHIVE__'
NEXT="${REMOTE_DIRECTORY}-next"
PREVIOUS="${REMOTE_DIRECTORY}-previous"
COMPOSE_DIR="${REMOTE_DIRECTORY}/deploy/aws-lightsail"
BACKUP_DIR="${REMOTE_DIRECTORY}-backups"

sudo mkdir -p "$BACKUP_DIR"
sudo chown ubuntu:ubuntu "$BACKUP_DIR"
if [ -f "$COMPOSE_DIR/.env.runtime" ]; then
  cd "$COMPOSE_DIR"
  MYSQL_ROOT_PASSWORD=$(grep '^MYSQL_ROOT_PASSWORD=' .env.runtime | cut -d= -f2-)
  BACKUP_FINAL="$BACKUP_DIR/campushub-$(date +%Y%m%d-%H%M%S).sql.gz"
  BACKUP_TEMP="${BACKUP_FINAL}.tmp"
  if sudo docker compose --env-file .env.runtime exec -T mysql \
      mysqldump --no-tablespaces --single-transaction --routines --triggers \
      -uroot -p"$MYSQL_ROOT_PASSWORD" campushub | gzip > "$BACKUP_TEMP"; then
    mv "$BACKUP_TEMP" "$BACKUP_FINAL"
  else
    rm -f "$BACKUP_TEMP"
    exit 1
  fi
  find "$BACKUP_DIR" -maxdepth 1 -name 'campushub-*.sql.gz' -type f \
    -printf '%T@ %p\n' | sort -nr | tail -n +8 | cut -d' ' -f2- | xargs -r rm -f
fi

sudo rm -rf "$NEXT" "$PREVIOUS"
sudo mkdir -p "$NEXT"
sudo tar -xf "$ARCHIVE" -C "$NEXT"
sudo chown -R ubuntu:ubuntu "$NEXT"
if [ -f "$COMPOSE_DIR/.env.runtime" ]; then
  cp "$COMPOSE_DIR/.env.runtime" "$NEXT/deploy/aws-lightsail/.env.runtime"
else
  echo 'Le fichier .env.runtime du serveur est introuvable.' >&2
  exit 1
fi

cd "$NEXT/deploy/aws-lightsail"
sudo docker compose -p aws-lightsail --env-file .env.runtime build app

sudo mv "$REMOTE_DIRECTORY" "$PREVIOUS"
sudo mv "$NEXT" "$REMOTE_DIRECTORY"
cd "$REMOTE_DIRECTORY/deploy/aws-lightsail"
MYSQL_ROOT_PASSWORD=$(grep '^MYSQL_ROOT_PASSWORD=' .env.runtime | cut -d= -f2-)
for migration in 17_offres_etablissements.sql 18_documents_offres_et_republications.sql; do
  sudo docker compose -p aws-lightsail --env-file .env.runtime exec -T mysql \
    mysql -uroot -p"$MYSQL_ROOT_PASSWORD" campushub \
    < "$REMOTE_DIRECTORY/database/$migration"
done
sudo docker compose -p aws-lightsail --env-file .env.runtime \
  up -d --remove-orphans --force-recreate app caddy

DOMAIN=$(grep '^CAMPUSHUB_DOMAIN=' .env.runtime | cut -d= -f2-)
for attempt in $(seq 1 30); do
  if curl -fsS "https://${DOMAIN}/api/v1/sante" >/dev/null; then
    sudo rm -rf "$PREVIOUS"
    rm -f "$ARCHIVE"
    sudo docker image prune -f >/dev/null
    echo "CampusHub déployé avec succès : https://${DOMAIN}"
    exit 0
  fi
  sleep 4
done

echo 'Le contrôle de santé a échoué. La version précédente reste dans le dossier de secours.' >&2
exit 1
'@
  $scriptDistant = $scriptDistant.Replace('__REMOTE_DIRECTORY__', $RemoteDirectory).Replace('__ARCHIVE__', $archiveDistant)
  $scriptDistant = $scriptDistant.Replace("`r`n", "`n")
  [System.IO.File]::WriteAllText($scriptLocal, $scriptDistant, [System.Text.UTF8Encoding]::new($false))

  & scp -i $KeyPath -o StrictHostKeyChecking=accept-new `
    $scriptLocal "ubuntu@${Server}:$scriptDistantPath"
  Assert-LastExitCode 'Impossible de transférer le script de déploiement.'

  & ssh -i $KeyPath -o StrictHostKeyChecking=accept-new `
    "ubuntu@$Server" "bash $scriptDistantPath"
  $codeDeploiement = $LASTEXITCODE
  & ssh -i $KeyPath -o StrictHostKeyChecking=accept-new `
    "ubuntu@$Server" "rm -f $scriptDistantPath"
  if ($codeDeploiement -ne 0) {
    throw 'Le déploiement distant de CampusHub a échoué.'
  }
} finally {
  Remove-Item -LiteralPath $archiveLocale -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $scriptLocal -Force -ErrorAction SilentlyContinue
}
