# Architecture

Svelte 5 and SvelteKit 3 serve the landing page, workspace, and TypeScript `/api/v1` API in one Node 24 Vercel project. Server modules are under `apps/web/src/lib/server`; the catch-all endpoint delegates to `api.ts`. Zod validates requests, portable records and model output. Private environment variables are declared explicitly in `apps/web/src/env.ts`. No frontend proxy or app-hosted WebSocket is required; the Python voice service in `apps/voice` is optional.

Opaque account cookies are HttpOnly and SameSite Strict, with Secure in production. Scrypt hashes and hashed 12-hour session tokens retain compatibility with the previous implementation. Every case route, notification stream, file transfer and conversation verifies ownership. API mutations reject foreign origins. Browser database roles have no table access.

The typed SQL layer uses `node:sqlite` locally and `pg` for PostgreSQL. Existing table names, JSON data, IDs, account hashes and migrations 001–005 are preserved. Migration 006 adds audio session state and 007 adds voiceprints. Migrations live in `supabase/migrations` and run against Supabase (local CLI or hosted). PostgreSQL migrations are applied separately; hosted cold starts never create schemas or reset another instance's jobs. One local process creates/additively upgrades SQLite and marks abandoned local work interrupted. Original files remain separate from extracted chunks in private Storage or the local data directory.

## Evidence and analysis

Document ingestion preserves page boundaries and originals, limits files/text/pages, serializes duplicate/quota checks through commit, and removes uncommitted originals after database failure. PDF.js handles text PDFs; `fflate` and a bounded XML parser handle DOCX. Scans require prior OCR. Explicit PDF worker/native imports ensure the Vercel bundle contains the extraction runtime. Embedding failure retains labeled keyword search. Retrieval filters case and embedding model, combines term overlap and cosine scores, and supports the existing pgvector schema/index.

Each analysis extracts a checkable claim, retrieves evidence, asks an analyst, asks an independent reviewer without the analyst's answer, then synthesizes a qualified finding. Exact quotes and required citation relationships are checked before persistence. Imported hearing originals are excluded from their own analysis. Citation checks establish provenance, not semantic correctness or truth.

Hosted testimony and its analysis outbox entry commit together. QStash delivers signed, destination-bound callbacks. PostgreSQL leases prevent concurrent duplicate analysis; idempotent completion checks and bounded attempts preserve retry behavior. Provider calls have deadlines; recovery redelivers stale/unsent jobs and cleans temporary transfers. Local development tracks in-process work. Case notifications use cookie-authenticated SSE with session revalidation and bounded stream duration; reconnect and periodic polling reload authoritative state.

## Audio and file transfers

The server mints a short-lived Speechmatics realtime JWT after checking the user's recording authorization, hearing and active-session lease. The browser connects directly to Speechmatics. The server API authenticates finalized transcript batches, validates and splits speaker turns, adds timeline offsets, and atomically saves ordered batches and analysis jobs. Duplicate retries do not create repeated testimony. Speaker IDs are scoped to each connection and are never inferred courtroom identities.

Audio rotates after 210 seconds. The worklet flushes the old connection, captures into a bounded reconnect buffer, then resumes transmission with fresh credentials. Final stop waits for final transcription and HTTP persistence. Errors explicitly prompt users to inspect final saved words. Partials stay in the recording browser; saved turns notify other views. The temporary provider token can live until expiry after sign-out, but revoked sessions cannot save additional testimony. Browser-relayed output is not provider-attested evidence.

Uploads above 3 MB use authenticated 2 MB parts with size and SHA-256 checks. Large JSON/export/original responses use five-minute signed private Storage links, backed by ten-minute temporary objects. Recovery removes expired transfer objects, including orphaned parts from a failed metadata commit.

## Voice service

Speechmatics speaker labels last for one connection, so saved turns are keyed `<session>:<label>`. When `VOICE_API_URL` and `VOICE_API_TOKEN` are set, the recording browser keeps the last two minutes of captured PCM in memory. After a batch saves, it cuts each finalized turn of at least 3 s (capped at 25 s), resamples it to 16 kHz WAV and posts it to `/api/v1/cases/:id/transcripts/:segment/voice`. The server checks ownership and origin, then calls the Python service's `/v1/identify` with the case's voiceprints for the active model.

A match above the threshold updates that voiceprint's running mean; otherwise a new `voice-N` print is created. The first identification of a provider label claims all its turns and re-keys them to `voice:voice-N`; later saves of that label are keyed directly. Disagreements move only the statement that was heard. User labels attach to `voice:` keys, so one name survives rotations and hearings. Voiceprints live in `jude_voiceprints`, are excluded from `.jude` archives and can be deleted per case. The Python service is stateless and never stores audio. Clip upload failures are ignored because the transcript is already saved.

## Hearings, archives and conversations

Hearing import is preview/confirm with deterministic native parsers or explicitly requested AI formatting. Imported words must occur in the upload; conversion cannot decode scans or invent speaker identities/timestamps. The original is saved as a private case document. `.jude` version 1 remains a bounded ZIP manifest plus originals, with checksums, provenance and reference checks. Import creates new IDs and resets imported finding/link review state. Practice and assistant history have separate JSON exports.

The evidence graph uses up to 300 indexed passages, compares the first 120 cross-document passages for at most 12 suggestions, and verifies both quotes for AI relationships. Search covers case passages and expands through confirmed connections only. Similarity does not imply support or contradiction.

Case assistant context is bounded to selected document/testimony excerpts, inventory, recent findings and confirmed links. Conversations are owner-scoped and exchanges save atomically with idempotent request IDs. Practice freezes editable trial conditions at session creation; AI speaks only other roles and cites case facts. Guided drills remain explicitly scripted. Practice never creates evidence, testimony or findings.

The product retains its existing visual identity and review workflow. Old-case responses cannot overwrite active-case state, and unsaved review-note drafts remain explicit. Tests cover local API behavior, PostgreSQL coordination, browser workflows, provider contracts, audio worklet flushing and direct-stream rotation. Real hosted/provider acceptance still requires configured accounts.
