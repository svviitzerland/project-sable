# 2026-11-01: Remove the Vercel runtime

## Scope

Production runs on AWS (one EC2 instance, Docker Compose, PostgreSQL, S3, Bedrock; see `infra/README.md`), so the Vercel hosted mode was deleted:

- `config.hosted`, the Vercel settings checks, `VERCEL`/`JUDE_RUNTIME`, `@sveltejs/adapter-vercel`, `vercel.json`, `scripts/check-bundle.mjs`. `vite.config.ts` builds with adapter-node only.
- QStash delivery: `@upstash/qstash`, the analysis outbox (`stageJob`, `dispatch`, `runJob`), `/api/v1/internal/analysis` and `/api/v1/internal/recover`, `scripts/configure-recovery.ts`. `enqueue` always schedules in-process; `investigate` keeps the local limits (three concurrent, 100 waiting, retries coalesced). Global cleanup of expired audio sessions, socket tickets, rate buckets and leases now runs on case list loads, at most every five minutes. Per-case audio expiry still runs on case loads, SSE heartbeats and recording starts.
- Chunked transfers: `/api/v1/transfers`, the `hosted_uploads` capability, browser `stageFiles`, and the 303 signed-download path. Uploads are one bounded multipart request (`readUpload`); downloads return bytes directly (`fileResponse`).
- Supabase Storage branches and the `SUPABASE_*`, `QSTASH_*` and `CRON_SECRET` settings. Storage is S3 when `S3_BUCKET` is set, otherwise local files. Documents stored as `local` or `s3` stay readable.
- `docs/engineering/DEPLOY_VERCEL.md`. Current docs no longer describe Vercel, Supabase or QStash as current.

Migrations are unchanged. `jude_analysis_jobs` and `jude_file_transfers` still exist in the schema but are no longer used.

## Verification

- `apps/web`: lint, typecheck, Node tests (29 pass; the PostgreSQL suite also passed against a disposable pgvector container), build.
- Playwright: all 8 browser tests pass against a dev server, including a single-request upload above 4 MB and direct speech rotation.
- `docker build apps/web` succeeds; the image serves `/api/v1/health`.

## Not verified

- A deploy to the AWS instance.
