# CONFIGURATION.md — Knowledge Forge Configuration

Knowledge Forge uses local configuration files. Do not commit personal config.

## Files

```text
.env.example                         committed template
.env.local                           local private env, ignored
knowledge-forge.config.example.json  committed template
knowledge-forge.config.json          local private config, ignored
```

## Environment variables

### KF_VAULT_PATH

Path to your Obsidian vault or Markdown knowledge vault.

Windows example:

```text
KF_VAULT_PATH=E:\Knowledge\MyVault
```

macOS/Linux example:

```text
KF_VAULT_PATH=/Users/you/Documents/MyVault
```

If this is not set, Knowledge Forge uses a local demo vault.

## Config JSON

Copy:

```text
knowledge-forge.config.example.json → knowledge-forge.config.json
```

Important sections:

- `features`: which capabilities are enabled
- `agent`: Agent-first assumptions and setup guide
- `localForge`: parser and action settings
- `finalExamReview`: exam workflow metadata
- `obsidian`: vault and executable settings
- `notebooklm`: bridge settings
- `artifacts`: generated output registry settings

## Recommended full setup config

Use full setup if you want the intended workflow:

```text
Local Forge + Final Exam Review + Obsidian + NotebookLM + Agent guidance
```

## Privacy and safety

Never commit:

- `.env.local`
- `.env`
- `knowledge-forge.config.json`
- `.notebooklm/`
- `storage_state.json`
- Google cookies
- uploads
- personal vault content

## Adding capabilities later

Capabilities are additive. You can start local-only and later add Obsidian or NotebookLM by updating config and rerunning setup.
