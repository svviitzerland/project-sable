# Jude

An evidence-grounded workspace for hearing preparation, testimony review, and courtroom practice. The existing landing page is at `/`; the authenticated product is at `/workspace`.

Jude uses **Svelte 5, SvelteKit 3, and TypeScript for both frontend and backend** in one Node server (`apps/web`, `@sveltejs/adapter-node`). An optional **Python voice service** (`apps/voice`: FastAPI, open-source pyannote models, Docker) keeps one label per recurring voice across recording connections and hearings. Locally the app runs on SQLite and local files (or any PostgreSQL with pgvector); production runs on AWS (`infra/`).

## Repository layout

```
apps/
  web/                 SvelteKit app (Node server, Dockerfile)
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
db/                    PostgreSQL schema shared by every service
  migrations/          ordered SQL migrations
  migrate.mjs          migration runner (its own Docker image, runs before the web app)
docs/
  product/             product spec, limitations and problems with sources
  engineering/         architecture, deployment, .jude format
  research/            research report, notes and public case sources
  phases/              dated work records
examples/              fictional sample pack and public-record demo pack
infra/
  terraform/           AWS: VPC, EC2, RDS PostgreSQL, S3, ECR, IAM (GitHub OIDC), SSM, backups
  docker/              production Compose stack, Caddyfile, deploy script
.github/workflows/     checks and automatic deploy
compose.yaml           local Docker service for apps/voice
```

## Run locally

Use Node **24.x** and pnpm 11.25.0 (Docker only for the optional voice service or a local PostgreSQL).

```bash
cd apps/web
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000/workspace. Register an account or open the demo case, a clearly labeled public court record (Ferdy Sambo, 796/Pid.B/2022/PN Jkt.Sel; see [`examples/sambo-796-public/`](examples/sambo-796-public/README.md)). By default the app runs a single local SQLite process with files in `apps/web/.data/`. To use PostgreSQL instead, start one with pgvector (for example `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 pgvector/pgvector:pg17`), apply migrations with `cd db && npm ci && DATABASE_URL=... npm run migrate` and set the same `DATABASE_URL` in `.env.local`. Setting `S3_BUCKET` stores originals in S3 through the AWS credential chain.

Voice labels (optional): `cp apps/voice/.env.example apps/voice/.env`, set `VOICE_API_TOKEN`, run `docker compose up --build voice`, and add `VOICE_API_URL=http://localhost:8000` plus the same token to `apps/web/.env.local`. See [apps/voice/README.md](apps/voice/README.md).

## Deploy (AWS)

Production runs on AWS under the codename **project-sable**: one EC2 instance with Docker Compose (Caddy HTTPS, web, voice, PostgreSQL + pgvector), case originals in S3, AI through Amazon Bedrock (Nova Lite screening, Claude Haiku independent review), images in ECR, secrets in SSM. Terraform is in [`infra/terraform`](infra/terraform) and the stack in [`infra/docker`](infra/docker). Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): checks, image build, ECR push, and an SSM-driven deploy through GitHub OIDC (no AWS keys in GitHub). See [infra/README.md](infra/README.md).

## Product

- Authenticated, owner-isolated cases; PDF, DOCX, TXT and Markdown ingestion with original downloads and page provenance.
- Dedicated hearings; reviewed transcript upload, native CSV/TXT/SRT/VTT/JSON/`.jude` parsing, and optional verbatim-checked AI formatting.
- Live microphone/prepared-audio transcription; finalized testimony persists independently of analysis.
- Four-step analysis with an independent reviewer and exact-quotation verification; review notes, speaker labels, search, and review queues.
- Evidence graph, confirmed connections, natural-language search, and optional OpenRouter embeddings (Bedrock deployments use keyword search).
- Case-wide assistant and separate AI courtroom practice: the AI plays the bench, the other side and witnesses from the case record with cited replies, optional coaching notes after each turn, and a cited debrief.
- Portable `.jude` case/hearing archives and separate conversation JSON exports.

Without provider keys, keyword search, manual testimony, source inspection, archive workflows, the bundled public demo case, and sources-only assistant replies work locally. Courtroom practice needs an AI provider and shows an unavailable state without one. Scanned PDFs still require OCR before upload. Provider configuration is not proof of service availability or model quality.

## Sample files

For upload/import practice, use the [fictional Cendana warehouse sample pack](examples/cendana-warehouse/START-HERE.txt). It includes a complete `.jude` case, eight PDF/DOCX/TXT source documents, a hearing in four supported formats, an AI-conversion exercise, and review guidance kept outside the evidence archive. [Download all files](examples/cendana-warehouse-sample-pack.zip) or [import the complete case](examples/cendana-warehouse/Cendana-warehouse-complete.jude).

## Checks

```bash
cd apps/web
pnpm lint
pnpm typecheck
pnpm test
pnpm build
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

Set `CHROMIUM_EXECUTABLE` to an installed Chromium path if needed; `JUDE_TEST_URL` selects another app URL. The TypeScript browser suites cover workspace, landing, conversations/practice, large direct uploads and mocked direct speech rotation. Provider mocks are explicitly test-only.

For PostgreSQL, create a disposable database named `jude_test*` (for example `docker run -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=jude_test -p 55432:5432 pgvector/pgvector:pg17`) and run `JUDE_TEST_DATABASE_URL=postgresql://postgres:pw@127.0.0.1:55432/jude_test pnpm test`. This verifies migrations, RLS denial, vectors, shared locks/rates and cross-connection persistence. See [evaluation guidance](apps/web/evaluation/README.md) before interpreting metrics.

## Architecture and boundaries

Server-only modules live in `apps/web/src/lib/server`; Zod validates request and model-output contracts. SvelteKit's `/api/v1/[...path]` endpoint enforces account ownership and delegates to those modules. PostgreSQL migrations run separately (`scripts/migrate.mjs`), never inside the server. Private keys are declared in `apps/web/src/env.ts` and never exported to browser environment variables.

The app supports human verification, not determinations of guilt, honesty, credibility, or legal outcomes. Legal search returns discovery metadata and links, not verified statute text. Practice output is hypothetical and never enters the evidence record. See [the product spec](docs/product/PRODUCT_SPEC.md), [limitations](docs/product/LIMITATIONS.md), [architecture](docs/engineering/ARCHITECTURE.md), and [portable format](docs/engineering/JUDE_FORMAT.md).
