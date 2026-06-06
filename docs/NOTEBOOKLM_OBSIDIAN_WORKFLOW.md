# NotebookLM × Obsidian Workflow

This document summarizes the personal second-brain workflow inspired by Felix's NotebookLM × Claude Code × Obsidian guide.

## Tool roles

- **NotebookLM**: temporary reading room for source-grounded Q&A, summaries, quizzes, flashcards, mind maps, and audio/video overviews.
- **notebooklm-py**: unofficial CLI/Python automation bridge for NotebookLM.
- **Obsidian / Markdown vault**: long-term knowledge store.
- **Agent**: controlled organizer that transforms NotebookLM drafts into durable notes.

## Core flow

```text
Capture → Digest → Distill → Apply → Review → Archive
```

1. Capture source documents into NotebookLM or Knowledge Forge inbox.
2. Digest with NotebookLM: summaries, Q&A, quiz/flashcards, mind map.
3. Distill with the agent: concept cards, MOCs, source cards, links, open questions.
4. Apply: study plan, research plan, project handoff, task list.
5. Review: mark uncertainty and verify important claims.
6. Archive/promote only after human confirmation.

## notebooklm-py setup

```powershell
python -m venv .venv-notebooklm
.\.venv-notebooklm\Scripts\python.exe -m pip install -U pip
.\.venv-notebooklm\Scripts\python.exe -m pip install "notebooklm-py[browser]"
.\.venv-notebooklm\Scripts\python.exe -m playwright install chromium
.\.venv-notebooklm\Scripts\notebooklm.exe login
.\.venv-notebooklm\Scripts\notebooklm.exe auth check --test --json
```

Valid auth requires `status=ok` and `checks.token_fetch=true`.

## Safety

`notebooklm-py` is unofficial and uses undocumented Google APIs. Do not publish cookies, `storage_state.json`, `.notebooklm/`, `.env`, or private source materials.

## Knowledge Forge integration idea

Knowledge Forge should remain the local-first upload/review UI. NotebookLM automation can be an optional advanced bridge:

```text
Knowledge Forge inbox/source folder
→ user-approved NotebookLM notebook/source upload
→ NotebookLM digest/artifacts
→ agent-reviewed Markdown notes
→ Obsidian inbox/staging
```

Do not make NotebookLM login mandatory for the base Knowledge Forge MVP.
