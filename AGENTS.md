# AGENTS.md — Knowledge Forge Agent Setup Guide

You are helping a user install, configure, run, or extend **Knowledge Forge**.

Knowledge Forge is an **Agent-first local knowledge ingestion and study workspace**. It combines Local Forge, Obsidian, Google NotebookLM, and optional study workflows into a modular system designed to be operated with an AI agent such as Claude Code, OpenClaw, Cursor, Codex, Qwen Code, or Gemini CLI.

## Product philosophy

Knowledge Forge is not just a file uploader. It is a workflow layer for AI-era learning:

```text
messy sources
→ local ingestion
→ optional NotebookLM deep reading
→ Obsidian / Markdown vault
→ agent-assisted review
→ durable second brain
```

The recommended experience is **full setup** because the strongest workflow is:

```text
Local Forge + Final Exam Review + Obsidian Bridge + NotebookLM Bridge + Agent guidance
```

However, capabilities are modular. Users may start with Local Forge and add Obsidian or NotebookLM later through compatible configuration interfaces.

## First thing to ask the user

Ask which capabilities they want to enable. Recommend full setup, then offer modular choices:

```text
Recommended: Full Setup
- Local document ingestion
- Final exam review workflow
- Obsidian vault writing
- NotebookLM deep reading bridge
- Agent-guided troubleshooting and review

Or choose modules:
[1] Local Forge only
[2] Local Forge + Final Exam Review
[3] Add Obsidian Bridge
[4] Add NotebookLM Bridge
[5] Full Setup
```

Explain the benefit of full setup:

- Local Forge handles fast ingestion and draft generation.
- Final Exam Review turns course materials into study plans, flashcards, quizzes, and exam checklists.
- Obsidian preserves results as a long-term second brain.
- NotebookLM provides stronger source-grounded reading, summaries, and Q&A.
- The user’s agent coordinates setup, prompts, review, and troubleshooting.

## Never do these

- Do not ask for the user's Google password.
- Do not commit `.env.local`, `.env`, NotebookLM auth storage, cookies, uploads, or vault contents.
- Do not upload Google cookies, `storage_state.json`, `.notebooklm/`, or private study files anywhere.
- Do not pretend Local Rules output is deep AI understanding. Mark it as a draft.
- Do not force NotebookLM setup if the user only wants local mode.

## Recommended setup flow

1. Read `README.md`, `FEATURES.md`, and this file.
2. Ask the user which capabilities they want.
3. Run environment check:

   ```powershell
   .\scripts\doctor.ps1
   ```

4. Run setup with selected capability flags, or full setup:

   ```powershell
   .\scripts\setup.ps1 -Full
   ```

5. Generate or update local configuration:

   ```powershell
   .\scripts\configure.ps1 -Full
   ```

6. Start the app:

   ```powershell
   .\scripts\start.ps1
   ```

7. Verify runtime:

   ```powershell
   .\scripts\verify.ps1
   ```

8. Open the UI at:

   ```text
   http://localhost:4177
   ```

9. Explain what is enabled, what is missing, and how to add future capabilities.

## Capability notes

### Local Forge

Base local ingestion module. Supports PDF, Markdown, TXT, Excel, and CSV ingestion. It creates draft notes and artifacts. No Google login required.

### Final Exam Review

Recommended study workflow for exam preparation. It is inspired by / compatible with:

```text
https://github.com/577206/final-exam-review-skill
```

Use it when the user says they are preparing for exams, reviewing courses, organizing lecture notes, or building flashcards.

### Obsidian Bridge

Writes generated Markdown into an Obsidian vault, usually `inbox/`. Requires `KF_VAULT_PATH`. Use fallback open methods: Obsidian protocol → executable path → open folder → copy path.

### NotebookLM Bridge

Optional Google NotebookLM bridge. Requires user-completed Google login and `notebooklm-py`. It can be used in manual mode first, then automated mode later.

Manual mode is recommended for reliability:

```text
Open NotebookLM → user uploads/generates → Knowledge Forge captures/transforms/writes to Obsidian
```

### Agent Intelligence Layer

This is assumed by default. The user’s agent is the installer, guide, troubleshooter, and learning workflow operator.

## Development guardrails

- Keep the system local-first.
- Keep modules composable.
- Write generated knowledge to `inbox/` by default.
- Maintain artifact records whenever possible.
- Clearly label generation engine: `local-rules`, `notebooklm`, `agent-assisted`, etc.
- Prefer stable fallback workflows over fragile full browser automation.
