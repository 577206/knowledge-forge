$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'scripts\setup.ps1'
& $script @args
exit $LASTEXITCODE
