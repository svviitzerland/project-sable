# Deploy Jude as one SvelteKit project

The frontend and TypeScript API now share **one Vercel deployment**, rooted at **`app`**. Supabase stores durable data/files; QStash delivers analysis jobs. Python and a second API project are no longer required.

## 1. Prepare Supabase

Use a dedicated Supabase project for each environment. Run `app/migrations/001_schema.sql` through `006_typescript_audio.sql`, in numeric order, as the database owner. On an existing database already using 001–005, apply only 006. Back up existing data before applying schema changes.

Migrations preserve existing tables and scrypt account hashes. They enable RLS and deny direct browser-role access. Migration 002 installs pgvector in `extensions`, maintains 1536-dimensional vectors, and creates the private `jude-documents` bucket; 005 permits private temporary transfers up to 64 MB. Migration 006 adds authenticated browser audio sessions. If pgvector already lives in another schema, reconcile that before applying 002.

`DATABASE_URL` connects directly to the PostgreSQL database already included in your Supabase project; it is not another database service. Get it from **Supabase → Connect → Transaction pooler**. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` connect the separate private Storage API. The old Python `postgresql+psycopg://` prefix is replaced by `postgresql://` in TypeScript.

Use the Supabase transaction-pooler PostgreSQL connection string with TLS (`sslmode=require`) for serverless traffic. The server uses `pg` with a small pool and no named prepared statements. Use a server-only database owner credential. Jude uses its own accounts and sessions, not Supabase Auth. Keep the Storage bucket private and ensure pre-existing policies do not grant browser access.

## 2. Import into Vercel

Choose the branch containing the TypeScript migration:

| Setting | Value |
| --- | --- |
| Framework Preset | **SvelteKit** |
| Root Directory | **`app`** |
| Node.js Version | **24.x** |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm build` |
| Output Directory | Leave the preset default |

`app/vite.config.ts` configures the Vercel adapter, Node 24 and a 300-second maximum function duration. The app uses streaming HTTP for notifications; it does not host WebSockets. Ensure your Vercel function settings and plan permit the configured duration. No Uvicorn start command or separate frontend/backend URL is needed.

If this project was previously configured with Root Directory `fe`, change it to `app` in Vercel project settings before the next deployment. The repository rename does not change that dashboard setting automatically.

## 3. Add private environment variables

Set these on the same Vercel project. None should have a `PUBLIC_` or `NEXT_PUBLIC_` prefix.

```dotenv
JUDE_RUNTIME=vercel
JUDE_ENV=production
JUDE_APP_URL=https://your-app.vercel.app
DATABASE_URL=postgresql://YOUR_SERVER_USER:YOUR_PASSWORD@YOUR_POOLER:6543/postgres?sslmode=require
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=jude-documents
QSTASH_TOKEN=YOUR_QSTASH_TOKEN
QSTASH_CURRENT_SIGNING_KEY=YOUR_CURRENT_SIGNING_KEY
QSTASH_NEXT_SIGNING_KEY=YOUR_NEXT_SIGNING_KEY
CRON_SECRET=YOUR_LONG_RANDOM_SECRET
```

`JUDE_APP_URL` is the stable public application origin, without `/api` or a trailing slash. QStash signs deliveries for this destination. Set it to the final production domain; update it and the recovery schedule if that domain changes. Preview deployments should use separate resources and their own stable URL. Vercel Deployment Protection must allow QStash callbacks to reach the two `/api/v1/internal/*` routes; application signatures/authorization still protect them.

Enable the integrations you want:

```dotenv
OPENROUTER_API_KEY=YOUR_OPENROUTER_KEY
OPENROUTER_MODEL=YOUR_STRICT_JSON_SCHEMA_MODEL_ID
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small
SPEECHMATICS_API_KEY=YOUR_SPEECHMATICS_KEY
PASAL_API_KEY=YOUR_PASAL_KEY
```

The embedding model must support 1536-dimensional output. The default Speechmatics region is EU; `SPEECHMATICS_URL` defaults to `wss://eu.rt.speechmatics.com/v2`. The server mints short-lived EU realtime credentials. `QSTASH_URL` normally stays at its default. `ALLOWED_ORIGINS` is optional for explicitly trusted additional origins; ordinary same-origin use needs no CORS configuration.

Remove obsolete `API_INTERNAL_URL`, `PUBLIC_API_WS_URL`, `PUBLIC_HOSTED_UPLOADS`, `JUDE_BACKEND_URL`, and `NEXT_PUBLIC_*` deployment variables. The browser discovers hosted upload support from application capabilities. Redeploy after changing variables.

## 4. Configure recovery

Normal testimony saves and its analysis outbox entry commit atomically. QStash dispatches analysis immediately. Recovery finds jobs that were never dispatched or became stale, retries a bounded batch, expires abandoned audio state, and removes expired temporary files. **Do not omit this schedule.**

The repository no longer commits a per-minute Vercel Cron. Use QStash's scheduler to avoid coupling deployment to Vercel's cron-plan restrictions. From `app`, with the production `JUDE_APP_URL`, `QSTASH_TOKEN`, and `CRON_SECRET` in a local, uncommitted env file, run once after deploying:

```bash
node --env-file=.env.local --import tsx scripts/configure-recovery.ts
```

This creates or updates a stable schedule for that app URL: `GET /api/v1/internal/recover` every 15 minutes with `Authorization: Bearer <CRON_SECRET>`. The default `JUDE_RECOVERY_CRON="*/15 * * * *"` produces 96 scheduled deliveries per day; analysis jobs and retries consume additional quota. Normal analysis still dispatches immediately; stuck or undispatched jobs may wait until the next recovery run. The script prints only the schedule ID and uses the official QStash TypeScript SDK. Set `JUDE_RECOVERY_CRON` to override the interval.

