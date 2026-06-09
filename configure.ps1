$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'scripts\configure.ps1'
& $script @args
exit $LASTEXITCODE
