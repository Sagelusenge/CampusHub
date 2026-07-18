param(
  [string]$Region = 'eu-west-3',
  [string]$InstanceName = 'campushub-build-week',
  [string]$StaticIpName = 'campushub-build-week-ip'
)

$ErrorActionPreference = 'Stop'
& aws lightsail delete-instance --instance-name $InstanceName --region $Region | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Impossible de supprimer l’instance Lightsail.' }
& aws lightsail release-static-ip --static-ip-name $StaticIpName --region $Region | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Impossible de libérer l’adresse IP statique.' }
Write-Host 'Instance supprimée et adresse IP libérée.'
