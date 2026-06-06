param(
  [switch]$Full,
  [switch]$LocalForge,
  [switch]$FinalExamReview,
  [switch]$Obsidian,
  [switch]$NotebookLM,
  [string]$VaultPath,
  [string]$ObsidianExecutable
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not ($Full -or $LocalForge -or $FinalExamReview -or $Obsidian -or $NotebookLM)) {
  $Full = $true
}
if ($Full) { $LocalForge = $true; $FinalExamReview = $true; $Obsidian = $true; $NotebookLM = $true }

if (-not (Test-Path '.env.local')) { Copy-Item '.env.example' '.env.local' }
if (-not (Test-Path 'knowledge-forge.config.json')) { Copy-Item 'knowledge-forge.config.example.json' 'knowledge-forge.config.json' }

if ($Obsidian -and -not $VaultPath) {
  $current = ''
  foreach ($line in Get-Content '.env.local') {
    if ($line -match '^\s*KF_VAULT_PATH\s*=(.*)$') { $current = $Matches[1].Trim() }
  }
  if ($current) {
    $VaultPath = $current
  } else {
    $VaultPath = Read-Host 'Enter your Obsidian vault path (or press Enter to use vault-demo)'
    if (-not $VaultPath) { $VaultPath = Join-Path $root 'vault-demo' }
  }
}

if ($VaultPath) {
  $lines = @()
  $found = $false
  foreach ($line in Get-Content '.env.local') {
    if ($line -match '^\s*KF_VAULT_PATH\s*=') {
      $lines += "KF_VAULT_PATH=$VaultPath"
      $found = $true
    } else {
      $lines += $line
    }
  }
  if (-not $found) { $lines += "KF_VAULT_PATH=$VaultPath" }
  Set-Content -Path '.env.local' -Value $lines -Encoding UTF8
  New-Item -ItemType Directory -Force -Path $VaultPath | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $VaultPath 'inbox') | Out-Null
}

$config = Get-Content 'knowledge-forge.config.json' -Raw | ConvertFrom-Json
$config.features.localForge = [bool]$LocalForge
$config.features.finalExamReview = [bool]$FinalExamReview
$config.features.obsidian = [bool]$Obsidian
$config.features.notebooklm = [bool]$NotebookLM
$config.finalExamReview.enabled = [bool]$FinalExamReview
$config.obsidian.enabled = [bool]$Obsidian
$config.notebooklm.enabled = [bool]$NotebookLM
if ($VaultPath) { $config.obsidian.vaultPath = $VaultPath }
if ($ObsidianExecutable) { $config.obsidian.executablePath = $ObsidianExecutable }
$config | ConvertTo-Json -Depth 10 | Set-Content -Path 'knowledge-forge.config.json' -Encoding UTF8

Write-Host "Configuration updated." -ForegroundColor Green
Write-Host "Features: LocalForge=$LocalForge FinalExamReview=$FinalExamReview Obsidian=$Obsidian NotebookLM=$NotebookLM"
if ($VaultPath) { Write-Host "Vault: $VaultPath" }
