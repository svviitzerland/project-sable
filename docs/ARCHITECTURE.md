# Architecture

Next.js serves the introduction and a client-driven workspace. Same-origin `/api/v1/*` HTTP and WebSocket requests are rewritten to FastAPI. Opaque session cookies are HttpOnly and SameSite Strict, Secure in production. The backend hashes passwords with scrypt and stores only session-token hashes.

SQLAlchemy models cover users, sessions, cases, documents, chunks, transcript segments, and findings. Case ownership is checked before every read/write/stream. SQLite is the local default; supplied SQL migrations initialize PostgreSQL with pgvector and browser-role denial. Original files are separate from extracted chunks and fetched through authorized routes.

Document ingestion preserves page boundaries, serializes uploads per case, enforces quotas, and removes uncommitted originals after database failure. Embedding failure retains keyword search. Retrieval combines case-scoped keyword overlap and cosine scores; PostgreSQL can use an HNSW vector index. PDF extraction runs in a worker thread. Oversized request bodies are rejected even without Content-Length.

Speechmatics PCM streaming and analysis run independently. The browser stops its source, flushes the audio worklet, sends EndOfStream through the backend, and waits for final transcription. Speech sessions revalidate authorization every two seconds. Speaker IDs are labels, not inferred identities.

Each analysis job extracts one checkable assertion, retrieves bounded evidence, calls an analyst, calls a separate reviewer without analyst output, and synthesizes a qualified result. Exact citation validation is structural; it cannot establish that a model's interpretation is correct. Maximum three active analyses; excess queued testimony remains saved for retry. Provider exceptions become explicit saved segment states.

Events are advisory invalidations, with polling/reconnection to reload persisted case state. UI guards prevent responses for an old case overwriting the active case. Review-note drafts remain in memory across finding/tab changes and are persisted only by Save note or Mark reviewed. They are cleared on sign-out.

The MVP is single-worker. Jobs, locks, event queues, and rate limits are process-local. Server startup marks unfinished jobs interrupted. Distributed jobs/events, retention, operational monitoring, account recovery, and deployment-specific infrastructure remain outside this local milestone.
