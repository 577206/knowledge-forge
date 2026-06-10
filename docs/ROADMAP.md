# Knowledge Forge Roadmap

> Updated: 2026-06-10
> Purpose: keep the long-term product direction clear without distracting from the short-term OPC packaging deadline.

## Product North Star

Knowledge Forge should become a local-first, agent-first knowledge ingestion and learning workspace.

It should not remain a narrow PDF uploader. The long-term goal is:

```text
Any study / research / project material
→ robust multi-format ingestion
→ source-grounded notes and review packs
→ Obsidian / Markdown vault persistence
→ MCP tools exposed to Claude, Cursor, OpenClaw, and other agents
```

## Short-Term Priority: OPC Packaging, Not Big New Engineering

Before the 2026-06-15 OPC deadline, do **not** open a major Forge v0.2 engineering branch.

Focus on packaging the existing Forge v0.1 capabilities into a competition-ready story:

- target user: university students
- pain point: scattered materials, one-off AI chats, no long-term knowledge retention
- core demo: upload → parse → write Obsidian inbox → generate review/study output → human review
- business framing: AI second brain / exam review / research reading workspace

## Multi-Format Ingestion Roadmap

Forge should support common student and knowledge-worker file formats.

### Tier 0: Already / Near-Term Core

- `.pdf`
- `.md` / `.markdown`
- `.txt`
- `.csv`
- `.xlsx` / `.xls`

### Tier 1: Must Support Next

- `.docx` — Word documents, reports, essays, syllabi, briefs
- `.pptx` — lecture slides, course decks, project presentations

Recommended implementation:

- DOCX: extract paragraphs, headings, tables, footnotes if possible; preserve document structure in Markdown.
- PPTX: extract slide title, bullets, speaker notes, tables, images metadata; preserve slide order and slide numbers.
- Output should include source references like `slide 7`, `heading 2`, `table 3`, etc.

### Tier 2: High-Value Later

- images: `.png`, `.jpg`, `.jpeg`, `.webp` via OCR / VL models
- scanned PDFs via OCR
- web pages / URLs
- audio: `.mp3`, `.wav`, `.m4a` via ASR
- video: `.mp4`, `.mov` via audio extraction + keyframe OCR/VL
- archives: `.zip` batch import

## MCP Server Direction

Knowledge Forge should eventually provide an MCP Server so agents can call it directly.

Initial MCP tools:

```text
ingest_document(path, options)
list_recent_inbox(limit)
search_vault(query, filters)
create_obsidian_note(title, content, metadata)
generate_exam_review(sourceIds, options)
```

Later MCP tools:

```text
extract_citations(sourceId)
generate_flashcards(sourceIds)
generate_quiz(sourceIds)
link_concepts(sourceIds)
open_review_workspace(itemId)
rollback_ingestion(manifestId)
```

## Design Principles

1. Local-first by default. User files should remain on the user's machine unless explicitly exported.
2. Source-grounded output. Notes and study packs should point back to original source locations.
3. Human review before long-term knowledge pollution. Write first to inbox, not permanent wiki structure.
4. Agent-friendly, not agent-dependent. UI should work alone; agents should enhance it through tools/MCP.
5. Format adapters should be modular. Each file type should have its own parser adapter and normalized intermediate representation.

## Suggested Architecture

```text
File Input
  → Format Detector
  → Parser Adapter
      PDF / DOCX / PPTX / XLSX / MD / TXT / OCR / ASR
  → Normalized Source Pack
      text blocks
      tables
      images metadata
      source locations
      document structure
  → Markdown / Obsidian Writer
  → Artifact Registry + Manifest
  → Agent / MCP Tools
```

## OPC Pitch Version

For OPC, describe this future carefully without overclaiming current implementation:

> Current version has already run the core local ingestion → Obsidian inbox workflow. The roadmap expands it into a multi-format student knowledge forge supporting PDF, Word, PowerPoint, Excel, Markdown, web pages, OCR and future MCP integration, allowing one student to turn course materials into a reusable AI second brain.

Do not claim unsupported formats are already fully implemented unless verified by tests.
