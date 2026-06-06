# SETUP.md — Knowledge Forge Setup

Knowledge Forge is designed to be installed with the help of an AI agent.

Recommended command on Windows:

```powershell
.\scripts\doctor.ps1
.\scripts\setup.ps1 -Full
.\scripts\configure.ps1 -Full
.\scripts\start.ps1
.\scripts\verify.ps1
```

## Recommended: Full Setup

Full Setup enables the intended learning workflow:

- Local Forge
- Final Exam Review workflow hooks
- Obsidian Bridge
- NotebookLM Bridge dependencies
- Agent-readable configuration

Use:

```powershell
.\scripts\setup.ps1 -Full
```

## Modular setup

You can enable capabilities separately:

```powershell
.\scripts\setup.ps1 -LocalForge
.\scripts\setup.ps1 -LocalForge -FinalExamReview
.\scripts\setup.ps1 -LocalForge -Obsidian
.\scripts\setup.ps1 -NotebookLM
```

You can add missing capabilities later by rerunning setup/configure.

## Requirements

### Required

- Node.js 20+
- npm

### Recommended

- Obsidian
- Python 3.10+
- Google Chrome

### Optional

- Google NotebookLM account
- `notebooklm-py`
- Ollama / DeepSeek / OpenAI-compatible provider for future agent-assisted generation

## Start

```powershell
.\scripts\start.ps1
```

Open:

```text
http://localhost:4177
```

## Verify

```powershell
.\scripts\verify.ps1
```

## What if I only want local mode?

Use:

```powershell
.\scripts\setup.ps1 -LocalForge
.\scripts\configure.ps1 -LocalForge
.\scripts\start.ps1
```

Local mode does not require Google login or Obsidian.

## What if I add Obsidian later?

Set `KF_VAULT_PATH` in `.env.local` or rerun:

```powershell
.\scripts\configure.ps1 -Obsidian
```

## What if I add NotebookLM later?

Run:

```powershell
.\scripts\setup.ps1 -NotebookLM
.\scripts\configure.ps1 -NotebookLM
```

Then complete Google login manually in Chrome. Never give your password to an agent.
