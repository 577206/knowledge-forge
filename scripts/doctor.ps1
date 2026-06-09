param(
  [switch]$Json
)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Test-Command($Name) { return [bool](Get-Command $Name -ErrorAction SilentlyContinue) }

function Add-Check($list, $Name, $Ok, $Message, $Fix = '', $Required = $false) {
  $list.Add([pscustomobject]@{
    name = $Name
    ok = [bool]$Ok
    required = [bool]$Required
    message = [string]$Message
    fix = [string]$Fix
  }) | Out-Null
}

function Read-VaultPath {
  $envPath = Join-Path $root '.env.local'
  if (-not (Test-Path $envPath)) { return '' }
  foreach ($line in Get-Content $envPath -Encoding UTF8) {
    if ($line -match '^\s*KF_VAULT_PATH\s*=(.*)$') { return $Matches[1].Trim().Trim('"') }
  }
  return ''
}

$checks = [System.Collections.Generic.List[object]]::new()

$nodeOk = Test-Command node
$nodeVersion = if ($nodeOk) { node -v } else { 'not found' }
$nodeMajor = 0
if ($nodeVersion -match 'v(\d+)') { $nodeMajor = [int]$Matches[1] }
Add-Check $checks 'Node.js 20+' ($nodeOk -and $nodeMajor -ge 20) $nodeVersion 'Install Node.js 20+ from https://nodejs.org/' $true

$npmOk = Test-Command npm
$npmVersion = if ($npmOk) { npm -v } else { 'not found' }
Add-Check $checks 'npm' $npmOk $npmVersion 'Install npm with Node.js' $true

$nodeModulesOk = Test-Path (Join-Path $root 'node_modules')
Add-Check $checks 'Node dependencies' $nodeModulesOk $(if ($nodeModulesOk) { 'node_modules present' } else { 'node_modules missing' }) 'Run .\scripts\setup.ps1 -LocalForge or npm install' $true

$envPath = Join-Path $root '.env.local'
$envExists = Test-Path $envPath
Add-Check $checks '.env.local' $envExists $envPath 'Run .\scripts\configure.ps1 -LocalForge' $true

$vaultPath = Read-VaultPath
$vaultOk = $vaultPath -and (Test-Path $vaultPath)
Add-Check $checks 'Knowledge vault path' $vaultOk $(if ($vaultPath) { $vaultPath } else { 'not configured' }) 'Set KF_VAULT_PATH in .env.local or run .\scripts\configure.ps1' $true

$inboxOk = $false
if ($vaultOk) { $inboxOk = Test-Path (Join-Path $vaultPath 'inbox') }
Add-Check $checks 'Vault inbox directory' $inboxOk $(if ($inboxOk) { Join-Path $vaultPath 'inbox' } else { 'missing' }) 'Create <vault>\inbox or run .\scripts\configure.ps1' $true

$pf86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
$chromePaths = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "$pf86\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$pf86\Microsoft\Edge\Application\msedge.exe"
)
$chromePath = $chromePaths | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
Add-Check $checks 'Chrome/Edge browser' ([bool]$chromePath) $(if ($chromePath) { $chromePath } else { 'not found' }) 'Install Chrome or Edge for PDF export and NotebookLM login' $false

$pandocOk = Test-Command pandoc
$pandocVersion = if ($pandocOk) { (pandoc --version | Select-Object -First 1) } else { 'not found' }
Add-Check $checks 'Pandoc' $pandocOk $pandocVersion 'Install Pandoc for real PDF export: https://pandoc.org/installing.html' $false

$openclawOk = Test-Command openclaw
$openclawVersion = if ($openclawOk) { (openclaw --version 2>$null | Select-Object -First 1) } else { 'not found' }
Add-Check $checks 'OpenClaw CLI' $openclawOk $openclawVersion 'Optional: install/configure OpenClaw for Agent Review Pack' $false

$claudeOk = Test-Command claude
$claudeVersion = if ($claudeOk) { (claude --version 2>$null | Select-Object -First 1) } else { 'not found' }
Add-Check $checks 'Claude Code CLI' $claudeOk $claudeVersion 'Optional: install/configure Claude Code for Agent Review Pack' $false

