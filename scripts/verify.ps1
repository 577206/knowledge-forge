param(
  [int]$Port = 4177
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Running syntax checks..." -ForegroundColor Cyan
npm run check

$url = "http://localhost:$Port/api/health"
try {
  $health = Invoke-RestMethod $url -TimeoutSec 5
  Write-Host "Health OK: $($health.app)" -ForegroundColor Green
  $health | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Runtime health check failed. Is the server running at http://localhost:$Port ?" -ForegroundColor Yellow
  Write-Host $_.Exception.Message -ForegroundColor Yellow
}

Write-Host "Verify complete." -ForegroundColor Green
