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
- Final Exam Review prepares Agent-readable source packs; the formal high-quality output should be produced by a local Agent reading all chunks.
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

> Important: current PowerShell scripts are in the `scripts/` directory.

1. Read `README.md`, `FEATURES.md`, `SETUP.md`, `CONFIGURATION.md`, `TROUBLESHOOTING.md`, `docs/AGENT_TOOLS_AND_SKILLS.md`, and this file.
2. Ask the user which capabilities they want. Recommend Full Setup unless they explicitly want a minimal install.
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
   .\scripts\verify.ps1 -Smoke
   ```

8. Open the UI at:

   ```text
   http://localhost:4177
   ```

9. Explain what is enabled, what is missing, and how to add future capabilities.

## Agent responsibility model

Knowledge Forge should assume the human does **not** want to manually debug environment setup. The Agent should act as:

- installer: checks and installs missing dependencies when safe;
- config writer: creates `.env.local` and `knowledge-forge.config.json` from explicit user choices;
- verifier: runs smoke tests after every setup step;
- explainer: tells the user what is enabled, degraded, or missing;
- guardrail: never uploads private files or commits secrets.

When a dependency is missing, the Agent should not merely say "install X". It should choose one of these paths:

1. **Auto-install if safe and local**: npm packages, Python packages inside local venv, Playwright browsers, optional helper scripts.
2. **Ask before system-level install**: Chrome, Pandoc, Docker Desktop, Obsidian, system package managers, anything needing admin rights.
3. **Graceful degradation**: if PDF export is unavailable, keep Markdown artifact and show the missing dependency clearly.
4. **Verify after install**: run the exact check that proves the feature works.

## Capability dependency matrix

| Capability | Purpose | Required config | Required tools | Verification | If missing |
|---|---|---|---|---|---|
| Local Forge | Upload files, parse into Markdown, write source notes | `.env.local` with `KF_VAULT_PATH` | Node.js, npm dependencies | upload `.md` smoke test → inbox note appears | run `npm install`; ask user for vault path |
| PDF ingestion | Parse PDF into Markdown source note | same as Local Forge | `@opendocsg/pdf2md`; optional future MinerU/marker/PyMuPDF | upload text PDF → source note has extracted text | create placeholder note and mark extraction confidence low |
| DOCX ingestion | Parse Word documents | same as Local Forge | `mammoth` | upload `.docx` → Markdown note | suggest exporting DOCX to PDF/Markdown if encrypted/damaged |
| Excel/CSV ingestion | Profile sheets/fields and business meaning | same as Local Forge | `xlsx` | upload `.xlsx` → sheet/field preview appears | show parse error and ask for clean export |
| Obsidian Bridge | Write/open notes in vault | `KF_VAULT_PATH`; optional Obsidian executable path | Obsidian optional but recommended | inbox file exists; `obsidian://open?vault=...&file=...` works | open folder / copy path fallback |
| Agent Review Pack | Generate formal review/custom outputs from chunks | selected local agent in UI | Claude Code or Codex CLI | smoke test: agent replies; generated review appears in inbox | show exact command/error; suggest switching agent |
| OpenClaw MCP Future | Let OpenClaw call Forge instead of being launched by Forge Web UI | future MCP config | OpenClaw + Forge MCP Server | current OpenClaw session calls `ingest_document/run_custom_agent_task/export_review_pdf` | do not launch OpenClaw from web UI for long chunks; avoid `ENAMETOOLONG` |
| Claude Code Runner | Run Claude Code on agent-packs | Claude Code auth/config | Claude Code CLI | `claude --version`; small prompt test | suggest OpenClaw fallback |
| Codex CLI Runner | Formal Agent generation path and smoke verification | Codex auth/config | Codex CLI | `./verify.ps1 -CodexSmoke`; UI generation writes artifact | use Claude Code fallback if unavailable |
| Final Exam Review | Produce structured study pack | none beyond source pack | Agent Review Pack; inspired by `final-exam-review-skill` | output has overview, knowledge map, P0/P1/P2, Feynman, mistakes, mock questions, flashcards | fall back to local draft and ask for more course context |
| PDF Export | Export full review to real PDF | optional PDF output directory | Pandoc + Chrome/Edge headless; optional future XeLaTeX templates | Markdown → HTML → PDF file in `.knowledge-forge/pdf/` | keep Markdown and show missing dependency |
| NotebookLM Bridge | Deep source-grounded reading | NotebookLM login handled by user | `notebooklm-py` local venv; Chrome | auth check succeeds; manual capture writes artifact | manual mode first; never ask for Google password |
| Graph View | Visualize vault links/concepts | vault path | local indexing code | graph endpoint returns nodes/edges | hide graph or show empty-state |

## Feature quality rules

A checkbox in the UI must mean one of three honest states:

1. **Works now** — clicking it produces a real artifact.
2. **Disabled with reason** — visible but not clickable, with missing dependency shown.
3. **Fallback** — produces a lower-grade artifact and clearly labels it as draft/fallback.

Never show a feature as if it works when it only writes a placeholder. In particular:

- `Summary / Study Guide / Quiz / Flashcards` from `local-rules` are **lightweight fallback drafts**. Formal outputs should go through an Agent; NotebookLM outputs should be treated as optional source-grounded material to capture/rewrite, not as the default automated path.
- `Final Exam Review` is the recommended high-quality path and should use the Agent-readable chunks.
- `PDF` must create a real `.pdf` file, or clearly say which dependency is missing.

## High-quality output strategy

For the best results, Knowledge Forge should use a tiered generation pipeline:

```text
Source file
→ parser creates Markdown source note
→ chunker creates agent-pack with manifest + AGENT_TASK + chunks
→ Agent reads every chunk, not just summary
→ Agent writes full review Markdown with source chunk citations
→ optional PDF exporter renders the Markdown
→ Obsidian inbox receives Markdown + artifact record
→ user reviews before promoting into permanent vault
```

Recommended review structure, aligned with `final-exam-review-skill`:

1. one-sentence overview;
2. core summary;
3. knowledge map / chapter structure;
4. P0/P1/P2 exam points;
5. Feynman-style explanations;
6. formulas / definitions / methods / examples;
7. common mistakes and counter-intuitive points;
8. three-pass review plan;
9. mock questions;
10. flashcards;
11. open questions / needs source review.

Important: every important claim should cite chunk ids, and uncertain claims must be marked `NEEDS_SOURCE_REVIEW` rather than invented.

## Future MCP direction

After v0.1 is stable, Knowledge Forge can become an MCP Server. Candidate tools:

- `ingest_document(file_path)`
- `list_recent_inbox(limit)`
- `search_vault(query)`
- `create_obsidian_note(title, content)`
- `generate_exam_review(source_paths, mode)`
- `export_review_pdf(note_path)`

Do not start MCP before the local v0.1 loop is stable: upload → parse → Obsidian inbox → Agent review → optional PDF → demo.

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


## Smoke checklist for agents

Scripted baseline:

```powershell
.\verify.ps1 -Smoke -StartServer
.\verify.ps1 -AgentSmoke      # optional OpenClaw/Claude invocation
.\verify.ps1 -CodexSmoke      # optional Codex CLI invocation only
```

Manual UI smoke:

1. Upload a safe fixture from `test-fixtures/`.
2. Confirm the source note and `.knowledge-forge/agent-packs/` pack are created.
3. Choose a custom prompt / full review action.
4. Generate with OpenClaw and/or Claude Code from the UI; validate Codex separately with `-CodexSmoke` until a Codex runner is implemented.
5. Export the resulting Markdown to PDF and verify the artifact record.
