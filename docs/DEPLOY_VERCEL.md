# Deploy both Jude applications on Vercel

Both application servers run on Vercel: a SvelteKit project rooted at `fe` and a FastAPI project rooted at `be`. Supabase holds PostgreSQL/pgvector, private documents, upload parts, and temporary downloads. QStash delivers signed analysis requests to the backend function; no continuously running worker or separate API host is required.

This is deployment preparation, not a record of a live deployment. Local tests cover shared PostgreSQL coordination and mocked queue/storage/speech contracts. Actual Vercel, QStash, Supabase Storage, and provider traffic still require a configured deployment check.

## 1. Provision durable services

Use an isolated Supabase project for each environment. Run `be/migrations/001_schema.sql` through `005_vercel_runtime.sql`, in order, using the database owner. Migration 002 creates the private `jude-documents` bucket; 005 adds jobs, leases, notifications, limits, connection tickets, and transfer metadata. All runtime tables deny direct browser access. Existing Storage policies must not grant public/browser access to this bucket.

Use Supabase's PostgreSQL session-pooler connection string with TLS (or its direct connection when reachable). Backend sessions use SQLAlchemy NullPool on Vercel to avoid a separate idle connection pool in every function instance. Credentials must permit the backend's application-owned sessions and data access; Jude does not use Supabase Auth.

Create QStash credentials and choose a plan that supports a 240-second delivery timeout. The committed recovery cron runs every minute and therefore requires a Vercel plan supporting that frequency (for example Pro). Recovery redelivers unsent/stale jobs and cleans expired upload/download objects. Do not remove recovery without replacing it with an authenticated scheduler: that would leave a crash between saving a job and dispatching it unrecovered. Cron runs on the production deployment; previews need their own isolated scheduler if recovery is being exercised there.

## 2. Backend Vercel project

Import the repository and select the branch containing PR #2 (`codex/jude-product-completion`). Set Root Directory to `be`, Framework to FastAPI, and Python to 3.12. Leave Build and Output overrides unset. `app/main.py:app` is the entrypoint; `be/vercel.json` sets a 300-second function duration and the recovery cron. No Uvicorn start command is needed on Vercel.

Use a stable backend project/custom domain. Configure these environment variables:

```dotenv
JUDE_RUNTIME=vercel
JUDE_ENV=production
JUDE_DATA_DIR=/tmp/jude
JUDE_BACKEND_URL=https://jude-api.example.com
ALLOWED_ORIGINS=https://jude.example.com
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/postgres?sslmode=require
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=REPLACE_IN_VERCEL
SUPABASE_STORAGE_BUCKET=jude-documents
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=REPLACE_IN_VERCEL
QSTASH_CURRENT_SIGNING_KEY=REPLACE_IN_VERCEL
QSTASH_NEXT_SIGNING_KEY=REPLACE_IN_VERCEL
CRON_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
OPENROUTER_API_KEY=REPLACE_IN_VERCEL
OPENROUTER_MODEL=YOUR_STRICT_JSON_SCHEMA_MODEL_ID
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small
SPEECHMATICS_API_KEY=OPTIONAL
SPEECHMATICS_URL=wss://eu.rt.speechmatics.com/v2
PASAL_API_KEY=OPTIONAL
```

Use the QStash API base URL from its console if your account uses a regional endpoint. URL values are origins without trailing slashes. `ALLOWED_ORIGINS` is an exact comma-separated list without spaces; add only the frontend origins you intend to use. Provider keys can be empty for sources-only/guided practice, but database, private storage, and queue/recovery configuration are required in hosted mode. Never use the literal `OPTIONAL` placeholder as a key.

The backend automatically selects hosted mode when Vercel sets `VERCEL=1`. It refuses SQLite or missing durable-service settings, uses `/tmp` only for scratch space, and never performs schema changes or resets active hearings/jobs on cold start. Production disables demo accounts and synthetic seeding.

The backend domain must be reachable by the frontend proxy, browser WebSocket handshakes, and QStash. Configure Vercel Deployment Protection accordingly for this API project; interactive Vercel login must not intercept these paths. Application routes still enforce Jude authentication; sockets require a session cookie or a one-use case ticket; job callbacks require QStash signatures; recovery requires `CRON_SECRET`. Keep frontend preview protection if desired. Do not point arbitrary preview branches at production data.

## 3. Frontend Vercel project

Import the same repository/branch with Root Directory `fe`, Framework SvelteKit, Node.js 22.x. The repository pins pnpm; `fe/vercel.json` uses `pnpm install --frozen-lockfile` and `pnpm build`. Keep the default output directory. `fe/vite.config.ts` configures SvelteKit 3 and `@sveltejs/adapter-vercel`; no Next.js start command or output override is needed.

```dotenv
API_INTERNAL_URL=https://jude-api.example.com
PUBLIC_API_WS_URL=wss://jude-api.example.com
PUBLIC_HOSTED_UPLOADS=1
```

These are the only frontend settings. `API_INTERNAL_URL` has no `/api` suffix. Browser HTTP requests retain the frontend origin and its HttpOnly session cookie through the SvelteKit `/api/*` server proxy. Direct WebSockets obtain a fresh ticket from that authenticated HTTP route; cookies are never copied into a URL. Tickets expire after 60 seconds, are single-use and bound to one case/purpose, and remain tied to the original revocable account session. The backend checks the frontend Origin as well.

