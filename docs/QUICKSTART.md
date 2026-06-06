# Quick Start

Knowledge Forge is a local-first ingestion workbench for Obsidian / Markdown vaults.

## Fastest path on Windows

1. Install Node.js 20+.
2. Clone the repo.
3. Double click:

```text
start.bat
```

The first run will ask you to configure `.env.local`:

```text
KF_VAULT_PATH=D:\Your\Obsidian\Vault
```

Then open:

```text
http://localhost:4177
```

Drag in a PDF / Markdown / TXT / Excel / CSV file. Knowledge Forge will write an Obsidian-friendly note into:

```text
<your-vault>/inbox/
```

## CLI style

```powershell
copy .env.example .env.local
notepad .env.local
npm install
npm run dev
```

## Safety model

- Writes only to `inbox/`.
- Does not reorganize your vault automatically.
- Keeps generated notes reviewable.
- Does not require cloud services.
