param(
  [int]$Port = 4177,
  [switch]$Smoke,
  [switch]$AgentSmoke,
  [switch]$CodexSmoke,
  [switch]$StartServer
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Write-Step($Text) { Write-Host "[Knowledge Forge] $Text" -ForegroundColor Cyan }
function Write-Ok($Text) { Write-Host "[OK] $Text" -ForegroundColor Green }
function Write-Warn($Text) { Write-Host "[WARN] $Text" -ForegroundColor Yellow }
function Invoke-Health($Url) { Invoke-RestMethod $Url -TimeoutSec 8 }

function Join-CommandArguments([string[]]$Arguments) {
  return ($Arguments | ForEach-Object {
    if ($_ -match '[\s"&|<>^]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
  }) -join ' '
}

function Invoke-CommandCapture($FilePath, [string[]]$Arguments, [string]$WorkingDirectory = $root, [int]$TimeoutSeconds = 120, [string]$Stdin = '') {
  $stdout = Join-Path $env:TEMP ("kf-stdout-$([guid]::NewGuid()).txt")
  $stderr = Join-Path $env:TEMP ("kf-stderr-$([guid]::NewGuid()).txt")
  try {
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $FilePath
    $startInfo.Arguments = Join-CommandArguments $Arguments
    $startInfo.WorkingDirectory = $WorkingDirectory
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.RedirectStandardInput = $true
    $startInfo.CreateNoWindow = $true
    $proc = [System.Diagnostics.Process]::Start($startInfo)
    if ($Stdin) { $proc.StandardInput.Write($Stdin) }
    $proc.StandardInput.Close()
    if (-not $proc.WaitForExit($TimeoutSeconds * 1000)) {
      Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
      throw "Command timed out after $TimeoutSeconds seconds: $FilePath $($Arguments -join ' ')"
    }
    $outText = $proc.StandardOutput.ReadToEnd()
    $errText = $proc.StandardError.ReadToEnd()
    return @{ ExitCode = $proc.ExitCode; Stdout = $outText; Stderr = $errText }
  } finally {
    Remove-Item $stdout, $stderr -Force -ErrorAction SilentlyContinue
  }
}

function Resolve-CodexCommand {
  $cmd = Join-Path $env:APPDATA 'npm\codex.cmd'
  if (Test-Path $cmd) { return $cmd }
  $found = Get-Command codex -ErrorAction SilentlyContinue
  if ($found) { return $found.Source }
  return $null
}

$serverProc = $null
$url = "http://localhost:$Port"
$healthUrl = "$url/api/health"

try {
  Write-Step "Running syntax checks"
  npm run check

  Write-Step "Running required environment doctor"
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\doctor.ps1

  $health = $null
  try {
    $health = Invoke-Health $healthUrl
  } catch {
    if (-not $StartServer) { throw }
    Write-Step "Server is not running. Starting temporary smoke-test server on port $Port"
    $env:PORT = [string]$Port
    $serverProc = Start-Process -FilePath 'node' -ArgumentList 'apps/api/server.js' -WorkingDirectory $root -PassThru -WindowStyle Hidden
    $ready = $false
    for ($i = 0; $i -lt 30; $i += 1) {
      Start-Sleep -Milliseconds 500
      try {
        $health = Invoke-Health $healthUrl
        if ($health.ok) { $ready = $true; break }
      } catch {}
    }
    if (-not $ready) { throw "Server did not become ready at $healthUrl" }
  }

  if (-not $health.ok) { throw "Health returned ok=false" }
  Write-Ok "Health OK: $($health.app)"
  Write-Host "Vault: $($health.vaultPath)"

  $cap = Invoke-RestMethod "$url/api/capabilities" -TimeoutSec 10
  if (-not $cap.ok) { throw "Capabilities endpoint returned ok=false" }
  Write-Ok "Capabilities OK: $(@($cap.capabilities).Count) capability item(s)"

  if ($Smoke) {
    Write-Step "Running end-to-end smoke test"
    $fixtureDir = Join-Path $root 'test-fixtures'
    New-Item -ItemType Directory -Force -Path $fixtureDir | Out-Null
    $fixture = Join-Path $fixtureDir 'verify-smoke.md'
    Set-Content -Path $fixture -Encoding UTF8 -Value @'
# Knowledge Forge Verify Smoke

This is an automated verification document for v0.1.

## Core checks

- Local upload
- Inbox note writing
- Agent pack generation
- Real PDF export
'@

    $uploadScript = @'
import fs from 'node:fs';
const file = process.argv[2];
const form = new FormData();
form.append('file', new Blob([fs.readFileSync(file)]), 'verify-smoke.md');
const out = process.argv[3];
const res = await fetch('http://localhost:4177/api/ingest', { method: 'POST', body: form });
const data = await res.json();
fs.writeFileSync(out, JSON.stringify(data, null, 2), 'utf8');
if (!res.ok || data.ok === false || !data.noteRelativePath || !data.agentPack?.packDir) process.exit(1);
'@
    $uploadScriptPath = Join-Path $env:TEMP 'knowledge-forge-upload-smoke.mjs'
    Set-Content -Path $uploadScriptPath -Encoding UTF8 -Value $uploadScript
    $uploadOut = Join-Path $env:TEMP 'knowledge-forge-upload-smoke.json'
    node $uploadScriptPath $fixture $uploadOut
    $uploadData = Get-Content $uploadOut -Raw -Encoding UTF8 | ConvertFrom-Json
    Write-Ok "Upload OK: $($uploadData.noteRelativePath)"
    Write-Ok "Agent pack OK: $($uploadData.agentPack.chunkCount) chunk(s)"

    $summaryBody = @{
      action = 'summary'
      notePath = $uploadData.noteRelativePath
      writeToInbox = $true
    } | ConvertTo-Json
    $summaryData = Invoke-RestMethod "$url/api/local-forge/generate" -Method POST -ContentType 'application/json' -Body $summaryBody -TimeoutSec 30
    if (-not $summaryData.ok -or -not $summaryData.artifactPath) { throw "Local draft generation failed" }
    Write-Ok "Local draft OK: $($summaryData.artifactPath)"

    $pdfScript = @'
const body = {
  title: 'Knowledge Forge Verify PDF',
  markdown: '# Knowledge Forge Verify PDF\n\n这是一份自动 PDF 导出验证。\n\n- Pandoc\n- Chrome/Edge headless\n',
  sourcePath: 'verify-smoke'
};
const out = process.argv[2];
const res = await fetch('http://localhost:4177/api/pdf/export', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});
const data = await res.json();
await import('node:fs').then(({ writeFileSync }) => writeFileSync(out, JSON.stringify(data, null, 2), 'utf8'));
if (!res.ok || data.ok === false || !data.pdfPath) process.exit(1);
'@
    $pdfScriptPath = Join-Path $env:TEMP 'knowledge-forge-pdf-smoke.mjs'
    Set-Content -Path $pdfScriptPath -Encoding UTF8 -Value $pdfScript
    $pdfOut = Join-Path $env:TEMP 'knowledge-forge-pdf-smoke.json'
    node $pdfScriptPath $pdfOut
    $pdfData = Get-Content $pdfOut -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not (Test-Path $pdfData.pdfPath)) { throw "PDF file was not created: $($pdfData.pdfPath)" }
    if ((Get-Item $pdfData.pdfPath).Length -le 1000) { throw "PDF file is suspiciously small: $($pdfData.pdfPath)" }
    Write-Ok "PDF OK: $($pdfData.pdfRelativePath)"

    $artifacts = Invoke-RestMethod "$url/api/artifacts?limit=20" -TimeoutSec 10
    if (-not $artifacts.ok -or @($artifacts.artifacts).Count -lt 1) { throw "Artifact registry did not return records" }
    Write-Ok "Artifact registry OK"
  }

  if ($AgentSmoke) {
    Write-Step "Running optional local Agent smoke test (OpenClaw preferred, Claude fallback)"
    if (Get-Command openclaw -ErrorAction SilentlyContinue) {
      $agentSessionId = 'knowledge-forge-verify-smoke-' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
      $oldPreference = $ErrorActionPreference
      $ErrorActionPreference = 'Continue'
      $agentRaw = & openclaw agent --local --agent main --session-id $agentSessionId --message "Reply with exactly: KNOWLEDGE_FORGE_AGENT_OK" --timeout 120 --json 2>&1
      $agentExit = $LASTEXITCODE
      $ErrorActionPreference = $oldPreference
      $agentText = ($agentRaw -join "`n")
      if ($agentExit -ne 0) { throw "OpenClaw smoke test exited with code $agentExit" }
      if ($agentText -notmatch 'KNOWLEDGE_FORGE_AGENT_OK') { throw "OpenClaw smoke test did not return expected output" }
      Write-Ok "OpenClaw Agent OK"
    } elseif (Get-Command claude -ErrorAction SilentlyContinue) {
      $claudeRaw = claude --bare --print "Reply with exactly: KNOWLEDGE_FORGE_AGENT_OK"
      if ($claudeRaw -notmatch 'KNOWLEDGE_FORGE_AGENT_OK') { throw "Claude smoke test did not return expected output" }
      Write-Ok "Claude Code OK"
    } else {
      Write-Warn "No local Agent CLI found. Skipping Agent smoke test."
    }
  }


  if ($CodexSmoke) {
    Write-Step "Running optional Codex CLI smoke test"
    $codexCommand = Resolve-CodexCommand
    if ($codexCommand) {
      $version = Invoke-CommandCapture $codexCommand @('--version') $root 30
      if ($version.ExitCode -ne 0) { throw "Codex version check failed: $($version.Stderr)" }
      $codexPrompt = 'Reply with exactly: KNOWLEDGE_FORGE_CODEX_OK'
      $outFile = Join-Path $env:TEMP ("kf-codex-smoke-$([guid]::NewGuid()).txt")
      try {
        $result = Invoke-CommandCapture $codexCommand ([string[]]@('exec', '--skip-git-repo-check', '--sandbox', 'read-only', '--output-last-message', $outFile, '-')) $root 180 $codexPrompt
        $fileOutput = if (Test-Path $outFile) { Get-Content $outFile -Raw -Encoding UTF8 } else { '' }
        $combined = "$fileOutput`n$($result.Stdout)`n$($result.Stderr)"
        if ($result.ExitCode -ne 0 -or $combined -notmatch 'KNOWLEDGE_FORGE_CODEX_OK') {
          throw "Codex smoke test did not return expected output. exit=$($result.ExitCode); output=$($combined.Trim())"
        }
      } finally {
        Remove-Item $outFile -Force -ErrorAction SilentlyContinue
      }
      Write-Ok "Codex CLI OK"
    } else {
      Write-Warn "Codex CLI not found. Skipping optional Codex smoke test."
    }
  }

  Write-Ok "Verify complete. Knowledge Forge is usable."
} finally {
  if ($serverProc -and -not $serverProc.HasExited) {
    Write-Step "Stopping temporary smoke-test server"
    Stop-Process -Id $serverProc.Id -Force -ErrorAction SilentlyContinue
  }
}
