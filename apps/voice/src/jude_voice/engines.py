"""Speaker engines.

``PyannoteEngine`` uses open-source pyannote models. ``FakeEngine`` is a deterministic
spectral stand-in for tests and for development without model downloads; it must never be
presented as real speaker recognition.
"""

from __future__ import annotations

import warnings
from typing import Protocol

import numpy as np

from .audio import resample
from .config import Settings
from .matching import normalize


class EngineUnavailable(RuntimeError):
    pass


class Engine(Protocol):
    name: str
    model: str
    dim: int

    def embed(self, samples: np.ndarray, rate: int) -> np.ndarray: ...


class FakeEngine:
    """Band-energy fingerprint. Distinguishes synthetic tones, not real people."""

    name = "fake"
    model = "fake-spectral-v1"
    dim = 64

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
        model = Model.from_pretrained(settings.embedding_model)
        if model is None:  # pragma: no cover
            raise EngineUnavailable(f"Could not load {settings.embedding_model}.")
        self._inference = Inference(model, window="whole", device=self._device)
        self.model = settings.embedding_model
        self.dim = int(self.embed(np.zeros(16000, dtype=np.float32) + 1e-4, 16000).shape[0])

    def _audio(self, samples: np.ndarray, rate: int) -> dict:
        return {"waveform": self._torch.from_numpy(samples).unsqueeze(0), "sample_rate": rate}

    def embed(self, samples: np.ndarray, rate: int) -> np.ndarray:
        vector = np.asarray(self._inference(self._audio(samples, rate)), dtype=np.float32)
        return normalize(vector.reshape(-1))


def build_engine(settings: Settings) -> Engine:
    if settings.engine == "fake":
        return FakeEngine()
    if settings.engine == "pyannote":
        return PyannoteEngine(settings)
    raise EngineUnavailable(f"Unknown VOICE_ENGINE: {settings.engine}")
