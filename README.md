# Jude — evidence-grounded courtroom workspace

Jude helps lawyers inspect relationships between testimony and case evidence in Indonesian criminal proceedings. The introduction lives at `/`; the working product lives at `/workspace`.

Create an account and case, upload authorized documents, upload a hearing transcript or stream audio, inspect source-linked findings, save review notes, and export the record. A synthetic hearing demonstrates all four finding states without provider credentials. It uses authored findings, not AI output.

## Run locally

Requirements: Node.js 22+, pnpm 11.25, Python 3.11+, and uv. Two processes are required:

```bash
cd be
uv sync --frozen
cp .env.example .env
uv run uvicorn app.main:app --env-file .env --reload --port 8000
```

```bash
cd fe
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000/workspace. Choose **Open a synthetic case** for a temporary demo account, or register to sign back in later. Demo accounts cannot be recovered after sign-out. SQLite and original documents persist under `be/.data/`; do not commit that directory. `API_INTERNAL_URL` in `fe/.env.local` controls the backend proxy and must be set before building the frontend.

## What works

- Account sessions, private cases, owner-checked HTTP and WebSocket access.
- PDF, DOCX, TXT, and Markdown ingestion; original downloads; exact source passages; keyword search and optional hybrid retrieval. Limits: 6 MB, 200 PDF pages, 400,000 extracted characters, 40 documents per case. Text-based PDFs only; DOCX uses sections rather than invented page numbers.
- Dedicated hearing library with file previews, native `.jude`/JSON/CSV/TXT/SRT/VTT parsing, and optional OpenRouter conversion of unfamiliar readable layouts. Converted testimony must match source wording; review speaker turns before import. Originals are retained.
- Evidence map with inspectable passages, cited hearing statements, suggested/confirmed connections, manual linking, and natural-language retrieval with cited answers. Only confirmed evidence links expand retrieval.
- Eight-turn synthetic hearing with supported, potential inconsistency, context needed, and insufficient evidence examples.
- Manual transcript capture, progressive analysis states, retry after provider failure, case-specific speaker labels, review notes, filters, and portable `.jude` export/import.
- Speechmatics microphone/prepared-audio integration with diarization, timestamps, confidence, and final-buffer flushing. Voice IDs are not courtroom identities.
- Bounded OpenRouter claim extraction, evidence analysis, independent adversarial review, and synthesis. Exact quotations and required citation relations are validated before publishing a finding. Transcription continues during analysis.
- Pasal.id metadata discovery with links to original legislation. Metadata is not verified legal text.
- Keyboard-accessible tabs and mobile case navigation; finding selection brings the inspector into view on stacked layouts.

## Connect providers

All credentials belong in the backend environment. Never prefix them with `NEXT_PUBLIC_`.

| Capability | Backend configuration |
| --- | --- |
| AI findings, transcript conversion, cited answers and relationship classification | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (must support strict structured output) |
| Embeddings | `OPENROUTER_API_KEY`, `OPENROUTER_EMBEDDING_MODEL` (default `openai/text-embedding-3-small`); model must return 1536 dimensions |
| Live speech | `SPEECHMATICS_API_KEY`, optional `SPEECHMATICS_URL`; Indonesian and English supported |
| Legal discovery | `PASAL_API_KEY` |
| PostgreSQL | `DATABASE_URL` using a backend-only table-owner credential and TLS |
| Private originals | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optional `SUPABASE_STORAGE_BUCKET` |

Use **Find connections** to index existing/imported passages and suggest relationships. Switching embedding models invalidates the old vectors for retrieval until rebuilt. See [the Jude interchange format](docs/JUDE_FORMAT.md) for case archives and hearing templates.

Without OpenRouter, testimony remains saved with analysis unavailable. Embedding failure falls back to labeled keyword search. Without Speechmatics or Pasal, their controls show the missing connection. “Configured” only means configuration is present, not that an external request succeeded.

The browser streams PCM through the backend; Jude does not retain raw audio. Configured providers receive the corresponding audio, extracted evidence, or testimony. Review their own retention settings and terms before processing authorized material.

## Supabase setup

On a new Supabase project, run `be/migrations/001_schema.sql` followed by `002_vectors_and_storage.sql` and `003_hearings_and_evidence.sql` as the backend table owner. The first creates application tables, enables RLS, and revokes browser-role access. The second installs pgvector in `extensions`, synchronizes the 1536-dimensional vector column with embedding JSON, adds an HNSW index, and creates a private `jude-documents` bucket. If pgvector already exists in another schema, reconcile its schema before applying the second migration. The third adds hearings, evidence links, and embedding-model provenance; startup groups legacy testimony into an Earlier hearing. Change the bucket identifier in both SQL and configuration if needed.

Jude uses application-owned sessions, **not Supabase Auth**. There are no browser table policies; `auth.uid()` is not used for case isolation. FastAPI checks ownership using its server-side database credential. Keep that credential and the Storage service key private. For an existing Supabase project, inspect pre-existing Storage policies: a private bucket alone does not revoke unrelated permissive policies. Use a dedicated project/bucket without browser object policies.

Migrations have been tested twice for idempotency against disposable PostgreSQL 16 + pgvector, including vector sync, retrieval, and denial for the `anon` role. Hosted Supabase Storage has not been verified with a real account.

## Checks and evaluation

```bash
cd be
uv run pytest
uv run ruff check .
uv run python -m app.evaluate --predictions evaluation/predictions.fixture.json --fixture --output /tmp/jude-evaluation.json
```

```bash
cd fe
pnpm lint
pnpm typecheck
node --test tests/audio-worklet.test.mjs
pnpm build
```

The evaluation fixture deliberately contains false positives, a missed inconsistency, and an invalid citation so the metrics exercise failure paths. Its scores are **not AI performance**. See `be/evaluation/README.md` for live evaluation and annotation requirements.

Browser acceptance requires both apps running with no provider keys, development mode, and Python Playwright:

```bash
cd fe
uv run --no-project --with playwright python -m playwright install chromium
uv run --no-project --with playwright python tests/acceptance.py
# For an existing system Chromium: CHROMIUM_EXECUTABLE=/usr/bin/chromium ...
```

The script creates a new synthetic test account and case data. It verifies registration/sign-in, simulation, notes/review/filter persistence, document upload/search/download, `.jude` round-trips, hearing upload/preview, evidence discovery, isolation, unavailable-analysis behavior, keyboard navigation, clipboard errors, and responsive layouts. Screenshots go to ignored `.impeccable/review/`.

For the opt-in PostgreSQL test, create a disposable database named `jude_test*`, install pgvector on its server, and set `JUDE_TEST_DATABASE_URL` before running `uv run pytest tests/test_postgres.py`. It emulates Supabase roles and bucket metadata only; it does not test hosted Storage.

## Deployment boundary

This is a verified local MVP, not an operational courtroom deployment. Run **one FastAPI worker**: jobs, event subscriptions, upload locks, and hearing locks are process-local. A restart marks interrupted analysis for retry. Multiple workers/replicas require a durable job queue, shared event transport, and distributed hearing coordination first.

For a controlled hosted trial, set `JUDE_ENV=production` (Secure cookies; demo sign-in and synthetic seeding disabled), exact HTTPS `ALLOWED_ORIGINS`, persistent storage, and a reverse proxy that supports `/api/v1/*` HTTP and WebSocket upgrades. Provider setup and an authorized live-audio test are still required. Configure backups, retention, account recovery, and operational monitoring before handling real proceedings. This branch does not merge or deploy the product.
