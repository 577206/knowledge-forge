---
name: knowledge-forge
description: Use Knowledge Forge to ingest local PDF/Markdown/TXT/Excel/CSV files into an Obsidian-compatible Markdown vault inbox.
---

# Knowledge Forge Skill

Use this skill when the user wants to turn local files into reviewable Obsidian / Markdown notes.

## What Knowledge Forge does

Knowledge Forge is a local-first ingestion workbench:

```text
file upload → parse/analyze → generate Markdown note → write to vault/inbox → review in browser/Obsidian
```

It is intentionally not a fully autonomous organizer. It writes to `inbox/` first so humans can review before moving notes into permanent folders.

## Local project

Default project path:

```text
E:\创作工坊\Knowledge-Forge
```

For other users, clone:

```bash
git clone https://github.com/577206/knowledge-forge.git
cd knowledge-forge
```

## Start

Windows:

```bat
start.bat
```

Manual:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:4177
```

## Configure vault

Use `.env.local`:

```text
KF_VAULT_PATH=D:\Your\Obsidian\Vault
```

## Supported files

- `.pdf`
- `.md` / `.markdown`
- `.txt`
- `.xlsx` / `.xls`
- `.csv`

## Safety rules

- Never write outside the configured vault.
- Default write target is `inbox/` only.
- Do not auto-move or delete notes unless the user explicitly asks.
- Do not commit `.env.local`, uploaded files, or the user vault.

## Recommended workflow

1. Start Knowledge Forge.
2. Ask user for the vault path if not configured.
3. Upload files through the web UI.
4. Review the generated note and candidates.
5. Open in Obsidian for human confirmation.
