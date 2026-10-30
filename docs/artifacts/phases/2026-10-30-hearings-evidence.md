# Hearings, portable cases, and evidence discovery

Delivered on `codex/jude-product-completion` as a continuation of the courtroom product.

## Product changes

- Separate Hearings library and per-hearing transcripts/findings/audio. Legacy statements migrate into an Earlier hearing. New synthetic cases include a dedicated examination.
- Upload/preview/confirm transcripts with native Jude, JSON, CSV, speaker-labeled text, SRT, and VTT parsing. Optional explicit OpenRouter conversion accepts readable PDF/DOCX/unfamiliar text, verifies every proposed statement against source wording, and requires review. Original uploads remain downloadable. Own-transcript evidence is excluded from hearing analysis.
- Version 1 `.jude` case and hearing files. Case archives include private originals, hashes, passages, testimony, findings, review notes, and links; import creates a new owned case with remapped references. Imported findings and links are unreviewed. Archive bounds, path traversal, references, and exact citation validation fail closed.
- Evidence map and connection list, source inspector, manual relationships, suggested/confirmed status, and natural-language questions. OpenRouter embeddings provide candidates; optional structured analysis classifies them with exact source quotes. Confirmed graph neighbors expand retrieval; cited answers cannot refer outside the retrieved case evidence.
- Embedding-model provenance prevents mixing vectors from different models. Default model is `openai/text-embedding-3-small`, 1536 dimensions. Missing providers leave functional keyword retrieval and native transcript import.

## Validation

- 39 backend tests passed, including a disposable PostgreSQL 16/pgvector integration run. All three migrations applied twice; retrieval and browser-role denial passed. Legacy SQLite upgrade preserves testimony and is repeatable.
- Ruff, frontend ESLint, TypeScript, production build, and audio-worklet test passed.
- Chromium browser acceptance passed: registration, simulation, notes/review persistence, document upload/search/original download, case export/import, hearing file review/import, missing-provider conversion/analysis states, graph connection confirmation, natural-language evidence retrieval, isolation, keyboard tabs, mobile navigation and inspector focus, and viewport overflow checks at 1440/1024/390 pixels. No page errors.
- Impeccable detector reported no findings on changed UI targets. Rendered evidence retained under ignored `.impeccable/review/`; independent finish review recorded in the task.

## Practical limits

No live provider credentials were available. Mocked OpenRouter success/failure and citation checks establish application contracts, not real model quality. Hosted Supabase, live Speechmatics, Pasal.id, and OpenRouter still require account-backed validation. Graph construction and archives have documented bounds in `docs/ARCHITECTURE.md` and `docs/JUDE_FORMAT.md`. This remains a single-worker local MVP; the branch is not deployed.
