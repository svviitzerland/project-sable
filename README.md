# Jude

An evidence-grounded workspace for hearing preparation, testimony review, and courtroom practice. The existing landing page is at `/`; the authenticated product is at `/workspace`.

Jude uses **Svelte 5, SvelteKit 3, and TypeScript for both frontend and backend** in one Vercel project (`apps/web`). An optional **Python voice service** (`apps/voice`: FastAPI, open-source pyannote models, Docker) keeps one label per recurring voice across recording connections and hearings. Database and file storage run on **Supabase**, locally through the Supabase CLI.

## Repository layout

```
apps/
  web/                 SvelteKit app (Vercel Root Directory: apps/web)
    src/routes/        frontend pages and the /api/v1 endpoint
    src/components/    frontend UI
    src/lib/           browser helpers (audio capture, API client)
    src/lib/server/    backend: API, analysis, storage, voice client
    tests/             Node and Playwright tests
    evaluation/        synthetic analysis evaluation
  voice/               Python voice API (Docker; optional)
    src/jude_voice/    FastAPI service
    tests/             pytest
    evaluation/        speaker-consistency check on real hearing audio
supabase/
  config.toml          Supabase local stack
  migrations/          PostgreSQL schema, applied locally and to hosted projects
docs/
  product/             product spec, limitations and problems with sources
  engineering/         architecture, deployment, .jude format
  research/            research report, notes and public case sources
  phases/              dated work records
examples/              fictional sample case pack
compose.yaml           local Docker service for apps/voice
```

## Run locally

Use Node **24.x**, pnpm 11.25.0, Docker (Docker Desktop or Colima) and the [Supabase CLI](https://supabase.com/docs/guides/local-development).

```bash
supabase start                      # local Postgres + pgvector + Storage, applies supabase/migrations
supabase status -o env              # prints DB_URL, API_URL and SERVICE_ROLE_KEY

cd apps/web
pnpm install --frozen-lockfile
cp .env.example .env.local          # fill the local Supabase block from `supabase status`
pnpm dev
```

Open http://localhost:3000/workspace. Register an account or open a clearly labeled synthetic case. Without the Supabase variables the app falls back to a single local SQLite process with files in `apps/web/.data/`. `supabase db reset` re-applies all migrations to the local database; Studio is at http://127.0.0.1:54323.

Voice labels (optional): `cp apps/voice/.env.example apps/voice/.env`, set `VOICE_API_TOKEN`, run `docker compose up --build voice`, and add `VOICE_API_URL=http://localhost:8000` plus the same token to `apps/web/.env.local`. See [apps/voice/README.md](apps/voice/README.md).

## Deploy

Import the repository in Vercel, select **SvelteKit**, Root Directory **`apps/web`**, and Node **24.x**. Link a hosted Supabase project and push the same migrations (`supabase link` then `supabase db push`, or run `supabase/migrations/*.sql` in order), then add the private environment variables described in [DEPLOY_VERCEL.md](docs/engineering/DEPLOY_VERCEL.md). Host the optional voice container separately and set an HTTPS `VOICE_API_URL`.

Supabase PostgreSQL/private Storage and QStash remain required hosted services. OpenRouter, Speechmatics, and Pasal.id enable their respective features. Recovery can run from QStash's scheduler, so this repository does not impose a per-minute Vercel Cron requirement on Hobby projects. Configure the schedule after deployment using the documented script. No deployment or live-provider verification has been performed without credentials.

## Product

- Authenticated, owner-isolated cases; PDF, DOCX, TXT and Markdown ingestion with original downloads and page provenance.
- Dedicated hearings; reviewed transcript upload, native CSV/TXT/SRT/VTT/JSON/`.jude` parsing, and optional verbatim-checked AI formatting.
- Live microphone/prepared-audio transcription; finalized testimony persists independently of analysis.
- Four-step analysis with an independent reviewer and exact-quotation verification; review notes, speaker labels, search, and review queues.
- Evidence graph, confirmed connections, natural-language search, and optional OpenRouter embeddings.
- Case-wide assistant and separate courtroom practice with editable conditions, role selection, saved exchanges and debriefs.
- Portable `.jude` case/hearing archives and separate conversation JSON exports.

Without provider keys, keyword search, manual testimony, source inspection, archive workflows, the authored synthetic hearing, sources-only assistant replies, and guided practice work locally. Scanned PDFs still require OCR before upload. Provider configuration is not proof of service availability or model quality.

## Sample files

For upload/import practice, use the [fictional Cendana warehouse sample pack](examples/cendana-warehouse/START-HERE.txt). It includes a complete `.jude` case, eight PDF/DOCX/TXT source documents, a hearing in four supported formats, an AI-conversion exercise, and review guidance kept outside the evidence archive. [Download all files](examples/cendana-warehouse-sample-pack.zip) or [import the complete case](examples/cendana-warehouse/Cendana-warehouse-complete.jude).

## Checks

```bash
cd apps/web
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:bundle
pnpm evaluate --predictions evaluation/predictions.fixture.json --fixture --output /tmp/jude-evaluation.json
```

Voice service:

```bash
cd apps/voice
uv run pytest
uv run ruff check . && uv run ruff format --check .
```

With the app running in another terminal:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

Set `CHROMIUM_EXECUTABLE` to an installed Chromium path if needed; `JUDE_TEST_URL` selects another app URL. The TypeScript browser suites cover workspace, landing, conversations/practice, chunked uploads and mocked direct speech rotation. Provider mocks are explicitly test-only.

For PostgreSQL, create a disposable database named `jude_test*` (for example `createdb -h 127.0.0.1 -p 54322 -U postgres jude_test` on the local Supabase stack) and run `JUDE_TEST_DATABASE_URL=... pnpm test`. This verifies migrations, RLS denial, vectors, shared locks/rates, jobs and cross-connection persistence; it does not emulate hosted Supabase Storage. See [evaluation guidance](apps/web/evaluation/README.md) before interpreting metrics.

## Architecture and boundaries

Server-only modules live in `apps/web/src/lib/server`; Zod validates request and model-output contracts. SvelteKit's `/api/v1/[...path]` endpoint enforces account ownership and delegates to those modules. PostgreSQL migrations run separately, never on hosted cold starts. Private keys are declared in `apps/web/src/env.ts` and never exported to browser environment variables.

The app supports human verification, not determinations of guilt, honesty, credibility, or legal outcomes. Legal search returns discovery metadata and links, not verified statute text. Practice output is hypothetical and never enters the evidence record. See [the product spec](docs/product/PRODUCT_SPEC.md), [limitations](docs/product/LIMITATIONS.md), [architecture](docs/engineering/ARCHITECTURE.md), and [portable format](docs/engineering/JUDE_FORMAT.md).
