# Unified SvelteKit / TypeScript runtime — 2026-10-30

## Delivered

The backend is now TypeScript inside the existing SvelteKit application. One Vercel project, rooted at `app`, serves the landing page, workspace and API. The Python production runtime, dependencies and Python acceptance/evaluation harness are retired. Existing visual design and workflows are preserved.

The port covers accounts and sessions, PostgreSQL/SQLite persistence, document ingestion/originals, hearings and imports, `.jude` archives, retrieval and evidence links, four-step analysis, case assistant/practice, simulation fixtures, durable jobs/recovery, private file transfers and live audio. Zod validates requests and model output. Existing SQL table names, password hashes, private file paths and `.jude` version 1 remain compatible. Migration 006 adds audio session state.

The browser now streams directly to Speechmatics with a short-lived server-minted JWT. Authenticated, ordered final batches save through SvelteKit, with idempotent retries, session-scoped speakers and timeline offsets. Rotation flushes and buffers audio before reconnecting. SSE replaces the app-hosted notification WebSocket; polling still refreshes authoritative data. The retired proxy, socket-ticket flow and split-origin variables are removed.

Supabase and QStash remain external services. Recovery setup uses an idempotent QStash schedule script, with a Vercel Cron alternative documented. The committed per-minute FastAPI cron is retired with that project; migration does not silently create an external schedule. Node 24 is the documented and configured runtime.

## Verification

- TypeScript/Svelte checks: zero errors/warnings; ESLint passes.
- 23 Node tests pass, including PostgreSQL/pgvector migrations run twice, vector sync, browser-role denial, shared locks/rates/events and outbox persistence.
- Four TypeScript Playwright suites pass: original landing/motion/no-JavaScript navigation; full case workspace/review/import/export; assistant and courtroom practice; hosted large-file parts and mocked Speechmatics rotation/final-word persistence.
- The former Python workspace and dialogue browser suites also passed against the new API before being retired.
- A synthetic `.jude` fixture exported with the original Python implementation imports successfully through TypeScript, retaining originals, hearings, findings and review notes while resetting imported review state.
- Vercel-adapter build passes. An isolated copy of the generated function authenticates, creates a case and extracts a PDF, verifying PDF worker/native dependency tracing independently of workspace dependencies.
- Evaluation CLI runs against the six authored examples and preserves intentional fixture mistakes (accuracy 0.6667, inconsistency precision/recall 0.5, citation validity 0.75). These validate the harness, not AI performance.

## Deployment work remaining

Apply migration 006 to an existing database (001–006 for a new project), configure the private variables, deploy with root `app` and the SvelteKit preset, then configure recovery. Verify real Speechmatics/OpenRouter/Pasal/Supabase/QStash operation and a full audio rotation in the deployed environment. No live service credentials were available for that verification.

The native-library trace lists optional packages for other operating systems plus optional PostgreSQL native/Cloudflare drivers as unavailable. The Linux x64 canvas binary and PDF worker are included; the isolated deployed-function check passes with the ordinary Node `pg` driver. Scanned PDFs still require prior OCR. Browser-relayed transcription is not a cryptographic provider attestation.

## Application directory follow-up — 2026-10-31

Renamed the unified application directory from `fe/` to `app/`, including local data and development files. Updated current documentation, commands and design surface targets. Existing Vercel projects must change Root Directory to `app` in their project settings.

## Recovery schedule allowance

Changed the recovery setup script's default to every 15 minutes and documented the override in the environment template. This uses 96 scheduled deliveries per day before analysis jobs/retries, while ordinary analysis dispatch remains immediate. Existing hosted schedules require rerunning the setup script with the same app URL. No QStash token, HTTPS application URL or recovery secret was configured in this workspace, so the live schedule could not be updated here.

## Landing workspace access

Added a primary Open workspace link beside the landing demo action, with explicit account-entry guidance. Desktop and mobile navigation now say Sign in. All entry links use the existing `/workspace` authentication flow and native anchors; the sample demo remains available separately.

## Hosted sign-in diagnostics

Unexpected API errors previously returned a generic response without logging the failure. Added a matching client reference and server log containing allowlisted database/network/TLS error codes and setup hints. Raw errors, request bodies and connection strings are excluded. Injected sign-in failures verify correlation and credential redaction; ordinary wrong-password responses stay unchanged. The actual production sign-in failure still needs a runtime log from the deployed app.

## Provider request diagnostics

Replaced shared opaque provider request failures with fixed service labels, HTTP status, actionable setup hints and correlated safe logs. Chat, embeddings, legal discovery, speech credentials, and Storage uploads/delete/sign requests are labeled separately. Network and malformed-JSON failures remain distinct; raw provider responses and case content are never included in diagnostics. Mocked rejection and redaction checks cover the failure paths alongside the existing successful provider contracts. Live account credentials and provider routing still require operator verification.

## Citation formatting and bounded correction

Assistant citation validation now tolerates only whitespace differences and persists the exact matched source substring. Source IDs, spelling, numbers, negation and punctuation remain strict. Prompts distinguish passage IDs from document/exhibit identifiers. Assistant replies and practice debriefs receive one automatic citation correction attempt inside the existing lock; both attempts are validated before any exchange is committed. Missing or invented citations still fail closed, and a retry cannot avoid citations by changing uses_case_facts. Tests cover PDF line breaks, fabricated/foreign quotes, successful correction, bounded failed correction, provider errors and idempotent saves. Actual provider-model output remains unverified without credentials.
