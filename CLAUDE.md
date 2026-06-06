# Claude Code Usage

Knowledge Forge can also be used from Claude Code as a local project.

## Start

```bash
npm install
npm run dev
```

Open `http://localhost:4177` and drag files into the web UI.

## Configure

Create `.env.local`:

```text
KF_VAULT_PATH=/path/to/your/obsidian-vault
```

## Development guardrails

- Keep the product local-first.
- Write only to `inbox/` by default.
- Do not require cloud model keys for the MVP.
- Do not commit `.env.local`, `.uploads/`, or vault contents.
