@echo off
setlocal
cd /d "%~dp0"

if not exist node_modules (
  echo [Knowledge Forge] Installing dependencies...
  npm install
  if errorlevel 1 pause & exit /b 1
)

if not defined KF_VAULT_PATH (
  if exist .env.local (
    for /f "usebackq tokens=1,* delims==" %%A in (".env.local") do (
      if /I "%%A"=="KF_VAULT_PATH" set "KF_VAULT_PATH=%%B"
    )
  )
)

if not defined KF_VAULT_PATH (
  echo.
  echo [Knowledge Forge] KF_VAULT_PATH is not configured.
  echo Please edit .env.local and set your Obsidian vault path.
  if not exist .env.local copy .env.example .env.local >nul
  notepad .env.local
  echo.
  echo After saving .env.local, run start.bat again.
  pause
  exit /b 0
)

echo [Knowledge Forge] Vault: %KF_VAULT_PATH%
echo [Knowledge Forge] Starting http://localhost:4177 ...
start "Knowledge Forge" http://localhost:4177
npm run dev