`fe/src/env.ts` explicitly exposes only `PUBLIC_API_WS_URL` and `PUBLIC_HOSTED_UPLOADS` to the browser; `API_INTERNAL_URL` stays private. These values load from the deployment environment. Redeploy after changing Vercel environment settings. If upgrading an existing Next.js deployment, change the project Framework Preset to **SvelteKit**, remove old `NEXT_PUBLIC_*` variables, and add the `PUBLIC_*` names above. Never put provider, database, storage, queue, or signing secrets in frontend variables.

## Runtime behavior and limits

- Each saved statement and its queued analysis job commit together. QStash receives only the statement ID. A signed callback performs the analysis inside its request, bounded to 220 seconds, with a database lease and up to three automatic attempts. Duplicate deliveries do not create duplicate findings. Failed jobs retain explicit manual retry states.
- Recovery dispatches up to 20 stale jobs per sweep. Large imported hearings stage the whole batch, immediately dispatch the first 20, and drain the rest through recovery. Delivery delays remain visible on saved statements.
- Database leases serialize document ingestion, graph builds, dialogue exchanges, and audio capture across function instances. Their 330-second lifetime exceeds the configured 300-second invocation bound. Keep these values coordinated if changing the deployment duration. A killed invocation can temporarily hold its lease until expiry.
- Notifications coalesce into one latest event per case. Event sockets poll the database and renew after approximately four minutes; the UI also refreshes authoritative saved records periodically. This is not a replayable event log.
- Audio initiates a graceful connection rotation after 210 seconds, flushes final provider output, then obtains a fresh ticket and resumes with briefly buffered PCM. The buffer is capped at 1 MB; unexpected disconnects/overruns stop explicitly and require checking the final saved words before restarting. Timeline offsets carry forward. Speechmatics speaker IDs are scoped to each connection so a new session cannot silently reuse a previous voice identity. Real-provider rotation requires an authorized live-audio test.
- Uploads above 3 MB use 2 MB authenticated parts stored privately in Supabase, then send a small upload reference to ingestion. Each part is checked and reassembled with integrity checks. Existing 6 MB document/hearing and 64 MB case-archive limits still apply. Uploads expire after one hour; cleanup removes abandoned parts. Smaller multipart requests keep the ordinary path.
- Responses above 3 MB (including archives/originals and large case JSON) use a private object and a five-minute signed URL. Temporary response objects expire for cleanup after ten minutes. Supabase Storage must allow browser CORS reads for these signed responses; no public bucket policy is required. Anyone holding a signed URL can use it until expiry.
- HTTP operations still obey Vercel's function/proxy time limits. A long ingestion or evidence-indexing request can fail and need a retry; they are not unbounded background workers. Completed embedding batches remain persisted. Provider and project quotas remain external limits.

## Deployment verification

After setting configuration and deploying both projects:

1. Verify backend `/api/v1/health`, then frontend `/api/v1/health` through the proxy.
2. Register/sign in through the frontend and reload; verify another account cannot access the case.
3. Create a hearing and submit a statement. Confirm the signed job completes, duplicate delivery is harmless, and recovery can redeliver an intentionally delayed job.
4. Verify direct event sockets, ticket replay rejection, and sign-out revocation.
5. Upload a document above 3 MB and round-trip a larger `.jude` archive. Verify temporary files are removed by recovery.
6. Run authorized speech for more than four minutes to exercise a real rotation. Inspect final words, continuity, and speaker labels.
7. Check provider logs, Vercel errors/timeouts, QStash retries, and cron execution before using real proceedings.

Local checks: backend `uv run pytest` and `uv run ruff check .`; frontend lint/typecheck/build and the existing acceptance suites. `fe/tests/vercel_acceptance.py` additionally exercises staged uploads and ticketed sockets with a mocked audio provider. PostgreSQL checks opt in through `JUDE_TEST_DATABASE_URL` and require a disposable database named `jude_test*`.

To reproduce the hosted browser check without service credentials, start `uv run uvicorn tests.hosted_preview:app --port 8010` from `be`. This test-only entrypoint creates disposable SQLite data and in-memory storage; never deploy it. From `fe`, build with `API_INTERNAL_URL=http://127.0.0.1:8010 PUBLIC_API_WS_URL=ws://127.0.0.1:8010 PUBLIC_HOSTED_UPLOADS=1 pnpm build` (with `VERCEL` unset), then run `API_INTERNAL_URL=http://127.0.0.1:8010 PUBLIC_API_WS_URL=ws://127.0.0.1:8010 PUBLIC_HOSTED_UPLOADS=1 pnpm start --port 3012`. In another terminal run `JUDE_TEST_URL=http://127.0.0.1:3012 uv run --no-project --with playwright python tests/vercel_acceptance.py`, setting `CHROMIUM_EXECUTABLE` if using system Chromium. Audio rotation is accelerated and mocked; the PostgreSQL suite separately verifies shared coordination.

References: [SvelteKit on Vercel](https://svelte.dev/docs/kit/adapter-vercel), [FastAPI on Vercel](https://vercel.com/docs/frameworks/backend/fastapi), [WebSocket lifecycle](https://vercel.com/docs/functions/websockets), [function limits](https://vercel.com/docs/functions/limitations), [QStash signature verification](https://upstash.com/docs/qstash/sdks/py/examples/receiver).
