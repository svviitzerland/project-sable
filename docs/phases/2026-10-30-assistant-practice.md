# Case assistant and courtroom practice — 2026-10-30

## Goal and ownership

User requested a general chatbot with case context, references to evidence and connected law, plus courtroom simulation as either counsel or judge with AI-determined, manually overridable conditions. Implemented on `codex/jude-product-completion` for existing PR #2.

## Delivered

- Separate Case assistant and Courtroom practice tabs with persistent private history and JSON exports.
- Bounded current-case retrieval across documents, testimony, findings, and confirmed connections; explicit reference selection and evidence-inspector handoff.
- Exact quotation validation, inspectable source snapshots/originals, optional Pasal discovery metadata, honest sources-only fallback, retryable atomic exchanges, and duplicate-request protection.
- Trial type, jurisdiction, stage, role, difficulty, language, goals, and assumptions. AI proposals remain editable before starting. AI plays other roles; guided drills remain explicitly scripted. Finish saves a debrief/self-review as appropriate.
- Practice never enters evidence retrieval or mutates testimony/findings. `.jude` remains the case-record format; dialogue exports are separate.
- SQLite models and idempotent PostgreSQL migration 004, including RLS and denial for browser roles.

## Verification and limits

The full backend run passed 50 tests including disposable PostgreSQL 16/pgvector migration idempotency and denial for both browser roles. After adding strict-output schema coverage, the final run passed 50 tests with only that opt-in PostgreSQL check skipped (51 tests total). Ruff, frontend lint, TypeScript, and production build passed. Existing workspace acceptance and the new dialogue acceptance passed in Chromium with no page errors. Backend behavior tests cover offline and mocked-provider contracts, ownership, bad/missing citations, role boundaries, proposal overrides, retries, concurrency, and persistence. Browser checks cover actual sources-only/guided flows, failure recovery, desktop/mobile layouts, and existing workspace regressions. Live OpenRouter/Pasal requests require credentials and were not exercised; mocked contracts do not establish response quality. Hosted Supabase remains unverified.

The working tree contains an unrelated pre-existing change in `be/app/factory.py`; it is excluded. Validation uses an isolated backend copy with the committed factory, so the tested result matches the submitted branch without overwriting local work.

Independent Impeccable finish review returned `ship` with no material fixes across the supplied six desktop/mobile captures and sampled implementation. Targeted detector returned no findings. DESIGN.md records the new patterns while preserving the incumbent system and original landing page.

Generated condition schemas require every field for strict-output provider compatibility; manual request defaults remain editable. This schema contract is covered by a regression test.
