param(
  [switch]$Full,
  [switch]$LocalForge,
  [switch]$FinalExamReview,
  [switch]$Obsidian,
  [switch]$NotebookLM
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not ($Full -or $LocalForge -or $FinalExamReview -or $Obsidian -or $NotebookLM)) {
  Write-Host "No capability flags provided. Recommended default: Full Setup." -ForegroundColor Cyan
  $Full = $true
}

if ($Full) {
  $LocalForge = $true
  $FinalExamReview = $true
  $Obsidian = $true
  $NotebookLM = $true
}

Write-Host "Knowledge Forge Setup" -ForegroundColor Cyan
Write-Host "Capabilities: LocalForge=$LocalForge FinalExamReview=$FinalExamReview Obsidian=$Obsidian NotebookLM=$NotebookLM"

if ($LocalForge -or $FinalExamReview -or $Obsidian -or $NotebookLM) {
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm not found. Install Node.js 20+ first."
  }
  Write-Host "Installing Node dependencies..." -ForegroundColor Cyan
  npm install
}

if (-not (Test-Path '.env.local')) {
  Copy-Item '.env.example' '.env.local'
  Write-Host "Created .env.local from .env.example" -ForegroundColor Green
}

if (-not (Test-Path 'knowledge-forge.config.json')) {
  Copy-Item 'knowledge-forge.config.example.json' 'knowledge-forge.config.json'
  Write-Host "Created knowledge-forge.config.json from template" -ForegroundColor Green
}

if ($NotebookLM) {
  if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Python not found. Skipping NotebookLM Python setup. Local Forge still works." -ForegroundColor Yellow
  } else {
    try {
      if (-not (Test-Path '.venv-notebooklm\Scripts\python.exe')) {
        Write-Host "Creating NotebookLM Python venv..." -ForegroundColor Cyan
        python -m venv .venv-notebooklm
      }
      Write-Host "Installing notebooklm-py..." -ForegroundColor Cyan
      .\.venv-notebooklm\Scripts\python.exe -m pip install -U pip
      .\.venv-notebooklm\Scripts\python.exe -m pip install "notebooklm-py[browser]"
      Write-Host "NotebookLM CLI installed. Login is manual: .\.venv-notebooklm\Scripts\notebooklm.exe login --browser chrome --fresh" -ForegroundColor Yellow
    } catch {
      Write-Host "NotebookLM setup failed, but Local Forge still works: $($_.Exception.Message)" -ForegroundColor Yellow
    }
  }
}

Write-Host "Setup complete. Next: .\scripts\configure.ps1 -Full ; .\scripts\start.ps1" -ForegroundColor Green
