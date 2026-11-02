# Jude

Jude is a courtroom copilot for Indonesian criminal defense. It listens to a hearing, transcribes it with speaker labels, and checks every witness statement against the case file (BAP, court documents) with exact quotations, so counsel can see in the moment what is supported, what needs context and what differs from the record. Every finding is a suggestion for human verification, never a judgment of guilt or credibility.

Live: https://18-142-82-108.sslip.io (landing page at `/`, workspace at `/workspace`). The interface is bilingual, Bahasa Indonesia first, with English.

## What it does

- **Cases.** Each account has private cases. A new case starts blank, from a `.jude` archive, or from the public example case.
- **Case documents (Berkas perkara).** PDF, DOCX, TXT and Markdown up to 25 MB and 1,500 pages, with page provenance, search and original downloads. Supreme Court (Direktori Putusan MA) PDFs are cleaned of watermarks and page footers on ingestion.
- **Hearings (Sidang).** Live microphone or prepared audio transcribed by Amazon Transcribe in Indonesian with speaker labels, plus an optional private recording for playback. Transcripts can also be imported (CSV, TXT, SRT, VTT, JSON, `.jude`) or typed in. Speakers are named once, and the optional voice service keeps that name on the same voice across recordings and hearings.
- **Findings.** Each checkable witness statement is compared with the case documents. Results are supported, context needed, insufficient evidence or potential inconsistency, always with verbatim quotes that are verified against the source text. Potential inconsistencies go to an independent reviewer model. Counsel reviews each finding and adds notes.
- **Evidence (Bukti).** Natural-language questions over the case, an evidence map linking hearing statements to document passages, and confirmed connections between documents.
- **Case assistant (Asisten perkara).** Chat about the case with citations to exact passages.
- **Courtroom practice (Latihan sidang).** AI rehearsal grounded in the case material, with coaching and a debrief. Practice never enters the evidence record.
- **Legal references (Rujukan hukum).** Search Indonesian legislation through Pasal.id. Results are links and metadata to verify, not statute text.
- **Settings (Pengaturan).** Edit case details, export the case as `.jude`, forget stored voiceprints, delete the case.

The example case is a real public record: an excerpt of Putusan PN Jakarta Selatan 796/Pid.B/2022/PN Jkt.Sel (Ferdy Sambo) and the transcript of the publicly broadcast hearing of 8 November 2022. Sources, redactions and limits are in [`examples/sambo-796-public/`](examples/sambo-796-public/README.md).

## Repository layout

```
apps/
  web/                 SvelteKit app: frontend and backend in one Node server (Dockerfile)
    src/routes/        pages and the /api/v1 endpoint
    src/components/    UI
    src/lib/           browser helpers (audio capture, Transcribe stream, API client, i18n)
    src/lib/server/    backend: API, analysis, documents, storage, providers
    tests/             Node and Playwright tests
    evaluation/        synthetic analysis evaluation
  voice/               optional Python voice service (FastAPI, pyannote, Docker)
db/                    PostgreSQL schema shared by every service
  migrations/          ordered SQL migrations
  migrate.mjs          migration runner (own Docker image, runs before the web app)
docs/                  product spec and limitations, engineering, research, dated phase records
examples/              public-record demo pack and a fictional upload-practice pack
infra/
  terraform/           AWS: VPC, EC2, RDS PostgreSQL, S3, ECR, IAM (GitHub OIDC), SSM, backups, budgets
  docker/              production Compose stack, Caddyfile, deploy script
.github/workflows/     checks and automatic deploy
compose.yaml           local Docker service for apps/voice
```

## Run locally

Use Node 24.x and pnpm 11.25.0. Docker is only needed for the optional voice service or a local PostgreSQL.

```bash
cd apps/web
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000/workspace, register an account, then choose **Perkara baru → Buka contoh perkara** to open the example case.

By default the app runs as one process on SQLite with files in `apps/web/.data/`. Optional settings in `.env.local`:

| Setting | Enables |
| --- | --- |
| `AI_PROVIDER=bedrock`, `AWS_REGION=ap-southeast-1` | Analysis, assistant and practice through Amazon Bedrock (AWS credential chain) |
| `TRANSCRIBE=1` | Live and prepared-audio transcription through Amazon Transcribe |
| `S3_BUCKET` | Originals and recordings in S3 instead of local files |
| `PASAL_API_KEY` | Legal references through Pasal.id |
| `VOICE_API_URL`, `VOICE_API_TOKEN` | Voice labels across recordings (see [apps/voice/README.md](apps/voice/README.md)) |
| `DATABASE_URL` | PostgreSQL with pgvector instead of SQLite |

For PostgreSQL, start one with pgvector (for example `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 pgvector/pgvector:pg17`), run `cd db && npm ci && DATABASE_URL=... npm run migrate`, and set the same `DATABASE_URL`.

Without any provider, documents, search, imported or typed testimony, manual review, the example case with its saved findings, archives and source-only assistant replies all still work. Courtroom practice needs an AI provider. Scanned PDFs need OCR before upload.

## Deploy (AWS)

Production runs under the codename **project-sable** in ap-southeast-1:

- One EC2 instance with Docker Compose: Caddy (HTTPS), the web app, the voice service and a one-shot migration job.
- Amazon RDS PostgreSQL 17 with verified TLS.
- S3 for originals and recordings, ECR for images, SSM Parameter Store for secrets.
- Amazon Bedrock for analysis (models set by `BEDROCK_MODEL` and `BEDROCK_REVIEW_MODEL`) and Amazon Transcribe for speech.
- AWS Budgets alerts on actual and forecast spend.

Terraform is in [`infra/terraform`](infra/terraform) and the stack in [`infra/docker`](infra/docker). Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): checks, image build, ECR push and a deploy through SSM, authenticated with GitHub OIDC (no AWS keys in GitHub). Details in [infra/README.md](infra/README.md).

## Checks

```bash
cd apps/web
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Browser tests run against a running app without provider keys (leave `PASAL_API_KEY` and `AI_PROVIDER` unset for that server):

```bash
pnpm exec playwright install chromium   # or set CHROMIUM_EXECUTABLE
JUDE_TEST_URL=http://localhost:3000 pnpm test:e2e
```

PostgreSQL tests: create a disposable pgvector database named `jude_test*` and run `JUDE_TEST_DATABASE_URL=postgresql://... pnpm test`.

Voice service:

```bash
cd apps/voice
uv sync && uv run pytest && uv run ruff check .
```

Synthetic evaluation: `pnpm evaluate --predictions evaluation/predictions.fixture.json --fixture --output /tmp/jude-evaluation.json`. Read the [evaluation guidance](apps/web/evaluation/README.md) before interpreting metrics.

## Boundaries

Server-only code lives in `apps/web/src/lib/server`. Zod validates every request and every model output, and the `/api/v1/[...path]` endpoint enforces account ownership. Migrations run before the server starts (`db/migrate.mjs`), never inside it. Provider keys stay on the server and never reach browser environment variables. Voiceprints are biometric: they stay per case, are deletable and never leave in `.jude` exports.

Jude supports human verification. It does not decide guilt, honesty, credibility or legal outcomes. Legal search returns links to verify, not verified law. See the [product spec](docs/product/PRODUCT_SPEC.md), [limitations](docs/product/LIMITATIONS.md), [architecture](docs/engineering/ARCHITECTURE.md) and the [`.jude` format](docs/engineering/JUDE_FORMAT.md).
