# Jude voice API

Optional Python service that gives recurring voices a stable label. Speechmatics labels speakers (S1, S2) only for one connection, and Jude rotates connections every 210 seconds, so without this service the same judge appears under a new label after every rotation and every hearing. This service turns a short clip of a finalized statement into a voiceprint and compares it with the voiceprints Jude already holds for that case.

The service is **stateless**. It computes and compares voiceprints; Jude stores them per case, never exports them in `.jude` archives, and can delete them ("Forget voiceprints"). Audio is decoded in memory and never written to disk. A match means "probably the same voice", never an identity: names and roles stay user-assigned.

## Stack

- FastAPI + Uvicorn, Python 3.12, managed with [uv](https://docs.astral.sh/uv/).
- Open-source [pyannote.audio](https://github.com/pyannote/pyannote-audio) 4:
  - voiceprints: `pyannote/wespeaker-voxceleb-resnet34-LM` (256 dimensions, downloads without a Hugging Face token);
  - offline diarization: `pyannote/speaker-diarization-community-1` (needs `HF_TOKEN` with the model's conditions accepted).
- `VOICE_ENGINE=fake`: a deterministic spectral engine for tests and development without model downloads. It separates synthetic tones, not people; never use it to claim speaker recognition.

## API

All `/v1` routes require `Authorization: Bearer $VOICE_API_TOKEN`. Only Jude's server calls them; the token never reaches browsers.

| Route | Input (multipart) | Output |
|---|---|---|
| `GET /health` | — | engine, model, dimension, diarization availability |
| `POST /v1/embeddings` | `file` (WAV/FLAC/OGG, 1.5–30 s) | normalized `embedding` |
| `POST /v1/identify` | `file`, `candidates` JSON `[{id, embedding}]`, optional `threshold` | `embedding`, best `match` `{id, score}` or `null`, top `scores` |
| `POST /v1/diarize` | `file` (up to 3 h, 64 MB), optional `num_speakers`/`min_speakers`/`max_speakers` | `segments` `[{speaker, start, end}]`, per-speaker `embedding` |

`/v1/diarize` is for post-hearing reprocessing of an authorized recording; Jude's live workflow uses `/v1/identify` only.

## Run

```bash
cp .env.example .env               # set VOICE_API_TOKEN (16+ characters)
uv sync --extra ml                 # or plain `uv sync` with VOICE_ENGINE=fake
uv run uvicorn jude_voice.main:app --port 8000
```

With Docker, from the repository root:

```bash
docker compose up --build voice    # reads voice/.env, caches models in a volume
```

`docker build --build-arg EXTRAS= .` builds a lightweight image without torch (fake engine only). Then set the same token in `app/.env.local`:

```bash
VOICE_API_URL=http://localhost:8000
VOICE_API_TOKEN=<same secret>
```

Hosted Jude requires an HTTPS `VOICE_API_URL`. Run the container on any Docker host (a CPU instance is enough for live identification: one embedding takes about 30 ms on an Apple M-series laptop after a ~25 s model load). Keep it private behind TLS, and keep the model cache volume so restarts do not re-download.

## Checks

```bash
uv run pytest
uv run ruff check . && uv run ruff format --check .
```

## Calibration

`VOICE_MATCH_THRESHOLD` (default 0.55) is the cosine similarity needed to treat two clips as the same voice. On macOS synthetic voices (Indonesian and English, 16 kHz, pyannote embeddings) the same voice scored 0.88–0.92 and different voices at most 0.21. Courtroom audio (distance, echo, overlapping speech) will score lower; calibrate with authorized recordings before relying on it, and keep the human confirmation step.
