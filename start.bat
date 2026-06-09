@echo off
setlocal
cd /d "%~dp0"

echo [Knowledge Forge] Starting quick setup...

where node >nul 2>nul
if errorlevel 1 (
  echo [Knowledge Forge] Node.js is required. Please install Node.js 20+ from https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [Knowledge Forge] npm is required. Please reinstall Node.js with npm.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [Knowledge Forge] Installing dependencies...
  npm install
  if errorlevel 1 pause & exit /b 1
)

if not exist .env.local (
  echo [Knowledge Forge] Creating .env.local with vault-demo...
  copy .env.example .env.local >nul
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=(Resolve-Path '.\\vault-demo').Path; (Get-Content '.env.local') -replace '^KF_VAULT_PATH=.*', ('KF_VAULT_PATH=' + $p) | Set-Content '.env.local' -Encoding UTF8; New-Item -ItemType Directory -Force -Path (Join-Path $p 'inbox') | Out-Null"
)

if not exist knowledge-forge.config.json (
  copy knowledge-forge.config.example.json knowledge-forge.config.json >nul
)

echo [Knowledge Forge] Running doctor...
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\doctor.ps1

echo [Knowledge Forge] Starting http://localhost:4177 ...
start "Knowledge Forge" http://localhost:4177
npm run dev
