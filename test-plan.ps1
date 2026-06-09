$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'scripts\test-plan.ps1'
& $script @args
exit $LASTEXITCODE
