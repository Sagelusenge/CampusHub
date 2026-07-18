param(
  [string]$Region = 'eu-west-3',
  [string]$InstanceName = 'campushub-build-week',
  [string]$StaticIpName = 'campushub-build-week-ip',
  [string]$GitRepository = 'https://github.com/Sagelusenge/CampusHub.git',
  [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'

function Invoke-AwsJson {
  param([string[]]$Arguments)
  $sortie = & aws @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) { throw ($sortie -join "`n") }
  return ($sortie -join "`n") | ConvertFrom-Json
}

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw 'AWS CLI v2 est requis.'
}

$null = Invoke-AwsJson @('sts', 'get-caller-identity', '--output', 'json')

$caracteres = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
$aleatoire = -join (1..18 | ForEach-Object { $caracteres[(Get-Random -Maximum $caracteres.Length)] })
$motDePasseDemo = "CH-$aleatoire!7"
$env:CAMPUSHUB_DEMO_PASSWORD = $motDePasseDemo
$dossierBackend = (Resolve-Path (Join-Path $PSScriptRoot '..\..\backend')).Path
Push-Location $dossierBackend
try {
  $hashDemo = & node -e "import('bcryptjs').then(m=>m.hash(process.env.CAMPUSHUB_DEMO_PASSWORD,12)).then(console.log)"
  if ($LASTEXITCODE -ne 0 -or -not $hashDemo) { throw 'Impossible de préparer le mot de passe des comptes de démonstration.' }
} finally {
  Pop-Location
  Remove-Item Env:CAMPUSHUB_DEMO_PASSWORD -ErrorAction SilentlyContinue
}

$ipExistante = & aws lightsail get-static-ip --static-ip-name $StaticIpName --region $Region --query 'staticIp.ipAddress' --output text 2>$null
if ($LASTEXITCODE -ne 0 -or -not $ipExistante -or $ipExistante -eq 'None') {
  & aws lightsail allocate-static-ip --static-ip-name $StaticIpName --region $Region | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Impossible de réserver l’adresse IP statique.' }
  $ipExistante = & aws lightsail get-static-ip --static-ip-name $StaticIpName --region $Region --query 'staticIp.ipAddress' --output text
}

$domaine = ($ipExistante.Trim() -replace '\.', '-') + '.nip.io'
$instance = & aws lightsail get-instance --instance-name $InstanceName --region $Region --query 'instance.name' --output text 2>$null
if ($LASTEXITCODE -ne 0 -or $instance -eq 'None') {
  $bundles = Invoke-AwsJson @('lightsail', 'get-bundles', '--region', $Region, '--include-inactive', '--output', 'json')
  $bundle = $bundles.bundles |
    Where-Object { $_.isActive -and $_.supportedPlatforms -contains 'LINUX_UNIX' -and $_.ramSizeInGb -ge 2 } |
    Sort-Object price |
    Select-Object -First 1
  if (-not $bundle) { throw 'Aucun forfait Lightsail Linux de 2 Go ou plus trouvé.' }

  $blueprints = Invoke-AwsJson @('lightsail', 'get-blueprints', '--region', $Region, '--include-inactive', '--output', 'json')
  $blueprint = $blueprints.blueprints |
    Where-Object { $_.isActive -and $_.platform -eq 'LINUX_UNIX' -and $_.blueprintId -match '^ubuntu_' } |
    Sort-Object version -Descending |
    Select-Object -First 1
  if (-not $blueprint) { throw 'Aucune image Ubuntu Lightsail active trouvée.' }

  $modele = Get-Content -Raw (Join-Path $PSScriptRoot 'bootstrap.sh')
  $modele = $modele.Replace('__DOMAIN__', $domaine).Replace('__REPOSITORY__', $GitRepository).Replace('__BRANCH__', $Branch).Replace('__DEMO_PASSWORD_HASH__', $hashDemo.Trim())
  $fichierTemporaire = Join-Path $env:TEMP "campushub-bootstrap-$([guid]::NewGuid().ToString('N')).sh"
  [System.IO.File]::WriteAllText($fichierTemporaire, $modele, [System.Text.UTF8Encoding]::new($false))
  try {
    & aws lightsail create-instances --instance-names $InstanceName --availability-zone "${Region}a" --blueprint-id $blueprint.blueprintId --bundle-id $bundle.bundleId --user-data "file://$fichierTemporaire" --region $Region | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'La création de l’instance Lightsail a échoué.' }
  } finally {
    Remove-Item -LiteralPath $fichierTemporaire -Force -ErrorAction SilentlyContinue
  }
}

& aws lightsail attach-static-ip --static-ip-name $StaticIpName --instance-name $InstanceName --region $Region | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Impossible d’attacher l’adresse IP statique.' }

& aws lightsail put-instance-public-ports --instance-name $InstanceName --region $Region --port-infos 'fromPort=22,toPort=22,protocol=tcp,cidrs=0.0.0.0/0' 'fromPort=80,toPort=80,protocol=tcp,cidrs=0.0.0.0/0' 'fromPort=443,toPort=443,protocol=tcp,cidrs=0.0.0.0/0' 'fromPort=443,toPort=443,protocol=udp,cidrs=0.0.0.0/0' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Impossible de configurer les ports publics.' }

Write-Host "Instance AWS créée. Domaine de démonstration : https://$domaine"
Write-Host 'Le premier démarrage et le certificat HTTPS peuvent prendre 10 à 15 minutes.'
Write-Host 'Comptes de démonstration :'
Write-Host '  Étudiant    : etudiant@campushub.test'
Write-Host '  Université  : institution@campushub.test'
Write-Host '  Visiteur    : visiteur@campushub.test'
Write-Host "  Mot de passe commun : $motDePasseDemo"
Write-Host 'Conserve ce mot de passe hors du dépôt et transmets-le uniquement aux juges.'
