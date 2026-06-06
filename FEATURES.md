# FEATURES.md — Knowledge Forge Capability Model

Knowledge Forge is modular, but the recommended path is **Full Setup**.

## Why full setup is recommended

Full setup gives the most powerful learning workflow:

```text
Local Forge
→ Final Exam Review
→ NotebookLM deep reading
→ Obsidian long-term vault
→ Agent-guided review and iteration
```

This is the author's own intended workflow. It is one of the most efficient ways to study in the AI era because each tool does what it is best at:

- **Local Forge** quickly ingests and structures files.
- **Final Exam Review** converts course material into exam-ready plans, checklists, flashcards, and quizzes.
- **NotebookLM** performs source-grounded deep reading and Q&A.
- **Obsidian** stores durable notes, links, and long-term knowledge.
- **Your Agent** installs, configures, troubleshoots, prompts, reviews, and helps you iterate.

Users can still enable only part of the system and add more later. The configuration is designed to be compatible with future modules.

---

## [1] Local Forge

Local document ingestion and draft generation.

### Inputs

- PDF
- Markdown
- TXT
- Excel / CSV

### Outputs

- Summary draft
- Study guide
- Quiz draft
- Flashcards
- Markdown note
- Keywords
- Candidate tags
- Concept candidates
- Obsidian wikilink candidates

### Requirements

- Node.js
- npm dependencies
- No Google login required

### Engine label

```text
local-rules
```

Local output is useful, but it should be marked as draft and reviewed.

---

## [1A] Final Exam Review

Exam-focused workflow. Strongly recommended for students.

Related skill repository:

```text
https://github.com/577206/final-exam-review-skill
```

### Typical use cases

- Final exam preparation
- Course review
- Lecture note consolidation
- Formula / definition sheet generation
- 7-day review plan
- 3-day sprint plan
- Last-minute checklist
- Flashcards and mock quizzes

### Recommended input from user

- Course name
- Exam date
- Syllabus
- Lecture slides / PDFs
- Notes
- Past papers, if available

---

## [2] Obsidian Bridge

Writes generated Markdown into an Obsidian vault.

### Features

- Configure vault path
- Write notes to `inbox/`
- Generate frontmatter
- Preserve source metadata
- Open Obsidian
- Open vault folder
- Copy file path
- Generate wikilink candidates

### Requirements

- Obsidian installed, recommended
- `KF_VAULT_PATH` configured

### Fallback open strategy

```text
obsidian:// protocol
→ configured Obsidian executable
→ open vault folder
→ copy path
```

---

## [3] NotebookLM Bridge

Google NotebookLM integration for deep source-grounded reading.

### Recommended first mode: manual

```text
Knowledge Forge opens NotebookLM
→ user uploads or creates sources manually
→ user generates NotebookLM outputs
→ Knowledge Forge captures / transforms / writes results
```

### Future automatic mode

```text
create notebook
→ upload source
→ ask prompt
→ capture answer
→ write artifact
```

### Requirements

- Google login completed by user
- Python venv
- `notebooklm-py`
- Chrome / browser login support

### Safety

NotebookLM bridge is unofficial. Never share cookies, `storage_state.json`, or auth files.

---

## Agent Intelligence Layer

This is not a separate optional feature. Knowledge Forge assumes the user has an AI agent.

The agent helps with:

- Installing dependencies
- Selecting capabilities
- Generating config
- Running scripts
- Explaining errors
- Guiding NotebookLM login
- Reviewing generated artifacts
- Improving notes and study plans

---

## Future-compatible design

Users may start with one module and later add others:

```text
Local only → add Obsidian → add NotebookLM → add Final Exam Review workflows
```

This should not require reinstalling from scratch. Update config and rerun setup scripts.
