# NotebookLM MVP Run Log - 2026-06-06

## Goal

Prove the minimal NotebookLM → Agent → Obsidian/KF inbox loop:

```text
login → create notebook → add source → ask question → export answer JSON → write Markdown digest into vault inbox
```

## Environment

- Project: `E:\创作工坊\Knowledge-Forge`
- Python venv: `.venv-notebooklm`
- CLI: `notebooklm-py 0.7.0`
- Auth storage: `C:\Users\Administrator\.notebooklm\profiles\default\storage_state.json` (**ignored; never commit**)

## Auth

```powershell
.\.venv-notebooklm\Scripts\notebooklm.exe login --browser chrome --fresh
.\.venv-notebooklm\Scripts\notebooklm.exe auth check --test --json
```

Validated:

```json
{
  "status": "ok",
  "checks": {
    "storage_exists": true,
    "json_valid": true,
    "cookies_present": true,
    "sid_cookie": true,
    "token_fetch": true
  }
}
```

## NotebookLM operations

Created test notebook:

```text
Knowledge Forge MVP Test
672e87b9-7719-491b-af8c-9b2484687d8c
```

Added public source:

```text
https://en.wikipedia.org/wiki/Knowledge_management
```

Source ID:

```text
49581517-e644-497d-9411-0735dc244f33
```

Asked:

```text
Summarize the core idea of knowledge management in 5 bullet points for an Obsidian note.
```

## Output

Wrote digest to vault inbox:

```text
E:\创作工坊\知识库\LLM-Wiki\inbox\2026-06-06 - NotebookLM Knowledge Management MVP Digest.md
```

Knowledge Forge inbox API sees it:

```text
/api/vault/inbox?limit=5
→ inbox/2026-06-06 - NotebookLM Knowledge Management MVP Digest.md
```

## Caveats

- `notebooklm-py` JSON output may be UTF-16LE in PowerShell redirection; parse with `encoding='utf-16'` or capture binary carefully.
- Playwright bundled Chromium was missing; using `notebooklm login --browser chrome --fresh` worked with system Chrome.
- The login process may open Chrome in the background; bring the `登录 - Google 账号 - Google Chrome` window to foreground if needed.
- Do not publish auth storage or cookies.
