---
name: notebooklm-obsidian-second-brain
description: Use notebooklm-py, NotebookLM, Obsidian, and an agent workflow to turn source documents into a reviewed second-brain knowledge vault. Applies when users ask to automate NotebookLM, generate study/research artifacts, or write NotebookLM outputs into Obsidian/Markdown.
---

# NotebookLM × Obsidian Second Brain

Use this skill for the workflow:

```text
Capture → Digest → Distill → Apply → Review → Archive
```

NotebookLM is the temporary reading room, Obsidian/Markdown is the long-term vault, and the agent is the controlled organizer.

## Hard boundaries

- `notebooklm-py` is unofficial and uses undocumented Google NotebookLM APIs.
- Never ask the user to paste `storage_state.json`, cookies, Google tokens, or browser session data into chat.
- Never commit `.notebooklm/`, copied `storage_state.json`, `.env`, raw private documents, or generated private vault notes.
- Require explicit user confirmation before uploading private/local documents to NotebookLM.
- Require explicit confirmation before deleting notebooks/sources/artifacts, changing sharing settings, creating public links, or downloading artifacts into a project folder.
- Prefer personal/local workflows. Do not package this as a SaaS that stores other people's Google sessions.

## Install / verify

Project-local venv example:

```powershell
python -m venv .venv-notebooklm
.\.venv-notebooklm\Scripts\python.exe -m pip install -U pip
.\.venv-notebooklm\Scripts\python.exe -m pip install "notebooklm-py[browser]"
.\.venv-notebooklm\Scripts\python.exe -m playwright install chromium
.\.venv-notebooklm\Scripts\notebooklm.exe --help
```

Auth must be performed by the user:

```powershell
.\.venv-notebooklm\Scripts\notebooklm.exe login
.\.venv-notebooklm\Scripts\notebooklm.exe auth check --test --json
```

Treat auth as valid only if JSON contains:

```json
{
  "status": "ok",
  "checks": { "token_fetch": true }
}
```

## Safe CLI commands

Read/status commands are normally safe:

```powershell
notebooklm auth check --test --json
notebooklm list --json
notebooklm status
notebooklm source list
notebooklm artifact list
notebooklm metadata --json
```

Write/external commands require confirmation:

```powershell
notebooklm create "Notebook name"
notebooklm source add "file-or-url"
notebooklm ask -n <notebook_id> "question"
notebooklm generate quiz -n <notebook_id>
notebooklm download quiz -n <notebook_id> --format markdown output.md
```

Avoid shared context in parallel agents. Prefer explicit `-n <notebook_id>` instead of relying on `notebooklm use`.

## Agent workflow

1. Confirm scope:
   - source files / URLs
   - target vault folder
   - allowed outputs
   - forbidden directories/files
   - review criteria
2. Capture:
   - create/select NotebookLM notebook
   - add only approved sources
3. Digest:
   - ask NotebookLM for summaries, questions, key themes, gaps
   - optionally generate flashcards/quizzes/mind maps
4. Distill:
   - do not paste NotebookLM output raw
   - rewrite into durable Markdown: MOC, concept cards, source cards, tasks, open questions
5. Apply:
   - produce study plan / research plan / project handoff / quiz set
6. Review:
   - mark uncertain claims
   - keep source references
   - list what needs human checking
7. Archive:
   - leave raw imports or generated drafts in inbox/staging unless user approves promotion

## Obsidian output pattern

Write to a reviewable inbox/staging area first:

```text
<VAULT>/00_Inbox/
<VAULT>/10_Schoolwork/<Course>/
<VAULT>/20_Research/<Topic>/
<VAULT>/40_Projects/<Project>/AI_Handoff/
```

Each generated note should include:

```markdown
---
type: notebooklm-digest
status: draft
source_tool: notebooklm-py
created: YYYY-MM-DD
review_required: true
---

# Title

## Source scope

## Summary

## Key concepts

## Evidence / citations to verify

## Flashcards or quiz items

## Open questions

## Next actions
```

## MVP acceptance

A minimal successful run means:

- notebooklm CLI installed and `--help` works
- user completed `notebooklm login`
- `auth check --test --json` passes
- one test notebook is created or selected
- one approved source is added
- one question is asked successfully
- one Markdown digest is written into the configured vault inbox/staging folder
- no credentials or private source files are committed
