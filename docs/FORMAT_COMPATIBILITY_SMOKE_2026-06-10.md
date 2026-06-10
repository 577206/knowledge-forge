# Knowledge Forge Format Compatibility Smoke Test

> Date: 2026-06-10
> Scope: MCP `ingest_document` + ingestion-core parser coverage

## Summary

Validated Knowledge Forge v0.1 MCP ingestion against multiple file formats using a temporary vault under OpenClaw workspace state.

## Results

| Format | Fixture | Parser | Result |
|---|---|---|---|
| TXT | `sample.txt` | `text` | PASS |
| Markdown | `sample.md` | `text` | PASS |
| CSV | `sample.csv` | `xlsx` | PASS |
| XLSX | `sample.xlsx` | `xlsx` | PASS |
| DOCX | `sample.docx` | `mammoth-docx` | PASS |
| PPTX | `sample.pptx` | `pptx-basic-xml` | PASS |
| PDF | real GAN paper PDF | `pdf2md` | PASS, extracted ~30k chars |

## MCP Tool Coverage

Validated in temporary vault:

- `ingest_document`
- `list_recent_inbox`
- `search_vault`
- `generate_exam_review`
- `generate_flashcards`
- `generate_quiz`
- `link_concepts`

## Bugs Found and Fixed

### 1. Duplicate note overwrite risk

Problem:

When multiple source files had the same basename but different extensions, for example:

```text
sample.txt
sample.md
sample.csv
sample.xlsx
sample.docx
sample.pptx
```

all generated inbox notes initially targeted:

```text
inbox/YYYY-MM-DD - sample.md
```

This could overwrite previous ingestion output.

Fix:

`writeToVault` now creates unique note names with numeric suffixes:

```text
sample.md
sample-2.md
sample-3.md
...
```

### 2. Generated artifact overwrite risk

Problem:

Generated inbox artifacts could also overwrite same-title outputs.

Fix:

`writeInboxArtifact` now also uses unique suffixes.

### 3. Web UI did not advertise PPTX support

Fix:

Updated upload-zone copy and file icon detection to include PPT/PPTX.

## Known Limitations

- PPTX parser is basic. It extracts text from `ppt/slides/slide*.xml`; it does not yet parse images, speaker notes, charts, SmartArt, layout, or embedded media.
- PDF parser works for text-layer PDFs. Scanned/image PDFs still need OCR or a MinerU/marker/PyMuPDF pipeline.
- CSV currently routes through the spreadsheet parser and reports parser as `xlsx`; acceptable for now, but a clearer parser label may be better later.
- Current exam review, flashcards and quiz tools are rules-based fallback outputs, not final LLM/Agent-quality learning products.

## OPC Pitch-Safe Claim

Safe to claim:

> Knowledge Forge v0.1 has verified local ingestion for PDF, DOCX, PPTX, Excel, CSV, Markdown and TXT, writes structured notes to an Obsidian/Markdown inbox, and exposes the workflow through an MCP server for agents.

Do not overclaim:

- full OCR support
- perfect PPT layout understanding
- semantic vector search
- fully automated high-quality exam review without Agent/LLM review