$codexOk = Test-Command codex
$codexVersion = if ($codexOk) { (codex --version 2>$null | Select-Object -First 1) } else { 'not found' }
Add-Check $checks 'Codex CLI' $codexOk $codexVersion 'Optional: install/configure Codex CLI for Agent Review Pack' $false

$agentOk = $openclawOk -or $claudeOk -or $codexOk
Add-Check $checks 'Any local Agent' $agentOk $(if ($agentOk) { 'Claude Code, OpenClaw, or Codex available' } else { 'no local Agent CLI found' }) 'Install/configure Claude Code, OpenClaw, or Codex for full review generation; local drafts still work as fallback' $false

$obsidianProc = Get-Process Obsidian -ErrorAction SilentlyContinue | Select-Object -First 1
$obsidianCandidates = @(
  "$env:LOCALAPPDATA\Programs\Obsidian\Obsidian.exe",
  "$env:ProgramFiles\Obsidian\Obsidian.exe",
  'D:\11\Obsidian\Obsidian.exe'
)
$obsidianExe = $obsidianCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
$obsidianMessage = if ($obsidianExe) { $obsidianExe } elseif ($obsidianProc -and $obsidianProc.Path) { $obsidianProc.Path } else { 'not found' }
Add-Check $checks 'Obsidian app' ([bool]$obsidianExe -or [bool]$obsidianProc) $obsidianMessage 'Optional: install Obsidian; otherwise use vault folder / Markdown files directly' $false

$pythonOk = Test-Command python
$pythonVersion = if ($pythonOk) { python --version 2>&1 } else { 'not found' }
Add-Check $checks 'Python 3.10+' $pythonOk $pythonVersion 'Optional: install Python if you want NotebookLM Bridge' $false

$notebookLmExe = Join-Path $root '.venv-notebooklm\Scripts\notebooklm.exe'
Add-Check $checks 'NotebookLM CLI' (Test-Path $notebookLmExe) $(if (Test-Path $notebookLmExe) { $notebookLmExe } else { 'not installed' }) 'Optional: run .\scripts\setup.ps1 -NotebookLM' $false

if (Test-Path $notebookLmExe) {
  try {
    $raw = & $notebookLmExe auth check --test --json 2>$null
    $data = $raw | ConvertFrom-Json
    $connected = $data.status -eq 'ok' -and $data.checks.token_fetch -eq $true
    Add-Check $checks 'NotebookLM auth' $connected ($data.status) 'Run notebooklm login in normal Chrome' $false
  } catch {
    Add-Check $checks 'NotebookLM auth' $false 'auth check failed' 'Run notebooklm login in normal Chrome' $false
  }
}

if ($Json) {
  [pscustomobject]@{
    ok = -not [bool]($checks | Where-Object { $_.required -and -not $_.ok })
    checks = $checks
  } | ConvertTo-Json -Depth 6
  exit 0
}

Write-Host "Knowledge Forge Doctor" -ForegroundColor Cyan
Write-Host "Root: $root"
Write-Host ""
foreach ($c in $checks) {
  $mark = if ($c.ok) { 'OK  ' } elseif ($c.required) { 'FAIL' } else { 'WARN' }
  $color = if ($c.ok) { 'Green' } elseif ($c.required) { 'Red' } else { 'Yellow' }
  $scope = if ($c.required) { 'required' } else { 'optional' }
  Write-Host "[$mark] $($c.name) ($scope): $($c.message)" -ForegroundColor $color
  if (-not $c.ok -and $c.fix) { Write-Host "       fix: $($c.fix)" -ForegroundColor DarkYellow }
}

$requiredFailed = @($checks | Where-Object { $_.required -and -not $_.ok })
$optionalFailed = @($checks | Where-Object { -not $_.required -and -not $_.ok })
Write-Host ""
if ($requiredFailed.Count -eq 0) {
  Write-Host "Required checks passed. Local Forge can run on this computer." -ForegroundColor Green
} else {
  Write-Host "$($requiredFailed.Count) required check(s) failed. Run .\scripts\setup.ps1 and .\scripts\configure.ps1." -ForegroundColor Red
  exit 1
}
if ($optionalFailed.Count -gt 0) {
  Write-Host "$($optionalFailed.Count) optional check(s) missing. Related features will show fallback/degraded state instead of pretending to work." -ForegroundColor Yellow
}

exit 0