For an existing every-minute schedule, update any explicit `JUDE_RECOVERY_CRON` override to `*/15 * * * *` and rerun the command above with the same app URL. Changing the code or environment variable alone does not update an existing QStash schedule. Re-run after changing the origin or recovery secret. Remove the old origin's schedule after a domain migration.

If your Vercel plan supports your desired cron frequency, you may instead add a `crons` entry to `app/vercel.json` for `/api/v1/internal/recover`; Vercel supplies `CRON_SECRET` as its Bearer token. Configure one scheduler, not duplicate sweeps.

## 5. Verify the deployed app

1. Open `/api/v1/health`, register/sign in, create a case, and check isolation with another account.
2. Upload text and a text-based PDF. Check extraction, exact quotations and original downloads. Upload a DOCX above 3 MB to exercise 2 MB transfer parts.
3. Import a hearing and analyze it with OpenRouter. Confirm the QStash callback succeeds, saved jobs complete, and a manual authenticated recovery request returns a dispatch count.
4. Start authorized microphone audio. Confirm partial text, finalized saved turns, stop/flush, and continuity over a rotation after about 210 seconds. Repeat with prepared audio.
5. Test a cited assistant exchange, a practice rehearsal/debrief, and a `.jude` export/import. Check temporary upload/export cleanup after expiry.

These steps require real credentials and have not been represented as completed live-provider verification. Local TypeScript contract, browser, PostgreSQL and build tests are separate evidence.

## Troubleshoot sign-in

A missing-setting error in Vercel logs means startup configuration is incomplete; add the named Production environment variable and redeploy. A response with a reference ID means the API encountered an unexpected error. Retry once, then search Vercel runtime logs for that reference or `jude_request_failed`.

The structured log contains only an allowlisted error code and setup hint, not passwords, connection strings, SQL parameters or case contents. `28P01` indicates database password authentication failure; `42P01` indicates a missing table (confirm migrations 001–006 ran in the same Supabase project that `DATABASE_URL` uses). Network codes point to hostname/connectivity issues; TLS codes point to certificate trust. Use the Supabase transaction-pooler URL and keep TLS verification enabled. `UNKNOWN` requires further investigation; it does not establish a database diagnosis. Normal wrong-password responses remain separate.

## Troubleshoot provider requests

The interface shows an actionable failure message and a reference ID, without service configuration details. Search Vercel runtime logs for that reference or `jude_provider_failed` to find the service and upstream HTTP status. Only fixed service labels, status, failure category and setup hints are logged; raw upstream messages, URLs, credentials and case text are excluded.

For the case assistant, check `OpenRouter chat` failures: 401 points to the API key; 402 to provider balance/billing limits; 429 to rate/quota limits; 400/404/422 require checking the exact `OPENROUTER_MODEL` identifier, strict JSON-schema support and available provider routing. These are troubleshooting directions, not a definitive diagnosis from status alone. A legal lookup may instead fail at Pasal.id. An embedding failure logs separately while retrieval can fall back to keywords. Successful HTTP responses with unreadable JSON and network/timeouts are distinguished from HTTP rejection. Redeploy after changing Vercel environment variables.

## Cutover from the former two-project setup

Update the existing frontend project's preset/root/environment as above, apply migration 006, then deploy and configure recovery on its URL. Saved PostgreSQL cases/accounts, private originals, password hashes, and `.jude` files continue to work. Allow existing queue deliveries to drain, verify the unified deployment, then retire the former FastAPI project and its recovery schedule. No database export/re-import is required. Old socket-ticket rows can expire naturally; the new app uses cookie-authenticated SSE and authenticated HTTP audio saves.

Speechmatics credentials are short-lived and scoped to the browser session's current recording. Final batches are ordered and idempotent; the server validates account, case, hearing, session, timestamps and limits before saving. Browser-relayed transcripts are not a cryptographic attestation of provider output. Recording authorization and final words must still be checked by the user. Rotation buffers are bounded, and failures are visible.

References: [SvelteKit Vercel adapter](https://svelte.dev/docs/kit/adapter-vercel), [QStash schedules](https://upstash.com/docs/qstash/features/schedules), [QStash signature verification](https://upstash.com/docs/qstash/sdks/ts/receiver), [Speechmatics authentication](https://docs.speechmatics.com/introduction/authentication).
