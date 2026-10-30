# Vercel runtime — 2026-10-30

User direction: deploy both Next.js and FastAPI on Vercel. Implemented in a clean worktree to preserve the unrelated local factory.py changes, for the existing PR #2 branch.

- Added frontend/backend Vercel configurations and explicit environment/setup guide.
- Hosted configuration requires durable services and disables local-data fallback. PostgreSQL uses NullPool; cold starts do not mutate schema or reset shared work.
- Transactional analysis outbox, signed QStash delivery, bounded retries, database leases, and authenticated scheduled recovery.
- Shared events/rate limits and single-use case/purpose-bound socket tickets, with ongoing session revocation checks.
- Graceful audio connection rotation, bounded PCM buffering, timeline offsets, and connection-scoped diarization identifiers.
- Chunked large uploads and expiring private download links retain existing archive/document limits. Scheduled cleanup removes temporary objects.
- Migration 005 protects all runtime tables and adjusts private bucket capacity for temporary case exports.

Validation:

- Backend: 59 tests passed, including real PostgreSQL migration idempotency/RLS/browser-role denial, cross-instance locks and events, offline and mocked-provider contracts, signed callback rejection, job recovery/idempotence, socket replay prevention, and upload integrity/ownership/cleanup. Ruff passed. The PostgreSQL run emitted an existing vector-reflection warning and the test client emitted a dependency deprecation warning.
- Frontend lint, TypeScript, and production build passed, including the Vercel environment guard with HTTPS/WSS deployment origins.
- Full workspace acceptance, assistant/practice acceptance, and hosted transport Chromium acceptance passed. Hosted checks covered direct event tickets, a 4 MB upload in three bounded parts, accelerated mocked audio rotation with fresh tickets and PCM on both connections, final stop, and no page errors.
- Both audio worklet tests passed. The rotation check caught and fixed a flush that previously stopped PCM capture permanently; rotation now explicitly continues capture while final stop ends it.
- The reusable local-only hosted preview fixture imports successfully and its launch instructions are in `docs/DEPLOY_VERCEL.md`.

Live Vercel/QStash/Supabase Storage/Speechmatics validation remains outstanding because those account credentials are not available in this environment. No deployment or merge is claimed.
