# Jude

An evidence-grounded workspace for hearing preparation, testimony review, and courtroom practice. The existing landing page is at `/`; the authenticated product is at `/workspace`.

Jude uses **Svelte 5, SvelteKit 3, and TypeScript for both frontend and backend**. One Vercel project serves the UI and `/api/v1` API. The complete application lives in `app/`; set the Vercel project's Root Directory to `app`.

An optional **Python voice service** in `voice/` (FastAPI, open-source pyannote models, Docker) keeps one label per recurring voice across recording connections and hearings. Jude works without it.

## Repository layout

| Path | What it is | Deploys to |
|---|---|---|
| `app/` | SvelteKit app: landing page, workspace, `/api/v1`, migrations, tests | Vercel |
| `voice/` | Python voice API: voiceprints, identification, offline diarization | Any Docker host (optional) |
| `compose.yaml` | Local Docker services (`voice`) | — |
| `docs/` | Product spec, architecture, deployment, format, limitations | — |
| `examples/` | Fictional sample case pack | — |

## Run locally

Use Node **24.x** and pnpm 11.25.0:

```bash
cd app
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

To enable voice labels locally, run `cp voice/.env.example voice/.env`, set `VOICE_API_TOKEN`, start `docker compose up --build voice`, and add `VOICE_API_URL=http://localhost:8000` plus the same token to `app/.env.local`. See [voice/README.md](voice/README.md).

Open http://localhost:3000/workspace. Register an account or open a clearly labeled synthetic case. Local SQLite and private original files persist in `app/.data/`. Run one local process; hosted operation uses shared PostgreSQL coordination instead. To continue using an existing local database and originals, set `JUDE_DATA_DIR` to the absolute path of the previous `be/.data` directory. Account hashes, sessions, case tables, and `.jude` version 1 remain compatible.

## Deploy

Import the repository in Vercel, select **SvelteKit**, Root Directory **`app`**, and Node **24.x**. Apply the Supabase migrations and add the private environment variables described in [DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md). Existing databases need `006_typescript_audio.sql` and `007_voiceprints.sql` after 001–005. Host the optional voice container separately and set an HTTPS `VOICE_API_URL`.

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
cd app
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:bundle
pnpm evaluate --predictions evaluation/predictions.fixture.json --fixture --output /tmp/jude-evaluation.json
```

Voice service:

```bash
cd voice
uv run pytest
uv run ruff check . && uv run ruff format --check .
```

With the app running in another terminal:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

Set `CHROMIUM_EXECUTABLE` to an installed Chromium path if needed; `JUDE_TEST_URL` selects another app URL. The TypeScript browser suites cover workspace, landing, conversations/practice, chunked uploads and mocked direct speech rotation. Provider mocks are explicitly test-only.

For PostgreSQL, provision a disposable database named `jude_test*` on a server with pgvector and run `JUDE_TEST_DATABASE_URL=... pnpm test`. This verifies migrations, RLS denial, vectors, shared locks/rates, jobs and cross-connection persistence; it does not emulate hosted Supabase Storage. See [evaluation guidance](app/evaluation/README.md) before interpreting metrics.

## Architecture and boundaries

Server-only modules live in `app/src/lib/server`; Zod validates request and model-output contracts. SvelteKit's `/api/v1/[...path]` endpoint enforces account ownership and delegates to those modules. PostgreSQL migrations run separately, never on hosted cold starts. Private keys are declared in `app/src/env.ts` and never exported to browser environment variables.

The app supports human verification, not determinations of guilt, honesty, credibility, or legal outcomes. Legal search returns discovery metadata and links, not verified statute text. Practice output is hypothetical and never enters the evidence record. See [the product spec](docs/PRODUCT_SPEC.md), [architecture](docs/ARCHITECTURE.md), and [portable format](docs/JUDE_FORMAT.md).
