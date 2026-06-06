param(
  [int]$Port = 4195
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$logDir = Join-Path $root '.agent-logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$outLog = Join-Path $logDir "test-plan-$Port.out.log"
$errLog = Join-Path $logDir "test-plan-$Port.err.log"

function Invoke-Json($Method, $Url, $Body = $null) {
  if ($Body -ne $null) {
    return Invoke-RestMethod -Method $Method -Uri $Url -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 10)
  }
  return Invoke-RestMethod -Method $Method -Uri $Url
}

function Assert-True($Name, $Condition) {
  if (-not $Condition) { throw "ASSERT FAILED: $Name" }
  Write-Host "[PASS] $Name" -ForegroundColor Green
}

Write-Host "[1/8] Syntax check" -ForegroundColor Cyan
npm run check

Write-Host "[2/8] Start API server on port $Port" -ForegroundColor Cyan
$env:PORT = [string]$Port
$proc = Start-Process -FilePath 'node' -ArgumentList 'apps/api/server.js' -WorkingDirectory $root -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru
try {
  $base = "http://localhost:$Port"
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    try {
      $health = Invoke-Json GET "$base/api/health"
      if ($health.ok) { $ready = $true; break }
    } catch { Start-Sleep -Milliseconds 500 }
  }
  Assert-True 'server health ready' $ready

  Write-Host "[3/8] Capabilities" -ForegroundColor Cyan
  $caps = Invoke-Json GET "$base/api/capabilities"
  Assert-True 'capabilities ok' $caps.ok
  Assert-True 'full setup recommended' ($caps.recommendedSetup -eq 'full')
  Assert-True 'final exam capability exists' (@($caps.capabilities | Where-Object { $_.id -eq 'final-exam-review' }).Count -ge 1)

  Write-Host "[3.5/8] Agent quick-start prompt" -ForegroundColor Cyan
  $prompt = Invoke-Json GET "$base/api/agent/quick-start"
  Assert-True 'agent prompt ok' $prompt.ok
  Assert-True 'agent prompt recommends full setup' ($prompt.prompt -match 'Full Setup')

  Write-Host "[4/8] Obsidian status" -ForegroundColor Cyan
  $obs = Invoke-Json GET "$base/api/obsidian/status"
  Assert-True 'obsidian status ok' $obs.ok
  Assert-True 'vault exists' $obs.vaultExists

  Write-Host "[5/8] Inbox source note" -ForegroundColor Cyan
  $inbox = Invoke-Json GET "$base/api/vault/inbox?limit=1"
  Assert-True 'inbox has at least one note' ($inbox.notes.Count -ge 1)
  $notePath = $inbox.notes[0].path

  Write-Host "[6/8] Generate Final Exam Review artifact" -ForegroundColor Cyan
  $final = Invoke-Json POST "$base/api/local-forge/generate" @{ action = 'final-exam-review'; notePath = $notePath; writeToInbox = $true }
  Assert-True 'final exam generate ok' $final.ok
  Assert-True 'final exam artifact path exists' ($final.artifactPath -like 'inbox/*')

  Write-Host "[7/8] Capture pasted NotebookLM output" -ForegroundColor Cyan
  $capture = Invoke-Json POST "$base/api/notebooklm/action" @{
    action = 'capture-paste'
    title = 'Automated Test NotebookLM Capture'
    outputType = 'summary'
    notebookLink = 'https://notebooklm.google.com/test'
    content = '# Test Summary`n- Source-grounded point A`n- Source-grounded point B'
  }
  Assert-True 'notebook capture ok' $capture.ok
  Assert-True 'notebook capture artifact path exists' ($capture.artifactPath -like 'inbox/*')

  Write-Host "[8/8] Artifact registry" -ForegroundColor Cyan
  $artifacts = Invoke-Json GET "$base/api/artifacts?limit=10"
  Assert-True 'artifacts ok' $artifacts.ok
  Assert-True 'artifact registry has test capture' (@($artifacts.artifacts | Where-Object { $_.title -eq 'Automated Test NotebookLM Capture' }).Count -ge 1)

  Write-Host "TEST PLAN PASSED" -ForegroundColor Green
} finally {
  if ($proc -and -not $proc.HasExited) {
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  }
}
