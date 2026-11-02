"""HTTP API. Stateless: Jude stores voiceprints; this service only computes and compares them."""

from __future__ import annotations

import hmac
import json
import logging
from contextlib import asynccontextmanager
from typing import Annotated

import numpy as np
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse

from .audio import AudioError, decode, duration
from .config import Settings
from .engines import Engine, EngineUnavailable, build_engine
from .matching import best_match, rank

log = logging.getLogger("jude_voice")


def create_app(settings: Settings | None = None, engine: Engine | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.settings = settings or Settings.from_env()
        app.state.engine = engine or build_engine(app.state.settings)
        log.info("voice engine ready: %s (%s)", app.state.engine.name, app.state.engine.model)
        yield

    app = FastAPI(title="Jude Voice API", version="0.1.0", lifespan=lifespan)

    @app.exception_handler(AudioError)
    async def audio_error(_: Request, error: AudioError):
        return JSONResponse(status_code=422, content={"detail": str(error)})

    @app.exception_handler(EngineUnavailable)
    async def unavailable(_: Request, error: EngineUnavailable):
        return JSONResponse(status_code=503, content={"detail": str(error)})

    def config(request: Request) -> Settings:
        return request.app.state.settings

    def current_engine(request: Request) -> Engine:
        return request.app.state.engine

    def authorize(request: Request, authorization: Annotated[str | None, Header()] = None) -> None:
        expected = f"Bearer {request.app.state.settings.token}"
        if not authorization or not hmac.compare_digest(authorization, expected):
            raise HTTPException(status_code=401, detail="Invalid voice API token.")

    def read_clip(file: UploadFile, settings: Settings) -> tuple[np.ndarray, int]:
        data = file.file.read(settings.max_upload_bytes + 1)
        if len(data) > settings.max_upload_bytes:
            raise HTTPException(status_code=413, detail="Audio is too large.")
        samples, rate = decode(data)
        maximum = settings.max_clip_seconds
        if duration(samples, rate) > maximum:
            raise HTTPException(status_code=413, detail=f"Audio must be at most {maximum:g} s.")
        return samples, rate

    def embed_clip(file: UploadFile, settings: Settings, engine: Engine):
        samples, rate = read_clip(file, settings)
        length = duration(samples, rate)
        if length < settings.min_clip_seconds:
            raise HTTPException(
                status_code=422,
                detail=f"Audio must be at least {settings.min_clip_seconds:g} s for a voiceprint.",
            )
        return engine.embed(samples, rate), length

    Auth = Depends(authorize)

    @app.get("/health")
    def health(request: Request):
        engine = current_engine(request)
        return {
            "status": "ok",
            "service": "jude-voice",
            "engine": engine.name,
            "model": engine.model,
            "dim": engine.dim,
        }

    @app.post("/v1/embeddings", dependencies=[Auth])
    def embeddings(request: Request, file: Annotated[UploadFile, File()]):
        settings, engine = config(request), current_engine(request)
        vector, length = embed_clip(file, settings, engine)
        return {
            "model": engine.model,
            "dim": engine.dim,
            "duration": round(length, 3),
            "embedding": [round(float(x), 6) for x in vector],
        }

    @app.post("/v1/identify", dependencies=[Auth])
    def identify(
        request: Request,
        file: Annotated[UploadFile, File()],
        candidates: Annotated[str, Form()] = "[]",
        threshold: Annotated[float | None, Form()] = None,
    ):
        settings, engine = config(request), current_engine(request)
        try:
            parsed = json.loads(candidates)
            assert isinstance(parsed, list) and len(parsed) <= settings.max_candidates
            pairs = []
            for item in parsed:
                vector = np.asarray(item["embedding"], dtype=np.float32)
                assert isinstance(item["id"], str) and 0 < len(item["id"]) <= 80
                assert vector.shape == (engine.dim,) and np.isfinite(vector).all()
                pairs.append((item["id"], vector))
        except (ValueError, KeyError, TypeError, AssertionError) as error:
            raise HTTPException(
                status_code=422,
                detail=f"candidates must be at most {settings.max_candidates} items of "
                f"{{id, embedding[{engine.dim}]}} from model {engine.model}.",
            ) from error
        limit = settings.match_threshold if threshold is None else threshold
        if not 0 < limit < 1:
            raise HTTPException(status_code=422, detail="threshold must be between 0 and 1.")
        vector, length = embed_clip(file, settings, engine)
        scores = rank(vector, pairs)
        match = best_match(scores, limit)
        return {
            "model": engine.model,
            "dim": engine.dim,
            "duration": round(length, 3),
            "threshold": limit,
            "embedding": [round(float(x), 6) for x in vector],
            "match": {"id": match.id, "score": match.score} if match else None,
            "scores": [{"id": s.id, "score": s.score} for s in scores[:10]],
        }

    return app


app = create_app()
