# Architecture

Next.js serves the introduction and a client-driven workspace. Same-origin `/api/v1/*` HTTP and WebSocket requests are rewritten to FastAPI. Opaque session cookies are HttpOnly and SameSite Strict, Secure in production. The backend hashes passwords with scrypt and stores only session-token hashes.

SQLAlchemy models cover users, sessions, cases, documents, chunks, hearings, transcript segments, findings, and evidence links. Case ownership is checked before every read/write/stream. SQLite is the local default; supplied SQL migrations initialize PostgreSQL with pgvector and browser-role denial. Original files are separate from extracted chunks and fetched through authorized routes.

Document ingestion preserves page boundaries, serializes uploads per case, enforces quotas, and removes uncommitted originals after database failure. Embedding failure retains keyword search. Retrieval combines case-scoped keyword overlap and cosine scores; PostgreSQL can use an HNSW vector index. PDF extraction runs in a worker thread. Oversized request bodies are rejected even without Content-Length.

Speechmatics PCM streaming and analysis run independently. The browser stops its source, flushes the audio worklet, sends EndOfStream through the backend, and waits for final transcription. Speech sessions revalidate authorization every two seconds. Speaker IDs are labels, not inferred identities.

Each analysis job extracts one checkable assertion, retrieves bounded evidence, calls an analyst, calls a separate reviewer without analyst output, and synthesizes a qualified result. Exact citation validation is structural; it cannot establish that a model's interpretation is correct. Maximum three active analyses; excess queued testimony remains saved for retry. Provider exceptions become explicit saved segment states.

Events are advisory invalidations, with polling/reconnection to reload persisted case state. UI guards prevent responses for an old case overwriting the active case. Review-note drafts remain in memory across finding/tab changes and are persisted only by Save note or Mark reviewed. They are cleared on sign-out.

The MVP is single-worker. Jobs, locks, event queues, and rate limits are process-local. Server startup marks unfinished jobs interrupted. Distributed jobs/events, retention, operational monitoring, account recovery, and deployment-specific infrastructure remain outside this local milestone.

## Hearing import and evidence discovery

`casebook.py` registers the hearing/archive/graph routes; services hold parsing, interchange validation, and retrieval logic. Hearing ingestion is a preview/confirm flow with exact-wording validation against the original upload. The original becomes a private case document; analysis excludes its own hearing's source document and preceding context stays inside the hearing. Canonical hearings can be exported independently or inside a complete case.

Archive import validates bounded ZIP entries, hashes, referential integrity, exact citations and quoted relationships before saving originals and one database transaction. It never extracts user paths. IDs and ownership are replaced; imported findings/links lose review confirmation and analysis authority. Failed persistence removes newly written originals. Checksums protect round-trip integrity, not archive authenticity.

OpenRouter embeddings are labeled with their model identifier. Retrieval ignores vectors from another model. Find connections embeds up to 300 passages per run and compares the first 120 cross-document passages for at most 12 suggestions. An optional structured-output call classifies candidates with exact quotations. Keyword similarity is a labeled fallback. The graph shows up to 60 source passages and 20 cited statements; the canvas shows 24 nodes with a full accessible list below. Search covers all case passages, selects six, expands to four confirmed-link neighbors, and optionally generates a citation-validated answer. This bounded MVP is not an exhaustive entity-resolution or knowledge-graph engine.
