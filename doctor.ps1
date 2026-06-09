$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'scripts\doctor.ps1'
& $script @args
exit $LASTEXITCODE
