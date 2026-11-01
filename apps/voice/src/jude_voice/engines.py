"""Speaker engines.

``PyannoteEngine`` uses open-source pyannote models. ``FakeEngine`` is a deterministic
spectral stand-in for tests and for development without model downloads; it must never be
presented as real speaker recognition.
"""

from __future__ import annotations

import warnings
from dataclasses import dataclass
from typing import Protocol

import numpy as np

from .audio import resample
from .config import Settings
from .matching import cosine, normalize


@dataclass(frozen=True)
class Turn:
    speaker: str
    start: float
    end: float


@dataclass(frozen=True)
class Diarization:
    turns: list[Turn]
    embeddings: dict[str, np.ndarray]


class EngineUnavailable(RuntimeError):
    pass


class Engine(Protocol):
    name: str
    model: str
    dim: int
    diarization_available: bool

    def embed(self, samples: np.ndarray, rate: int) -> np.ndarray: ...

    def diarize(
        self,
        samples: np.ndarray,
        rate: int,
        num_speakers: int | None = None,
        min_speakers: int | None = None,
        max_speakers: int | None = None,
    ) -> Diarization: ...


def _merge(turns: list[Turn]) -> list[Turn]:
    merged: list[Turn] = []
    for turn in turns:
        if merged and merged[-1].speaker == turn.speaker and turn.start - merged[-1].end < 0.05:
            merged[-1] = Turn(turn.speaker, merged[-1].start, turn.end)
        else:
            merged.append(turn)
    return merged


class FakeEngine:
    """Band-energy fingerprint. Distinguishes synthetic tones, not real people."""

    name = "fake"
    model = "fake-spectral-v1"
    dim = 64
    diarization_available = True

    def embed(self, samples: np.ndarray, rate: int) -> np.ndarray:
        samples = resample(samples, rate)
        frame = 1024
        if len(samples) < frame:
            samples = np.pad(samples, (0, frame - len(samples)))
        usable = len(samples) - len(samples) % frame
        frames = samples[:usable].reshape(-1, frame) * np.hanning(frame)
        power = (np.abs(np.fft.rfft(frames, axis=1)) ** 2).mean(axis=0)
        bands = np.array_split(power[1:], self.dim)
        return normalize(np.log1p(np.array([band.mean() for band in bands]) * 1e3))

    def diarize(self, samples, rate, num_speakers=None, min_speakers=None, max_speakers=None):
        window = int(1.5 * rate)
        centroids: list[np.ndarray] = []
        turns: list[Turn] = []
        for start in range(0, max(len(samples) - window // 2, 1), window):
            vector = self.embed(samples[start : start + window], rate)
            scores = [cosine(vector, c) for c in centroids]
            limit = num_speakers or max_speakers
            if scores and (max(scores) >= 0.95 or (limit and len(centroids) >= limit)):
                index = int(np.argmax(scores))
            else:
                centroids.append(vector)
                index = len(centroids) - 1
            end = min(start + window, len(samples))
            turns.append(Turn(f"SPEAKER_{index:02d}", start / rate, end / rate))
        embeddings = {f"SPEAKER_{i:02d}": c for i, c in enumerate(centroids)}
        return Diarization(_merge(turns), embeddings)


class PyannoteEngine:
    name = "pyannote"

    def __init__(self, settings: Settings):
        # pyannote warns that torchcodec file decoding is unavailable; Jude always passes
        # decoded in-memory waveforms, which is the supported alternative.
        warnings.filterwarnings("ignore", message=r"\s*torchcodec is not installed")
        try:
            import torch
            from pyannote.audio import Inference, Model
        except ImportError as error:  # pragma: no cover - depends on the ml extra
            raise EngineUnavailable(
                "pyannote.audio is not installed. Install with `uv sync --extra ml`."
            ) from error
        self._torch = torch
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._settings = settings
        token = settings.hf_token or None
        model = Model.from_pretrained(settings.embedding_model, token=token)
        if model is None:  # pragma: no cover
            raise EngineUnavailable(f"Could not load {settings.embedding_model}.")
        self._inference = Inference(model, window="whole", device=self._device)
        self.model = settings.embedding_model
        self.dim = int(self.embed(np.zeros(16000, dtype=np.float32) + 1e-4, 16000).shape[0])
        self._pipeline = None
        self.diarization_available = bool(settings.hf_token)

    def _audio(self, samples: np.ndarray, rate: int) -> dict:
        return {"waveform": self._torch.from_numpy(samples).unsqueeze(0), "sample_rate": rate}

    def embed(self, samples: np.ndarray, rate: int) -> np.ndarray:
        vector = np.asarray(self._inference(self._audio(samples, rate)), dtype=np.float32)
        return normalize(vector.reshape(-1))

    def diarize(self, samples, rate, num_speakers=None, min_speakers=None, max_speakers=None):
        if not self.diarization_available:
            raise EngineUnavailable("Diarization needs HF_TOKEN with access to the pipeline.")
        if self._pipeline is None:
            from pyannote.audio import Pipeline

            pipeline = Pipeline.from_pretrained(
                self._settings.diarization_model, token=self._settings.hf_token
            )
            if pipeline is None:  # pragma: no cover
                raise EngineUnavailable(f"Could not load {self._settings.diarization_model}.")
            self._pipeline = pipeline.to(self._device)
        options = {
            key: value
            for key, value in {
                "num_speakers": num_speakers,
                "min_speakers": min_speakers,
                "max_speakers": max_speakers,
            }.items()
            if value
        }
        output = self._pipeline(self._audio(samples, rate), **options)
        # pyannote 4 returns an object; 3.x returns the annotation itself.
        annotation = getattr(output, "speaker_diarization", output)
        exclusive = getattr(output, "exclusive_speaker_diarization", None) or annotation
        turns = [
            Turn(str(label), float(segment.start), float(segment.end))
            for segment, _, label in exclusive.itertracks(yield_label=True)
        ]
        embeddings: dict[str, np.ndarray] = {}
        vectors = getattr(output, "speaker_embeddings", None)
        if vectors is not None:
            for label, vector in zip(annotation.labels(), vectors, strict=False):
                if np.isfinite(vector).all():
                    embeddings[str(label)] = normalize(vector)
        return Diarization(_merge(turns), embeddings)


def build_engine(settings: Settings) -> Engine:
    if settings.engine == "fake":
        return FakeEngine()
    if settings.engine == "pyannote":
        return PyannoteEngine(settings)
    raise EngineUnavailable(f"Unknown VOICE_ENGINE: {settings.engine}")
