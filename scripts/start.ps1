param(
  [int]$Port = 4177,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path 'node_modules')) {
  Write-Host "node_modules missing. Running npm install..." -ForegroundColor Cyan
  npm install
}

if (-not (Test-Path '.env.local')) {
  Copy-Item '.env.example' '.env.local'
  Write-Host "Created .env.local. Please configure KF_VAULT_PATH if you use Obsidian." -ForegroundColor Yellow
}

$env:PORT = [string]$Port
$url = "http://localhost:$Port"
Write-Host "Starting Knowledge Forge at $url" -ForegroundColor Cyan
if (-not $NoBrowser) { Start-Process $url }
npm run dev
