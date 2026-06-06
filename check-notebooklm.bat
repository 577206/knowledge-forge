@echo off
setlocal
cd /d "%~dp0"

if not exist .venv-notebooklm\Scripts\notebooklm.exe (
  echo [NotebookLM] CLI not installed. Run:
  echo python -m venv .venv-notebooklm
  echo .\.venv-notebooklm\Scripts\python.exe -m pip install "notebooklm-py[browser]"
  exit /b 1
)

echo [NotebookLM] CLI version/help check
.\.venv-notebooklm\Scripts\notebooklm.exe --version

echo.
echo [NotebookLM] Auth check
.\.venv-notebooklm\Scripts\notebooklm.exe auth check --test --json

echo.
echo If auth is not OK, run:
echo .\.venv-notebooklm\Scripts\notebooklm.exe login
