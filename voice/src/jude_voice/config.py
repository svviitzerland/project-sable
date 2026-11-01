"""Environment settings. Every value is server-side only; never expose them to browsers."""

from __future__ import annotations

import os
from dataclasses import dataclass


def _float(name: str, default: float) -> float:
    value = os.environ.get(name, "").strip()
    return float(value) if value else default


@dataclass(frozen=True)
class Settings:
    token: str
    engine: str = "pyannote"
    hf_token: str = ""
    embedding_model: str = "pyannote/wespeaker-voxceleb-resnet34-LM"
    diarization_model: str = "pyannote/speaker-diarization-community-1"
    match_threshold: float = 0.55
    min_clip_seconds: float = 1.5
    max_clip_seconds: float = 30.0
    max_recording_seconds: float = 3 * 60 * 60
    max_upload_bytes: int = 64 * 1024 * 1024
    max_candidates: int = 200

    @classmethod
    def from_env(cls) -> Settings:
        token = os.environ.get("VOICE_API_TOKEN", "").strip()
        if len(token) < 16:
            raise RuntimeError("VOICE_API_TOKEN must be set to a secret of at least 16 characters.")
        return cls(
            token=token,
            engine=os.environ.get("VOICE_ENGINE", "pyannote").strip() or "pyannote",
            hf_token=os.environ.get("HF_TOKEN", "").strip(),
            embedding_model=os.environ.get("VOICE_EMBEDDING_MODEL", "").strip()
            or cls.embedding_model,
            diarization_model=os.environ.get("VOICE_DIARIZATION_MODEL", "").strip()
            or cls.diarization_model,
            match_threshold=_float("VOICE_MATCH_THRESHOLD", cls.match_threshold),
            min_clip_seconds=_float("VOICE_MIN_CLIP_SECONDS", cls.min_clip_seconds),
            max_clip_seconds=_float("VOICE_MAX_CLIP_SECONDS", cls.max_clip_seconds),
            max_recording_seconds=_float("VOICE_MAX_RECORDING_SECONDS", cls.max_recording_seconds),
            max_upload_bytes=int(_float("VOICE_MAX_UPLOAD_MB", 64) * 1024 * 1024),
        )
