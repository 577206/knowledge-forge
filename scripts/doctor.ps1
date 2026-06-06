param(
  [switch]$Json
)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Test-Command($Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Add-Check($list, $Name, $Ok, $Message, $Fix = '') {
  $list.Add([pscustomobject]@{
    name = $Name
    ok = [bool]$Ok
    message = $Message
    fix = $Fix
  }) | Out-Null
}

$checks = [System.Collections.Generic.List[object]]::new()

$nodeOk = Test-Command node
$nodeVersion = if ($nodeOk) { node -v } else { '' }
Add-Check $checks 'Node.js' $nodeOk $nodeVersion 'Install Node.js 20+ from https://nodejs.org/'

$npmOk = Test-Command npm
$npmVersion = if ($npmOk) { npm -v } else { '' }
Add-Check $checks 'npm' $npmOk $npmVersion 'Install npm with Node.js'

$pythonOk = Test-Command python
$pythonVersion = if ($pythonOk) { python --version 2>&1 } else { '' }
Add-Check $checks 'Python' $pythonOk $pythonVersion 'Install Python 3.10+ if you want NotebookLM Bridge'

$pf86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
$chromePaths = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "$pf86\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$chromePath = $chromePaths | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
$chromeMessage = if ($chromePath) { $chromePath } else { 'not found' }
Add-Check $checks 'Google Chrome' ([bool]$chromePath) $chromeMessage 'Install Chrome for NotebookLM login'

$envPath = Join-Path $root '.env.local'
$envExists = Test-Path $envPath
$vaultPath = ''
if ($envExists) {
  foreach ($line in Get-Content $envPath -Encoding UTF8) {
    if ($line -match '^\s*KF_VAULT_PATH\s*=(.*)$') { $vaultPath = $Matches[1].Trim() }
  }
}
Add-Check $checks '.env.local' $envExists ($envPath) 'Run .\scripts\configure.ps1'
$vaultMessage = if ($vaultPath) { $vaultPath } else { 'not configured' }
Add-Check $checks 'Obsidian vault path' ($vaultPath -and (Test-Path $vaultPath)) $vaultMessage 'Set KF_VAULT_PATH in .env.local'

$obsidianProc = Get-Process Obsidian -ErrorAction SilentlyContinue | Select-Object -First 1
$obsidianCandidates = @(
  "$env:LOCALAPPDATA\Programs\Obsidian\Obsidian.exe",
  "$env:ProgramFiles\Obsidian\Obsidian.exe",
  'D:\11\Obsidian\Obsidian.exe'
)
$obsidianExe = $obsidianCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
$obsidianMessage = 'not found'
if ($obsidianExe) { $obsidianMessage = $obsidianExe }
elseif ($obsidianProc -and $obsidianProc.Path) { $obsidianMessage = $obsidianProc.Path }
Add-Check $checks 'Obsidian app' ([bool]$obsidianExe -or [bool]$obsidianProc) $obsidianMessage 'Install Obsidian or configure executablePath'

$notebookLmExe = Join-Path $root '.venv-notebooklm\Scripts\notebooklm.exe'
Add-Check $checks 'NotebookLM CLI' (Test-Path $notebookLmExe) ($notebookLmExe) 'Run .\scripts\setup.ps1 -NotebookLM'

if (Test-Path $notebookLmExe) {
  try {
    $raw = & $notebookLmExe auth check --test --json 2>$null
    $data = $raw | ConvertFrom-Json
    $connected = $data.status -eq 'ok' -and $data.checks.token_fetch -eq $true
    Add-Check $checks 'NotebookLM auth' $connected ($data.status) 'Run notebooklm login in normal Chrome'
  } catch {
    Add-Check $checks 'NotebookLM auth' $false 'auth check failed' 'Run notebooklm login in normal Chrome'
  }
}

if ($Json) {
  $checks | ConvertTo-Json -Depth 5
  exit 0
}

Write-Host "Knowledge Forge Doctor" -ForegroundColor Cyan
Write-Host "Root: $root"
Write-Host ""
foreach ($c in $checks) {
  $mark = if ($c.ok) { 'OK ' } else { 'WARN' }
  $color = if ($c.ok) { 'Green' } else { 'Yellow' }
  Write-Host "[$mark] $($c.name): $($c.message)" -ForegroundColor $color
  if (-not $c.ok -and $c.fix) { Write-Host "      fix: $($c.fix)" -ForegroundColor DarkYellow }
}

$failed = @($checks | Where-Object { -not $_.ok })
Write-Host ""
if ($failed.Count -eq 0) {
  Write-Host "All checks passed." -ForegroundColor Green
} else {
  Write-Host "$($failed.Count) check(s) need attention. Local Forge can still run if Node/npm are OK." -ForegroundColor Yellow
}
