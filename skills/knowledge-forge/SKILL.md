---
name: knowledge-forge
description: One-stop Knowledge Forge skill for local-first Obsidian ingestion plus optional NotebookLM automation. Use when users want to upload files into a Markdown/Obsidian vault, build a second-brain workflow, generate summaries/quizzes/flashcards/reports/PDF/audio via NotebookLM, or write reviewed digests back to a vault.
---

# Knowledge Forge One-Stop Skill

Knowledge Forge turns scattered materials into reviewable, durable Markdown knowledge.

```text
Capture → Digest → Distill → Apply → Review → Archive
```

Tool roles:

- **Knowledge Forge**: local upload/review workbench.
- **Obsidian / Markdown vault**: long-term memory.
- **NotebookLM**: optional temporary reading room for source-grounded Q&A and artifacts.
- **Agent**: controlled organizer that writes reviewable notes, not an autonomous vault rewriter.

## Hard safety rules

- Default write target is `inbox/` only.
- Never write outside configured `KF_VAULT_PATH`.
- Never commit `.env.local`, `.uploads/`, vault contents, `.notebooklm/`, `storage_state.json`, cookies, or Google tokens.
- Do not upload private/local documents to NotebookLM without explicit user confirmation.
- Ask before deletes, sharing/public links, permission changes, artifact downloads, or long-running generation.
- Treat `notebooklm-py` as unofficial/fragile. Use it for personal workflows, not credential-hosting SaaS.
- NotebookLM output is draft material. Rewrite and mark uncertainty before promoting to permanent notes.

## Local project

Default path on this machine:

```text
E:\创作工坊\Knowledge-Forge
```

Start:

```powershell
cd /d E:\创作工坊\Knowledge-Forge
start.bat
```

Manual:

```powershell
npm install
npm run dev
```

Open:

```text
http://localhost:4177
```

Configure vault in `.env.local`:

```text
KF_VAULT_PATH=D:\Your\Obsidian\Vault
```

## Mode A — Local Ingestion

Use when the user wants local files converted into Obsidian-friendly notes.

Supported files:

- `.pdf`
- `.md` / `.markdown`
- `.txt`
- `.xlsx` / `.xls`
- `.csv`

Workflow:

1. Confirm vault path and allowed source files.
2. Start Knowledge Forge if needed.
3. Upload through the web UI or `/api/ingest`.
4. Review generated note, frontmatter, summary, field mapping, candidates.
5. Keep output in `inbox/` unless user approves promotion.

Acceptance:

- `GET /api/health` returns ok.
- Upload returns ok.
- Generated note appears in `/api/vault/inbox`.
- User can preview/open the note.

## Mode B — NotebookLM Bridge

Use when the user wants NotebookLM-generated outputs:

- Summary Digest
- Study Guide
- Quiz
- Flashcards
- Mind Map
- Report / PDF
- Audio Overview

### Verify installation/auth

```powershell
.\.venv-notebooklm\Scripts\notebooklm.exe --version
.\check-notebooklm.bat
```

Or:

```powershell
.\.venv-notebooklm\Scripts\notebooklm.exe auth check --test --json
```

Valid auth requires:

```json
{
  "status": "ok",
  "checks": { "token_fetch": true }
}
```

If login is needed:

```powershell
.\.venv-notebooklm\Scripts\notebooklm.exe login --browser chrome --fresh
```

Bring forward the Chrome window titled `登录 - Google 账号 - Google Chrome` if it opens in the background.

### Safe read/status commands

```powershell
notebooklm auth check --test --json
notebooklm list --json
notebooklm status
notebooklm source list
notebooklm artifact list
notebooklm metadata --json
```

### Write/generate commands require confirmation

```powershell
notebooklm create "Notebook name" --json
notebooklm source add -n <notebook_id> "file-or-url" --json
notebooklm ask -n <notebook_id> "question" --json
notebooklm generate quiz -n <notebook_id>
notebooklm generate flashcards -n <notebook_id>
notebooklm generate mind-map -n <notebook_id>
notebooklm generate report -n <notebook_id>
notebooklm download report -n <notebook_id> --format markdown output.md
```

Prefer explicit `-n <notebook_id>` over `notebooklm use`, especially with parallel agents.

## Output action playbooks

### Summary Digest

1. Ask NotebookLM for key themes, source-backed summary, uncertainties.
2. Rewrite into durable Markdown.
3. Include source scope and review checklist.
4. Write to vault `inbox/`.

### Quiz

1. Generate quiz with difficulty if supported.
2. Download as markdown/json when available.
3. Convert into Obsidian practice note.
4. Mark answer key clearly.

### Flashcards

1. Generate flashcards.
2. Convert to Markdown table or callout blocks.
3. Keep source references when possible.

### Mind Map

1. Generate mind map artifact.
2. Download or summarize into outline.
3. Link concepts with Obsidian wikilinks.

### Report / PDF

1. Generate report/slide deck if user confirms.
2. Download to a user-approved path.
3. If PDF is generated, store under vault assets only with permission.
4. Write a companion Markdown note into inbox.

### Audio Overview

1. Generate only after confirmation because it can be slow.
2. Download to approved path.
3. Write transcript/summary note if available.

## Obsidian note template

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

## Practice / quiz / flashcards

## Open questions

## Next actions
```

## First-run checklist

- Node and npm installed.
- Python installed.
- Obsidian vault created.
- `.env.local` has `KF_VAULT_PATH`.
- `npm run dev` works.
- One local file uploaded into inbox.
- Optional: notebooklm auth passes.
- Optional: one public source added to a test notebook.
- Optional: one NotebookLM answer written back to inbox.

## When user asks for “one-click workflow”

Recommend staged automation, not full autopilot:

```text
1. Local upload → inbox note
2. User selects “Send to NotebookLM”
3. User confirms source upload
4. User selects output actions
5. Agent runs notebooklm-py
6. Agent writes drafts to inbox
7. User reviews/promotes
```

Do not skip confirmation gates for private documents or external NotebookLM operations.
