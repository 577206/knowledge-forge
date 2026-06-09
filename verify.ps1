$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'scripts\verify.ps1'
& $script @args
exit $LASTEXITCODE
