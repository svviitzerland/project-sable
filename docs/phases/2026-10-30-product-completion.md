# Jude product completion

Branch: `codex/jude-product-completion`, based on `e524d89` from `codex/jude-courtroom-product`. This completes the local MVP checkpoint; it does not merge the marketing branch or deploy a service.

## Delivered

The authenticated `/workspace` flow now runs end to end: case creation, synthetic hearing, four finding statuses, evidence inspection, review drafts and saved notes, filtering, document upload/search/download, manual testimony, speaker labels, connection states, legal discovery path, export, and sign-out/in. The marketing page links to the workspace and its FAQ reflects the actual MVP.

Pipeline regression tests now exercise keyword fallback correctly. Uploads serialize duplicate/quota decisions per case and remove originals after failed insertion. Streamed requests have a real byte limit independent of Content-Length. Embedding vectors reject nonnumeric and nonfinite values. Speech sessions revalidate authorization, including while draining final transcription; the worklet flushes partial PCM before stop.

Case refreshes ignore stale responses, closed mobile navigation is excluded from keyboard traversal, tabs support arrow/Home/End keys, and stacked finding selection focuses the source inspector with a return control. Draft notes survive changing findings or tabs. Clipboard errors remain separate from evidence-loading errors.

Added idempotent Supabase schema/vector/private-bucket setup and a reproducible evaluation CLI with synthetic labels, deliberate failing prediction fixtures, live pipeline mode, and explicit missing-data reporting. App construction is separate from the ASGI entry point so live evaluation cannot initialize a configured production database on import.

## Verification

- Final backend suite: 24 passing with PostgreSQL configured (23 passing plus one skipped in the default local run).
- Disposable PostgreSQL 16 + pgvector integration: passing, including both migrations applied twice, trigger synchronization, schema-qualified cosine operator, case filtering, and `anon` denial. Supabase roles/bucket metadata were emulated; hosted Storage was not exercised.
- Frontend lint, typecheck, and production build: passing.
- Audio worklet regression: passing, including final partial buffer and stopped-capture behavior.
- Chromium acceptance: passing registration, simulation, four statuses, saved/draft notes, reviewed filtering, clipboard failure with preserved source, upload/page search/original download, JSON export, separate case isolation, unavailable AI state, sign-in/out, keyboard tabs, mobile drawer, inspector/back focus, and 1440/1024/390 widths with no horizontal overflow or uncaught page errors.
- Evaluation fixture report correctly exposes intended FP/FN, invalid citation, and failed output; these are harness checks, not model-quality scores.
- Impeccable detector: no findings. Independent finish review: initial mobile/clipboard issues fixed; final disposition ship for the scored fixes. Design documentation updated; pre-existing sidecar drift was left alone.

## Operational limits

Live Speechmatics, OpenRouter, Pasal.id, and hosted Supabase remain unverified without credentials. The application is single-worker; in-memory jobs/events/locks require distributed replacements before horizontal scaling. OCR, multi-user sharing, account recovery, retention automation, and production monitoring are not included. Review provider data handling and perform authorized live integration checks before operational use.

See root README for setup, provider configuration, migration commands, evaluation, browser acceptance, and deployment boundaries. The earlier product handoff remains historical evidence of the starting checkpoint.
