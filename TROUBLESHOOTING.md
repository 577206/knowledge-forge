# TROUBLESHOOTING.md — Knowledge Forge Troubleshooting

## Run the doctor first

```powershell
.\scripts\doctor.ps1
```

## App does not start

Check Node and dependencies:

```powershell
node -v
npm -v
npm install
npm run check
npm run dev
```

Default URL:

```text
http://localhost:4177
```

## Vault path is not configured

Create `.env.local`:

```text
KF_VAULT_PATH=E:\Your\Obsidian\Vault
```

Then restart.

## Obsidian does not open

Try in order:

1. Check if Obsidian is installed.
2. Open your vault manually once.
3. Configure `obsidian.executablePath` in `knowledge-forge.config.json`.
4. Use "open folder" fallback.
5. Copy the generated Markdown path and open it manually.

Knowledge Forge should not rely only on `obsidian://` protocol. Some systems have broken protocol associations.

## NotebookLM login fails

NotebookLM / Google login may fail inside automated browser environments.

Recommended:

1. Use normal Chrome, not a sandboxed automation browser.
2. Complete Google login manually.
3. If passkey fails, choose another login method.
4. Run:

```powershell
.\.venv-notebooklm\Scripts\notebooklm.exe auth check --test --json
```

Success means:

```json
{
  "status": "ok",
  "checks": {
    "token_fetch": true
  }
}
```

## Local summaries feel too shallow

That is expected for `local-rules` output. Local Forge creates draft structure quickly. For deeper source-grounded reading, use NotebookLM Bridge or agent-assisted review.

## Generated files are hard to find

By default generated notes go to:

```text
<your vault>/inbox/
```

Future artifact registry will track every generated output.

## Can I add missing features later?

Yes. Rerun setup/configure with more capability flags. The system is designed to be modular and future-compatible.
