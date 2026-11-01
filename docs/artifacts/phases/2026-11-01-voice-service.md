# 2026-11-01 — Python voice service

## Scope

- New `voice/` FastAPI service (Python 3.12, uv, pyannote.audio 4, Docker): `/health`, `/v1/embeddings`, `/v1/identify`, `/v1/diarize`. Stateless, bearer-token protected, audio kept in memory.
- Root `compose.yaml` runs it locally; `voice/Dockerfile` builds a CPU image (`--build-arg EXTRAS=` for a torch-free fake-engine image).
- App: `VOICE_API_URL`/`VOICE_API_TOKEN`, `jude_voiceprints` table (migration 007, local SQLite), `POST /cases/:id/transcripts/:segment/voice`, `DELETE /cases/:id/voiceprints`, `voice` capability. Audio batch saves return saved turn timings; the browser keeps two minutes of PCM and posts 16 kHz WAV clips of finalized turns. Turns are re-keyed to `voice:voice-N`; "Voice N" display names; "Forget voiceprints" in session settings.

## Verification

- `voice`: 8 pytest cases with the fake engine; ruff clean. Real pyannote embedding model loaded on macOS without a Hugging Face token (256 dimensions, ~25 s load, ~30 ms per embedding). Synthetic macOS voices (Indonesian and English): same voice 0.88–0.92, different voices ≤ 0.21 cosine.
- Docker: fake-engine image built and served `/health`, rejected a missing token (401) and returned an embedding.
- App: lint, typecheck and 29 Node tests pass (PostgreSQL suite skipped without `JUDE_TEST_DATABASE_URL`), including the new voice re-keying/export/forget test and the voice tape test.

## Not verified

- Real courtroom or human recordings; threshold calibration on them.
- `/v1/diarize` with the gated community-1 pipeline (needs `HF_TOKEN`).
- End-to-end with a live Speechmatics key and a hosted voice container; migration 007 against PostgreSQL.
